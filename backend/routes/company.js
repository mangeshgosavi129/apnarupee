/**
 * Company Routes
 * Handle Company/LLP verification and director management
 */
const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const sandboxApi = require('../services/sandboxApi');
const { formatDobForPan } = require('../validators/individual');

/**
 * POST /api/company/verify
 * Verify Company/LLP by CIN or LLPIN via MCA API
 */
router.post('/verify', auth, async (req, res, next) => {
    try {
        const { cinOrLlpin } = req.body;

        if (!cinOrLlpin) {
            return res.status(400).json({
                success: false,
                error: 'CIN or LLPIN is required'
            });
        }

        // Validate format (CIN: 21 chars, LLPIN: 7 chars like AAA-DDDD)
        const isLlpin = /^[A-Z]{3}-\d{4}$/.test(cinOrLlpin);
        const isCin = /^[A-Z]{1}\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(cinOrLlpin);

        if (!isLlpin && !isCin) {
            return res.status(400).json({
                success: false,
                error: 'Invalid format. CIN should be 21 characters (e.g., U12345AB1234ABC123456) or LLPIN should be AAA-DDDD format'
            });
        }

        // Call MCA API
        const result = await sandboxApi.verifyCompanyMasterData(cinOrLlpin);

        if (!result.success) {
            // Check if it's a timeout error
            const isTimeout = result.error?.includes('timed out') || result.error?.includes('504') || result.code === 504;

            return res.status(isTimeout ? 504 : 400).json({
                success: false,
                error: isTimeout
                    ? 'MCA verification service is slow. Please try again in a few moments.'
                    : result.error || 'Company verification failed. Please check CIN/LLPIN.'
            });
        }

        // Check company status is Active
        if (result.company.status && !result.company.status.toLowerCase().includes('active')) {
            return res.status(400).json({
                success: false,
                error: `Company status is ${result.company.status}. Only Active companies can proceed.`
            });
        }

        // Save company and directors to application
        await Application.findByIdAndUpdate(req.user.applicationId, {
            'company': {
                verified: true,
                type: result.isLlp ? 'llp' : 'pvt_ltd',
                cin: result.company.cin,
                llpin: result.company.llpin,
                name: result.company.name,
                registeredAddress: result.company.registeredAddress,
                dateOfIncorporation: result.company.dateOfIncorporation,
                email: result.company.email,
                status: result.company.status,
                rocCode: result.company.rocCode,
                classOfCompany: result.company.classOfCompany,
                category: result.company.category,
                verifiedAt: new Date()
            },
            'directors': result.directors.map(d => ({
                din: d.din,
                name: d.name,
                designation: d.designation,
                beginDate: d.beginDate,
                endDate: d.endDate,
                isSignatory: false,  // Will be set later
                kyc: {
                    pan: { verified: false },
                    aadhaar: { verified: false },
                    selfie: { captured: false }
                }
            }))
        });

        res.json({
            success: true,
            message: `${result.isLlp ? 'LLP' : 'Company'} verified successfully`,
            company: result.company,
            directors: result.directors
        });

    } catch (error) {
        logger.error('Company verification error:', error);
        next(error);
    }
});

/**
 * GET /api/company/details
 * Get stored company details
 */
