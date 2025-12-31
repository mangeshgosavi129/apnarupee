/**
 * Partner KYC Routes
 * Handle Aadhaar, PAN, and Selfie verification for individual partners
 */
const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const { auth } = require('../middleware/auth');
const sandboxApi = require('../services/sandboxApi');
const logger = require('../utils/logger');
const { formatDobForPan } = require('../validators/individual');

/**
 * POST /api/partner-kyc/:partnerId/aadhaar/send-otp
 * Send Aadhaar OTP for partner
 */
router.post('/:partnerId/aadhaar/send-otp', auth, async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const { aadhaarNumber } = req.body;

        if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
            return res.status(400).json({
                success: false,
                error: 'Enter valid 12-digit Aadhaar number'
            });
        }

        const application = await Application.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const partner = application.partners.id(partnerId);
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }

        // Generate or Resend OTP via Sandbox API
        const { resend } = req.body;
        let response;

        if (resend) {
            response = await sandboxApi.resendAadhaarOtp(aadhaarNumber);
        } else {
            response = await sandboxApi.generateAadhaarOtp(aadhaarNumber);
        }

        if (response.code !== 200 || !response.data?.reference_id) {
            return res.status(400).json({
                success: false,
                error: response.data?.message || 'Failed to send OTP'
            });
        }

        logger.info(`[Partner Aadhaar OTP] Sent for ${partner.name}`);

        res.json({
            success: true,
            message: 'OTP sent to Aadhaar-linked mobile',
            referenceId: response.data.reference_id
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/partner-kyc/:partnerId/aadhaar/verify-otp
 * Verify Aadhaar OTP for partner
 */
router.post('/:partnerId/aadhaar/verify-otp', auth, async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const { referenceId, otp, aadhaarNumber } = req.body;

        if (!referenceId || !otp) {
            return res.status(400).json({
                success: false,
                error: 'Reference ID and OTP required'
            });
        }

        const application = await Application.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const partner = application.partners.id(partnerId);
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }

        // Verify OTP via Sandbox API
        const response = await sandboxApi.verifyAadhaarOtp(referenceId, otp);

        // Handle API errors
        const apiMessage = (response.data?.message || '').toLowerCase();

        if (apiMessage.includes('invalid otp')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid OTP. Please check and try again.'
            });
        }

        if (apiMessage.includes('expired')) {
            return res.status(400).json({
                success: false,
                error: 'OTP has expired. Please request a new OTP.'
            });
        }

        // Check for successful verification
        if (!response.data?.name) {
            return res.status(400).json({
                success: false,
                error: response.data?.message || 'Verification failed'
            });
        }

        // Save partner Aadhaar data
        const maskedNumber = aadhaarNumber
            ? `XXXX-XXXX-${aadhaarNumber.slice(-4)}`
            : `XXXX-XXXX-${response.data.aadhaar_number?.slice(-4) || '****'}`;

        partner.kyc.aadhaar = {
            verified: true,
            maskedNumber: maskedNumber,
            data: response.data,
            photo: response.data.photo || '',
            verifiedAt: new Date()
        };

        // Update partner name from Aadhaar if available
        if (response.data.name) {
            partner.name = response.data.name;
        }

        await application.save();

        logger.info(`[Partner Aadhaar] Verified for ${partner.name}`);

        res.json({
            success: true,
            message: 'Aadhaar verified successfully',
            data: {
                name: response.data.name,
                maskedAadhaar: maskedNumber,
                dob: response.data.dob,
                address: response.data.address
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/partner-kyc/:partnerId/pan/verify
 * Verify PAN for partner with Aadhaar cross-validation
 * 
 * VALIDATION LOGIC:
 * 1. Partner Aadhaar must be verified first
 * 2. Name and DOB from Aadhaar are passed to PAN API
 * 3. Validates name_as_per_pan_match, date_of_birth_match, category
 * 4. Flags aadhaar_seeding_status: 'n' for manual review
 */
router.post('/:partnerId/pan/verify', auth, async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const { panNumber } = req.body;

        if (!panNumber || !/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber.toUpperCase())) {
            return res.status(400).json({
                success: false,
                error: 'Enter valid PAN number (e.g., ABCDE1234F)'
            });
        }

        const application = await Application.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const partner = application.partners.id(partnerId);
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }

        // STEP 1: Require Aadhaar verification first
        if (!partner.kyc?.aadhaar?.verified) {
            return res.status(400).json({
                success: false,
                error: 'Please complete Aadhaar verification first before verifying PAN'
            });
        }

        // STEP 2: Extract name and DOB from verified Aadhaar
        const aadhaarData = partner.kyc.aadhaar.data;
        const nameAsPerAadhaar = aadhaarData?.name || partner.name || 'NA';
        const dobFromAadhaar = formatDobForPan(aadhaarData?.date_of_birth || aadhaarData?.dob);

        logger.info(`[Partner PAN] Cross-validation for ${partner.name}:`, {
            nameFromAadhaar: nameAsPerAadhaar,
            dobFromAadhaar: dobFromAadhaar
        });

        // STEP 3: Call PAN API with Aadhaar data
        const pan = panNumber.toUpperCase();
        const response = await sandboxApi.verifyPan(pan, nameAsPerAadhaar, dobFromAadhaar, 'Y', 'KYC Verification');

        if (response.code === 200 && response.data) {
            const panData = response.data;

            logger.info(`[Partner PAN] API Response for ${partner.name}:`, {
                status: panData.status,
                category: panData.category,
                nameMatch: panData.name_as_per_pan_match,
                dobMatch: panData.date_of_birth_match,
                aadhaarSeeding: panData.aadhaar_seeding_status
            });

            // STEP 4: Check PAN validity
            if (panData.status === 'invalid') {
                const remarkMessage = panData.remarks ? ` (${panData.remarks})` : '';
                return res.status(400).json({
                    success: false,
                    error: `Invalid PAN${remarkMessage}. Please enter a valid PAN number.`,
                    errorCode: 'PAN_INVALID'
                });
            }

            // STEP 5: Check blocked remarks
            const blockedRemarks = ['Holder is Deceased', 'Deleted', 'Liquidated', 'Merger'];
            if (panData.remarks && blockedRemarks.some(r => panData.remarks.includes(r))) {
                return res.status(400).json({
                    success: false,
                    error: `PAN cannot be used: ${panData.remarks}`,
                    errorCode: 'PAN_STATUS_BLOCKED'
                });
            }

            // STEP 6: Validate category - Partners must use Individual PAN
            if (panData.category !== 'individual') {
                return res.status(400).json({
                    success: false,
                    error: `Partners must use Individual PAN. You submitted a ${panData.category} PAN.`,
                    errorCode: 'PAN_CATEGORY_MISMATCH',
                    details: { expected: 'individual', received: panData.category }
                });
            }

            // STEP 7: Validate name match
            if (panData.name_as_per_pan_match === false) {
                return res.status(400).json({
                    success: false,
                    error: 'PAN does not belong to the Aadhaar holder. Name mismatch detected.',
                    errorCode: 'NAME_MISMATCH',
                    details: { nameFromAadhaar: nameAsPerAadhaar }
                });
            }

            // STEP 8: Validate DOB match
            if (panData.date_of_birth_match === false) {
                return res.status(400).json({
                    success: false,
                    error: 'PAN does not belong to the Aadhaar holder. Date of birth mismatch detected.',
                    errorCode: 'DOB_MISMATCH',
                    details: { dobFromAadhaar: dobFromAadhaar }
                });
            }

            // STEP 9: Check PAN-Aadhaar link status and flag for manual review if not linked
            const isAadhaarLinked = panData.aadhaar_seeding_status === 'y';
            const requiresManualReview = panData.aadhaar_seeding_status === 'n';

            // STEP 10: Save partner PAN data
            partner.kyc.pan = {
                verified: true,
                number: pan,
                data: {
                    pan: panData.pan,
                    category: panData.category,
                    status: panData.status,
                    remarks: panData.remarks,
                    nameMatch: panData.name_as_per_pan_match,
                    dobMatch: panData.date_of_birth_match,
                    aadhaarSeedingStatus: panData.aadhaar_seeding_status
                },
                verifiedAt: new Date()
            };

            // Save PAN-Aadhaar link status
            partner.kyc.panAadhaarLinked = isAadhaarLinked;

            // Flag for manual review if PAN-Aadhaar not linked
            if (requiresManualReview) {
                partner.kyc.requiresManualReview = true;
                partner.kyc.manualReviewReason = 'PAN-Aadhaar not linked';
                logger.warn(`[Partner PAN] Flagged for manual review - PAN-Aadhaar not linked: ${partner.name}`);
            }

            await application.save();

            logger.info(`[Partner PAN] Verified for ${partner.name}: ${pan.substring(0, 5)}****${pan.slice(-1)}`);

            res.json({
                success: true,
                message: requiresManualReview
                    ? 'PAN verified but flagged for manual review (PAN-Aadhaar not linked)'
                    : 'PAN verified successfully',
                data: {
                    pan: pan,
                    category: panData.category,
                    status: panData.status,
                    nameMatch: panData.name_as_per_pan_match,
                    dobMatch: panData.date_of_birth_match,
                    aadhaarSeeded: isAadhaarLinked,
                    requiresManualReview: requiresManualReview
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: response.message || 'PAN verification failed'
            });
        }
    } catch (error) {
        logger.error('[Partner PAN] Verification error:', error.message);
        next(error);
    }
});

