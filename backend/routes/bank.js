/**
 * Bank Verification Routes
 * Handles: IFSC verification, Penny Drop, Penny-less verification
 * 
 * VALIDATION LOGIC:
 * 1. For Individual/Sole Prop: Requires Aadhaar verification first
 * 2. For Partnership: Any verified partner can verify firm bank account
 * 3. For Company/LLP: Any verified director can verify company bank account
 * 4. Name matching with manual review flagging
 * 5. Comprehensive API error handling
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Application = require('../models/Application');
const sandboxApi = require('../services/sandboxApi');
const logger = require('../utils/logger');
const Joi = require('joi');
const { validateNameMatch } = require('../validators/individual');

/**
 * POST /api/bank/verify-ifsc
 * Verify IFSC code and get bank details
 */
router.post('/verify-ifsc', auth, async (req, res, next) => {
    try {
        const schema = Joi.object({
            ifsc: Joi.string().length(11).pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid IFSC format. IFSC should be 11 characters (e.g., SBIN0001234)'
            });
        }

        const { ifsc } = value;

        const response = await sandboxApi.verifyIfsc(ifsc);

        // Handle 404 - IFSC not found
        if (response.status === 404 || response.error === 'Not Found') {
            return res.status(404).json({
                success: false,
                error: 'IFSC code not found. Please check and try again.'
            });
        }

        // Handle other errors
        if (response.status && response.status !== 200) {
            return res.status(response.status).json({
                success: false,
                error: response.message || 'IFSC verification failed'
            });
        }

        // Handle success response (IFSC API returns data directly with uppercase keys)
        if (response.IFSC) {
            return res.json({
                success: true,
                bankDetails: {
                    ifsc: response.IFSC,
                    bank: response.BANK,
                    branch: response.BRANCH,
                    address: response.ADDRESS,
                    city: response.CITY,
                    state: response.STATE,
                    district: response.DISTRICT,
                    contact: response.CONTACT,
                    upi: response.UPI,
                    rtgs: response.RTGS,
                    neft: response.NEFT,
                    imps: response.IMPS
                }
            });
        }

        res.status(400).json({
            success: false,
            error: response.message || 'IFSC verification failed'
        });
    } catch (error) {
        logger.error('[Bank IFSC] Verification error:', error.message);
        next(error);
    }
});

/**
 * POST /api/bank/verify
 * Verify bank account (Penny Drop or Penny-less)
 * 
 * API Response Types:
 * - account_exists: true/false
 * - name_at_bank: Account holder name (for cross-validation)
 * - message: Status message (various error scenarios)
 * - utr: UTR for penny drop
 */
