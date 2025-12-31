/**
 * Authentication Routes
 * Handles: OTP send, OTP verify, user registration
 */
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const User = require('../models/User');
const Application = require('../models/Application');
const { generateToken } = require('../middleware/auth');
const { otpLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const env = require('../config/env');

// In-memory OTP storage (for development only)
// In production, use Redis or similar
const otpStore = new Map();

// Validation schemas
const sendOtpSchema = Joi.object({
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required()
        .messages({ 'string.pattern.base': 'Please enter a valid 10-digit Indian mobile number' }),
    email: Joi.string().email().required(),
    entityType: Joi.string().valid('individual', 'proprietorship', 'partnership', 'company').required()
});

const verifyOtpSchema = Joi.object({
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required()
        .messages({ 'string.pattern.base': 'OTP must be 6 digits' })
});

/**
 * POST /api/auth/send-otp
 * Send OTP to phone number (simulated in dev mode)
 */
router.post('/send-otp', otpLimiter, async (req, res, next) => {
    try {
        // Validate request
        const { error, value } = sendOtpSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }

        const { phone, email, entityType } = value;

        // Generate OTP
        let otp;
        if (env.simulateOtp) {
            // Simulated OTP for development
            otp = '123456';
            logger.warn(`[DEV] Simulated OTP for ${phone}: ${otp}`);
        } else {
            // Generate random 6-digit OTP
            otp = Math.floor(100000 + Math.random() * 900000).toString();

            // TODO: Send OTP via SMS gateway (MSG91, Twilio, etc.)
            // await smsService.sendOtp(phone, otp);
        }

        // Store OTP with expiry (5 minutes)
        otpStore.set(phone, {
            otp,
            email,
            entityType,
            expiresAt: Date.now() + 5 * 60 * 1000,
            attempts: 0
        });

        logger.info(`OTP sent to ${phone.substring(0, 2)}XXXXXX${phone.substring(8)}`);

        res.json({
            success: true,
            message: 'OTP sent successfully',
            phone: `${phone.substring(0, 2)}XXXXXX${phone.substring(8)}`,
            // Only include OTP in response for dev mode
            ...(env.simulateOtp && { devOtp: otp })
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and create/login user
 */
router.post('/verify-otp', async (req, res, next) => {
    try {
        // Validate request
        const { error, value } = verifyOtpSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }

        const { phone, otp } = value;

        // Get stored OTP
        const storedData = otpStore.get(phone);

        if (!storedData) {
            return res.status(400).json({
                success: false,
                error: 'OTP not found. Please request a new OTP.'
            });
        }

        // Check expiry
        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(phone);
            return res.status(400).json({
                success: false,
                error: 'OTP expired. Please request a new OTP.'
            });
        }

        // Check attempts
        if (storedData.attempts >= 3) {
            otpStore.delete(phone);
            return res.status(400).json({
                success: false,
                error: 'Too many failed attempts. Please request a new OTP.'
            });
        }

        // Verify OTP
        if (storedData.otp !== otp) {
            storedData.attempts++;
            return res.status(400).json({
                success: false,
                error: 'Invalid OTP',
                attemptsRemaining: 3 - storedData.attempts
            });
        }

        // OTP verified - clear from store
        const { email, entityType } = storedData;
        otpStore.delete(phone);

        // Check if user exists
        let user = await User.findByPhone(phone);
        let isNewUser = false;

        if (!user) {
            // Create new user
            user = await User.create({
                phone,
                email,
                entityType,
                isPhoneVerified: true
            });
            isNewUser = true;
            logger.info(`New user created: ${user._id} (${entityType})`);
        } else {
            // Update existing user
            user.isPhoneVerified = true;
            await user.updateLastLogin();
            logger.info(`User logged in: ${user._id}`);
        }

        // Find or create application
        let application = await Application.findOne({
            userId: user._id,
            status: { $ne: 'completed' }
        });

        if (!application) {
            // Create new application
            application = await Application.create({
                userId: user._id,
                entityType: user.entityType
            });
            logger.info(`New application created: ${application.applicationId}`);
        }

        // Generate JWT token (include email for agreement/esign)
        const token = generateToken({
            userId: user._id.toString(),
            phone: user.phone,
            email: user.email, // Required for agreement PDF and E-Sign
            entityType: user.entityType,
            applicationId: application._id.toString()
        });

        res.json({
            success: true,
            message: isNewUser ? 'Account created successfully' : 'Login successful',
            isNewUser,
            token,
            user: {
                id: user._id,
                phone: user.phone,
                email: user.email,
                entityType: user.entityType
            },
            application: {
                id: application._id,
                applicationId: application.applicationId,
                status: application.status,
                currentStep: application.currentStep
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/resend-otp
 * Resend OTP to the same phone number
 */
router.post('/resend-otp', otpLimiter, async (req, res, next) => {
    try {
        const { phone } = req.body;

        if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                error: 'Valid phone number required'
            });
        }

        // Check if there's existing OTP data
        const existingData = otpStore.get(phone);

        if (!existingData) {
            return res.status(400).json({
                success: false,
                error: 'Please initiate login first'
            });
        }

        // Generate new OTP
        let otp;
        if (env.simulateOtp) {
            otp = '123456';
            logger.warn(`[DEV] Resend OTP for ${phone}: ${otp}`);
        } else {
            otp = Math.floor(100000 + Math.random() * 900000).toString();
        }

        // Update stored OTP
        existingData.otp = otp;
        existingData.expiresAt = Date.now() + 5 * 60 * 1000;
        existingData.attempts = 0;

        res.json({
            success: true,
            message: 'OTP resent successfully',
            ...(env.simulateOtp && { devOtp: otp })
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
