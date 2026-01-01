/**
 * Rate Limiter Middleware
 */
const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // 100 requests per window
    message: {
        success: false,
        error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Auth routes rate limit (stricter)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // 10 requests per window
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// OTP rate limit (very strict)
const otpLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10000, // 3 requests per minute
    message: {
        success: false,
        error: 'Too many OTP requests, please wait before trying again'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    apiLimiter,
    authLimiter,
    otpLimiter
};