router.post('/verify', auth, async (req, res, next) => {
    try {
        const schema = Joi.object({
            ifsc: Joi.string().length(11).pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).required(),
            accountNumber: Joi.string().min(9).max(18).pattern(/^\d+$/).required(),
            accountHolderName: Joi.string().optional(),
            method: Joi.string().valid('penny', 'penniless').default('penny')
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }

        const { ifsc, accountNumber, accountHolderName, method } = value;

        // Get application to check entity type and KYC status
        const application = await Application.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const entityType = application.entityType;
        let aadhaarName = null;

        // STEP 1: Check KYC verification based on entity type
        if (['individual', 'sole_proprietorship'].includes(entityType)) {
            // For Individual/Sole Prop: Require main Aadhaar verification
            if (!application.kyc?.aadhaar?.verified) {
                return res.status(400).json({
                    success: false,
                    error: 'Please complete Aadhaar verification first before bank verification'
                });
            }
            aadhaarName = application.kyc.aadhaar.data?.name;
        } else if (entityType === 'partnership') {
            // For Partnership: Check if any partner is verified
            const verifiedPartner = application.partners?.find(p => p.kyc?.aadhaar?.verified);
            if (!verifiedPartner) {
                return res.status(400).json({
                    success: false,
                    error: 'At least one partner must complete Aadhaar verification before bank verification'
                });
            }
            // For firm bank accounts, we don't do name matching with individual's Aadhaar
            aadhaarName = null;
        } else if (['company', 'llp', 'opc'].includes(entityType)) {
            // For Company/LLP/OPC: Check if any director is verified
            const verifiedDirector = application.directors?.find(d => d.kyc?.aadhaar?.verified);
            if (!verifiedDirector) {
                return res.status(400).json({
                    success: false,
                    error: 'At least one director must complete Aadhaar verification before bank verification'
                });
            }
            // For company bank accounts, we don't do name matching with individual's Aadhaar
            aadhaarName = null;
        }

        logger.info('[Bank] Verification request:', {
            entityType,
            ifsc,
            accountNumber: accountNumber.substring(0, 4) + '****',
            method,
            hasAadhaarName: !!aadhaarName
        });

        // STEP 2: Call Bank Verification API
        let response;
        if (method === 'penniless') {
            response = await sandboxApi.verifyBankAccountPenniless(ifsc, accountNumber, accountHolderName);
        } else {
            response = await sandboxApi.verifyBankAccountPenny(ifsc, accountNumber, accountHolderName);
        }

        logger.info('[Bank] API Response:', {
            code: response.code,
            message: response.data?.message,
            accountExists: response.data?.account_exists,
            nameAtBank: response.data?.name_at_bank
        });

        // STEP 3: Handle API response
        if (response.code === 200 && response.data) {
            const bankData = response.data;
            const message = bankData.message || '';
            const holderName = bankData.name_at_bank || null;

            // Handle various error messages from API
            const errorMessages = {
                'Invalid account number or ifsc provided': { block: true, error: 'Invalid account number or IFSC. Please check and try again.' },
                'IFSC is invalid': { block: true, error: 'Invalid IFSC code. Please verify and try again.' },
                'Account is blocked': { block: true, error: 'This bank account is blocked. Please use a different account.' },
                'Holder is Deceased': { block: true, error: 'Account holder is deceased. Please contact bank.' },
                'Given account is an NRE account': { block: false, flag: true, reason: 'NRE account detected' },
                'Source bank declined': { block: false, retry: true, error: 'Bank declined the request. Please try again later.' },
                'Beneficiary bank offline': { block: false, retry: true, error: 'Bank is temporarily offline. Please try again later.' },
                'NPCI Unavailable': { block: false, retry: true, error: 'Payment network unavailable. Please try again later.' },
                'IMPS Mode fail': { block: false, retry: true, error: 'IMPS transfer failed. Please try Penny Drop method.' },
                'Failed at beneficiary bank': { block: false, retry: true, error: 'Bank verification failed. Please try again.' },
                'Transaction failed': { block: false, retry: true, error: 'Transaction failed. Please try again.' }
            };

            // Check for known error messages
            for (const [msg, action] of Object.entries(errorMessages)) {
                if (message.includes(msg)) {
                    if (action.block) {
                        return res.status(400).json({
                            success: false,
                            error: action.error,
                            errorCode: msg.replace(/\s+/g, '_').toUpperCase()
                        });
                    }
                    if (action.retry) {
                        return res.status(503).json({
                            success: false,
                            error: action.error,
                            errorCode: 'RETRY_LATER',
                            retryable: true
                        });
                    }
                    // Flag for manual review but continue
                    if (action.flag) {
                        application.bank = {
                            ...application.bank,
                            requiresManualReview: true,
                            manualReviewReason: action.reason
                        };
                    }
                }
            }

            // Account verification result
            const isVerified = bankData.account_exists === true;

            if (!isVerified) {
                return res.status(400).json({
                    success: false,
                    error: message || 'Bank account verification failed. Account does not exist.',
                    errorCode: 'ACCOUNT_NOT_FOUND'
                });
            }

            // STEP 4: Name matching (only for Individual/Sole Prop)
            let nameMatchResult = { valid: true };
            let requiresManualReview = false;
            let mismatchDetails = null;

            if (aadhaarName && holderName) {
                nameMatchResult = validateNameMatch(holderName, aadhaarName);
                logger.info('[Bank] Name matching:', {
                    bankHolderName: holderName,
                    aadhaarName,
                    similarity: nameMatchResult.similarity,
                    valid: nameMatchResult.valid
                });

                if (!nameMatchResult.valid) {
                    // Flag for manual review instead of blocking
                    requiresManualReview = true;
                    mismatchDetails = {
                        bankHolderName: holderName,
                        aadhaarName,
                        similarity: nameMatchResult.similarity
                    };
                    logger.warn('[Bank] Name mismatch - flagged for manual review');
                }
            }

            // STEP 5: Save to application
            application.bank = {
                accountNumber: accountNumber,
                ifsc: ifsc,
                holderName: holderName,
                verified: isVerified,
                verificationMethod: method,
                utr: bankData.utr || null,
                amountDeposited: bankData.amount_deposited || null,
                message: message,
                verifiedAt: new Date(),
                // Manual review flags
                requiresManualReview: requiresManualReview || application.bank?.requiresManualReview,
                manualReviewReason: mismatchDetails
                    ? 'Name mismatch with Aadhaar'
                    : application.bank?.manualReviewReason,
                nameMismatch: requiresManualReview,
                mismatchDetails: mismatchDetails
            };

            await application.save();

            logger.info('[Bank] Verification successful:', {
                accountNumber: accountNumber.substring(0, 4) + '****',
                holderName,
                verified: isVerified,
                requiresManualReview
            });

            return res.json({
                success: true,
                verified: isVerified,
                message: requiresManualReview
                    ? 'Bank verified but flagged for manual review (name mismatch)'
                    : message || 'Bank account verified successfully',
                bankDetails: {
                    accountNumber: accountNumber,
                    ifsc: ifsc,
                    holderName: holderName,
                    accountExists: bankData.account_exists,
                    utr: bankData.utr
                },
                requiresManualReview,
                mismatchDetails: mismatchDetails ? {
                    bankName: mismatchDetails.bankHolderName,
                    aadhaarName: mismatchDetails.aadhaarName,
                    similarity: Math.round((mismatchDetails.similarity || 0) * 100) + '%'
                } : null
            });
        }

        // Handle non-200 responses
        if (response.code === 422) {
            return res.status(422).json({
                success: false,
                error: response.message || 'Invalid bank account details',
                errorCode: 'INVALID_INPUT'
            });
        }

        if (response.code === 500 || response.code === 503) {
            return res.status(503).json({
                success: false,
                error: response.message || 'Bank service temporarily unavailable',
                errorCode: 'SERVICE_UNAVAILABLE',
                retryable: true
            });
        }

        res.status(400).json({
            success: false,
            error: response.message || 'Bank verification failed'
        });
    } catch (error) {
        logger.error('[Bank] Verification error:', error.message);
        next(error);
    }
});

/**
 * GET /api/bank/status
 * Get current bank verification status
 */
router.get('/status', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        res.json({
            success: true,
            bank: application.bank || { verified: false }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