router.get('/details', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId).lean();

        if (!application?.company) {
            return res.status(404).json({
                success: false,
                error: 'Company not verified yet'
            });
        }

        res.json({
            success: true,
            company: application.company,
            directors: application.directors || []
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/directors
 * Get list of directors
 */
router.get('/', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId).lean();

        res.json({
            success: true,
            directors: application?.directors || []
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/directors/:din
 * Update director (set signatory, update KYC)
 */
router.put('/:din', auth, async (req, res, next) => {
    try {
        const { din } = req.params;
        const { isSignatory, email, mobile } = req.body;

        const application = await Application.findById(req.user.applicationId);
        if (!application?.directors) {
            return res.status(404).json({
                success: false,
                error: 'No directors found'
            });
        }

        const directorIndex = application.directors.findIndex(d => d.din === din);
        if (directorIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Director not found'
            });
        }

        // If setting as signatory, unset others
        if (isSignatory) {
            application.directors.forEach((d, i) => {
                d.isSignatory = i === directorIndex;
            });
        }

        // Update director fields
        if (email) application.directors[directorIndex].email = email;
        if (mobile) application.directors[directorIndex].mobile = mobile;

        await application.save();

        res.json({
            success: true,
            director: application.directors[directorIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/directors/:din/kyc/pan
 * Verify director's PAN with Aadhaar cross-validation
 * 
 * VALIDATION LOGIC:
 * 1. Director Aadhaar must be verified first
 * 2. Name and DOB from Aadhaar are passed to PAN API
 * 3. Validates name_as_per_pan_match, date_of_birth_match, category
 * 4. Flags aadhaar_seeding_status: 'n' for manual review
 */
router.post('/:din/kyc/pan', auth, async (req, res, next) => {
    try {
        const { din } = req.params;
        const { pan } = req.body;

        if (!pan) {
            return res.status(400).json({
                success: false,
                error: 'PAN number is required'
            });
        }

        // Validate PAN format
        const panUpper = pan.toUpperCase();
        if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(panUpper)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid PAN format. Expected: ABCDE1234F'
            });
        }

        const application = await Application.findById(req.user.applicationId);
        if (!application?.directors) {
            return res.status(404).json({
                success: false,
                error: 'No directors found'
            });
        }

        const directorIndex = application.directors.findIndex(d => d.din === din);
        if (directorIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Director not found'
            });
        }

        const director = application.directors[directorIndex];

        // STEP 1: Require Aadhaar verification first
        if (!director.kyc?.aadhaar?.verified) {
            return res.status(400).json({
                success: false,
                error: 'Please complete Aadhaar verification first before verifying PAN'
            });
        }

        // STEP 2: Extract name and DOB from verified Aadhaar
        const aadhaarData = director.kyc.aadhaar.data;
        const nameAsPerAadhaar = aadhaarData?.name || director.name || 'NA';
        const dobFromAadhaar = formatDobForPan(aadhaarData?.date_of_birth || aadhaarData?.dob);

        logger.info(`[Director PAN] Cross-validation for ${director.name}:`, {
            din: din,
            nameFromAadhaar: nameAsPerAadhaar,
            dobFromAadhaar: dobFromAadhaar
        });

        // STEP 3: Call PAN API with Aadhaar data
        const panResult = await sandboxApi.verifyPan(panUpper, nameAsPerAadhaar, dobFromAadhaar, 'Y', 'KYC Verification');

        if (panResult.code === 200 && panResult.data) {
            const panData = panResult.data;

            logger.info(`[Director PAN] API Response for ${director.name}:`, {
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

            // STEP 6: Validate category - Directors must use Individual PAN
            if (panData.category !== 'individual') {
                return res.status(400).json({
                    success: false,
                    error: `Directors must use Individual PAN. You submitted a ${panData.category} PAN.`,
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

            // STEP 10: Update director's PAN data
            application.directors[directorIndex].kyc.pan = {
                number: panUpper,
                verified: true,
                data: {
                    pan: panData.pan,
                    category: panData.category,
                    status: panData.status,
                    remarks: panData.remarks,
                    nameMatch: panData.name_as_per_pan_match,
                    dobMatch: panData.date_of_birth_match,
                    aadhaarSeedingStatus: panData.aadhaar_seeding_status
                },
                aadhaarLinked: isAadhaarLinked,
                verifiedAt: new Date()
            };

            // Flag for manual review if PAN-Aadhaar not linked
            if (requiresManualReview) {
                application.directors[directorIndex].kyc.requiresManualReview = true;
                application.directors[directorIndex].kyc.manualReviewReason = 'PAN-Aadhaar not linked';
                logger.warn(`[Director PAN] Flagged for manual review - PAN-Aadhaar not linked: ${director.name}`);
            }

            await application.save();

            logger.info(`[Director PAN] Verified for ${director.name}: ${panUpper.substring(0, 5)}****${panUpper.slice(-1)}`);

            res.json({
                success: true,
                message: requiresManualReview
                    ? 'PAN verified but flagged for manual review (PAN-Aadhaar not linked)'
                    : 'PAN verified successfully',
                pan: {
                    number: panUpper,
                    category: panData.category,
                    nameMatch: panData.name_as_per_pan_match,
                    dobMatch: panData.date_of_birth_match,
                    aadhaarLinked: isAadhaarLinked,
                    requiresManualReview: requiresManualReview
                }
            });
        } else {
            return res.status(400).json({
                success: false,
                error: panResult.message || 'PAN verification failed',
                details: panResult.data
            });
        }
    } catch (error) {
        logger.error('[Director PAN] Verification error:', error.message);
        next(error);
    }
});

/**
 * POST /api/directors/:din/kyc/aadhaar
 * Start director's Aadhaar OKYC
 */
router.post('/:din/kyc/aadhaar', auth, async (req, res, next) => {
    try {
        const { din } = req.params;
        const { aadhaarNumber } = req.body;

        if (!aadhaarNumber) {
            return res.status(400).json({
                success: false,
                error: 'Aadhaar number is required'
            });
        }

        // Initialize OKYC
        const result = await sandboxApi.initAadhaarOkyc(aadhaarNumber);

        res.json({
            success: true,
            referenceId: result.reference_id,
            message: 'OTP sent to registered mobile'
        });
    } catch (error) {
        logger.error('Director Aadhaar OKYC init error:', error);
        next(error);
    }
});

/**
 * POST /api/directors/:din/kyc/aadhaar/verify
 * Verify director's Aadhaar OTP
 */
router.post('/:din/kyc/aadhaar/verify', auth, async (req, res, next) => {
    try {
        const { din } = req.params;
        const { referenceId, otp } = req.body;

        if (!referenceId || !otp) {
            return res.status(400).json({
                success: false,
                error: 'Reference ID and OTP are required'
            });
        }

        // Verify OTP
        const result = await sandboxApi.verifyAadhaarOtp(referenceId, otp);

        if (!result.status?.toLowerCase().includes('valid')) {
            return res.status(400).json({
                success: false,
                error: 'Aadhaar verification failed'
            });
        }

        // Format masked Aadhaar
        const maskedNumber = `XXXX XXXX ${result.data?.share_code || '****'}`;

        // Update director's Aadhaar data
        await Application.findOneAndUpdate(
            { _id: req.user.applicationId, 'directors.din': din },
            {
                $set: {
                    'directors.$.kyc.aadhaar': {
                        maskedNumber: maskedNumber,
                        verified: true,
                        data: result.data,
                        verifiedAt: new Date()
                    }
                }
            }
        );

        res.json({
            success: true,
            message: 'Aadhaar verified successfully',
            aadhaar: {
                maskedNumber: maskedNumber,
                name: result.data?.name,
                address: result.data?.full_address
            }
        });
    } catch (error) {
        logger.error('Director Aadhaar OTP verify error:', error);
        next(error);
    }
});

/**
 * POST /api/directors/:din/selfie
 * Upload signatory director's selfie
 */
router.post('/:din/selfie', auth, async (req, res, next) => {
    try {
        const { din } = req.params;
        const { selfieImage } = req.body;

        if (!selfieImage) {
            return res.status(400).json({
                success: false,
                error: 'Selfie image is required'
            });
        }

        // Verify director is signatory
        const application = await Application.findById(req.user.applicationId);
        const director = application?.directors?.find(d => d.din === din);

        if (!director) {
            return res.status(404).json({
                success: false,
                error: 'Director not found'
            });
        }

        if (!director.isSignatory) {
            return res.status(400).json({
                success: false,
                error: 'Only signatory director needs to provide selfie'
            });
        }

        // Save selfie
        await Application.findOneAndUpdate(
            { _id: req.user.applicationId, 'directors.din': din },
            {
                $set: {
                    'directors.$.kyc.selfie': {
                        image: selfieImage,
                        captured: true,
                        capturedAt: new Date()
                    }
                }
            }
        );

        res.json({
            success: true,
            message: 'Selfie captured successfully'
        });
    } catch (error) {
        logger.error('Director selfie upload error:', error);
        next(error);
    }
});

module.exports = router;