/**
 * POST /api/partner-kyc/:partnerId/selfie
 * Capture selfie for signatory partner only
 */
router.post('/:partnerId/selfie', auth, async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                error: 'Selfie image required'
            });
        }

        const application = await Application.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const partner = application.partners.id(partnerId);
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }

        // Only signatory partner can capture selfie
        if (!partner.isSignatory) {
            return res.status(400).json({
                success: false,
                error: 'Only signatory partner needs to capture selfie'
            });
        }

        // Save selfie
        partner.kyc.selfiePhoto = {
            captured: true,
            image: image,
            capturedAt: new Date()
        };

        await application.save();

        logger.info(`[Partner Selfie] Captured for signatory ${partner.name}`);

        res.json({
            success: true,
            message: 'Selfie captured successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/partner-kyc/:partnerId/status
 * Get KYC status for a partner
 */
router.get('/:partnerId/status', auth, async (req, res, next) => {
    try {
        const { partnerId } = req.params;

        const application = await Application.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const partner = application.partners.id(partnerId);
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }

        res.json({
            success: true,
            partner: {
                _id: partner._id,
                name: partner.name,
                isSignatory: partner.isSignatory
            },
            kyc: {
                aadhaar: {
                    verified: partner.kyc?.aadhaar?.verified || false,
                    maskedNumber: partner.kyc?.aadhaar?.maskedNumber,
                    name: partner.kyc?.aadhaar?.data?.name
                },
                pan: {
                    verified: partner.kyc?.pan?.verified || false,
                    number: partner.kyc?.pan?.number
                },
                selfie: {
                    captured: partner.kyc?.selfiePhoto?.captured || false,
                    required: partner.isSignatory
                }
            },
            isComplete: (partner.kyc?.aadhaar?.verified && partner.kyc?.pan?.verified) &&
                (!partner.isSignatory || partner.kyc?.selfiePhoto?.captured)
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
