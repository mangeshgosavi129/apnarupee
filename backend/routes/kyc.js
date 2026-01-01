/**
 * KYC Routes
 * Handles: Aadhaar OKYC, DigiLocker, PAN, Face Liveness, Face Match
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Application = require('../models/Application');
const sandboxApi = require('../services/sandboxApi');
const idfyApi = require('../services/idfyApi');
const logger = require('../utils/logger');
const Joi = require('joi');
const { validateAge, validateNameMatch, formatDobForPan } = require('../validators/individual');
const axios = require('axios');
const xml2js = require('xml2js');

// ==================== AADHAAR OKYC ====================

/**
 * POST /api/kyc/aadhaar/send-otp
 * Generate Aadhaar OTP
 */
router.post('/aadhaar/send-otp', auth, async (req, res, next) => {
    try {
        // 1️⃣ Log RAW incoming payload (only during integration/debug)
        logger.info('[Aadhaar] Raw request body', {
            body: req.body
        });

        // 2️⃣ Validate input
        const schema = Joi.object({
            aadhaar: Joi.string()
                .length(12)
                .pattern(/^\d+$/)
                .required()
        });

        const { error, value } = schema.validate(req.body, { abortEarly: true });

        if (error) {
            logger.warn('[Aadhaar] Validation failed', {
                message: error.details[0].message,
                bodyKeys: Object.keys(req.body || {})
            });

            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }

        // 3️⃣ Extract validated value
        const { aadhaar } = value;

        // 4️⃣ Log safe metadata (NEVER log full Aadhaar)
        logger.info('[Aadhaar] Validation success', {
            hasAadhaar: true,
            aadhaarLength: aadhaar.length
        });

        // 5️⃣ Call Sandbox API
        logger.info('[Aadhaar] Calling sandbox OTP API');

        const response = await sandboxApi.generateAadhaarOtp(
            aadhaar,
            'Y',
            'KYC Verification'
        );

        // 6️⃣ Log provider response safely
        logger.info('[Aadhaar] Sandbox OTP response', {
            statusCode: response?.code,
            hasData: Boolean(response?.data),
            message: response?.data?.message || response?.message
        });

        if (response?.code === 200 && response?.data) {
            return res.json({
                success: true,
                message: response.data.message || 'OTP sent successfully',
                referenceId: response.data.reference_id,
                transactionId: response.transaction_id
            });
        }

        return res.status(400).json({
            success: false,
            error: response?.message || 'Failed to send OTP'
        });
    } catch (error) {
        logger.error('[Aadhaar] Send OTP exception', {
            message: error.message,
            stack: error.stack
        });
        next(error);
    }
});

/**
 * POST /api/kyc/aadhaar/verify-otp
 * Verify Aadhaar OTP and get user data
 */
router.post('/aadhaar/verify-otp', auth, async (req, res, next) => {
    try {
        const schema = Joi.object({
            referenceId: Joi.alternatives().try(
                Joi.string(),
                Joi.number()
            ).required(),
            otp: Joi.string().length(6).pattern(/^\d+$/).required(),
            aadhaarNumber: Joi.string().length(12).pattern(/^\d+$/).optional() // For masking
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }

        // Convert referenceId to string (Sandbox returns integer, expects string)
        const referenceId = String(value.referenceId);
        const otp = value.otp;
        const aadhaarNumber = value.aadhaarNumber || ''; // For masking

        logger.info('[Aadhaar] Verifying OTP:', { referenceId, otpLength: otp.length, hasAadhaar: !!aadhaarNumber });

        // Call Sandbox API
        const response = await sandboxApi.verifyAadhaarOtp(referenceId, otp);

        logger.debug('[Aadhaar] Verify OTP response:', {
            code: response.code,
            status: response.data?.status,
            message: response.data?.message,
            hasName: !!response.data?.name
        });

        // Handle specific error messages from API (case-insensitive)
        const apiMessage = (response.data?.message || '').toLowerCase();

        if (apiMessage.includes('invalid otp')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid OTP. Please check and try again.'
            });
        }

        if (apiMessage === 'otp expired') {
            return res.status(400).json({
                success: false,
                error: 'OTP has expired. Please request a new OTP.'
            });
        }

        if (response.data?.message === 'Invalid Reference Id') {
            return res.status(400).json({
                success: false,
                error: 'Session expired. Please enter Aadhaar number again.'
            });
        }

        if (response.code === 200 && response.data) {
            const kycData = response.data;
            const isVerified = kycData.status === 'SUCCESS' || kycData.status === 'VALID';

            if (!isVerified) {
                return res.status(400).json({
                    success: false,
                    error: kycData.message || 'Aadhaar verification failed'
                });
            }

            // Age validation: Must be 18+ years old
            const dob = kycData.date_of_birth || kycData.dob;
            if (dob) {
                const ageCheck = validateAge(dob);
                if (!ageCheck.valid) {
                    logger.warn('[Aadhaar] Age validation failed:', ageCheck.error);
                    return res.status(400).json({
                        success: false,
                        error: ageCheck.error
                    });
                }
                logger.info('[Aadhaar] Age validated:', ageCheck.age, 'years');
            }

            // Update application
            const application = await Application.findById(req.user.applicationId);
            if (application) {
                // Build proper masked Aadhaar number (XXXX XXXX 1234 format)
                const maskedNumber = aadhaarNumber
                    ? `XXXX XXXX ${aadhaarNumber.slice(-4)}`
                    : 'XXXX XXXX XXXX';

                application.kyc.aadhaar = {
                    verified: true,
                    method: 'otp',
                    maskedNumber: maskedNumber,
                    data: {
                        name: kycData.name,
                        gender: kycData.gender,
                        dob: kycData.date_of_birth,
                        address: kycData.full_address,
                        photo: kycData.photo,
                        careOf: kycData.care_of,
                        yearOfBirth: kycData.year_of_birth
                    },
                    photo: kycData.photo,
                    verifiedAt: new Date()
                };
                await application.save();
                logger.info('[Aadhaar] Verification saved for:', kycData.name);
            }

            return res.json({
                success: true,
                verified: true,
                aadhaarData: {
                    name: kycData.name,
                    gender: kycData.gender,
                    dob: kycData.date_of_birth,
                    address: kycData.full_address,
                    photo: kycData.photo ? true : false  // Don't send actual photo to frontend
                }
            });
        }

        res.status(400).json({
            success: false,
            error: response.data?.message || 'OTP verification failed'
        });
    } catch (error) {
        logger.error('[Aadhaar] Verify OTP error:', error.message);
        next(error);
    }
});

// ==================== DIGILOCKER SDK ====================

/**
 * Parse Aadhaar XML from DigiLocker
 * Extracts: name, dob, gender, address, photo, masked aadhaar number
 * @param {string} xmlContent - Raw XML content
 * @returns {object} Parsed Aadhaar data
 */
async function parseAadhaarXml(xmlContent) {
    try {
        const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
        const result = await parser.parseStringPromise(xmlContent);

        // DigiLocker Aadhaar XML structure varies, handle common formats
        // Typically: Certificate -> IssuedTo -> Person (or similar)
        const cert = result.Certificate || result.certificate || result;
        const issuedTo = cert.IssuedTo || cert.issuedTo || {};
        const person = issuedTo.Person || issuedTo.person || cert.UidData || {};
        const poa = person.Poa || person.poa || issuedTo.Poa || {};
        const poi = person.Poi || person.poi || issuedTo.Poi || {};

        // Extract attributes (XML attributes are in $)
        const poiAttrs = poi.$ || poi || {};
        const poaAttrs = poa.$ || poa || {};
        const personAttrs = person.$ || {};

        // Extract name
        const name = poiAttrs.name || personAttrs.name || 'Unknown';

        // Extract DOB (format: DD-MM-YYYY or YYYY-MM-DD)
        const dob = poiAttrs.dob || personAttrs.dob || '';

        // Extract gender
        const gender = poiAttrs.gender || personAttrs.gender || '';

        // Build address from POA fields
        const addressParts = [
            poaAttrs.co,       // Care of
            poaAttrs.house,    // House number
            poaAttrs.street,   // Street
            poaAttrs.lm,       // Landmark
            poaAttrs.loc,      // Locality
            poaAttrs.vtc,      // Village/Town/City
            poaAttrs.subdist,  // Sub-district
            poaAttrs.dist,     // District
            poaAttrs.state,    // State
            poaAttrs.pc        // Pincode
        ].filter(Boolean);
        const address = addressParts.join(', ') || 'Address not available';

        // Extract photo (Base64)
        const photo = person.Photo || person.Pht || person.photo || null;

        // Extract masked Aadhaar from certificate attributes
        const certAttrs = cert.$ || {};
        const uidHash = certAttrs.uid || certAttrs.referenceId || '';
        // Try to get last 4 digits from UID reference
        const maskedNumber = uidHash ? `XXXX XXXX ${uidHash.slice(-4)}` : 'XXXX XXXX XXXX';

        logger.info('[DigiLocker] Aadhaar XML parsed:', {
            name,
            dob,
            gender,
            hasAddress: !!addressParts.length,
            hasPhoto: !!photo
        });

        return {
            name,
            dob,
            date_of_birth: dob,
            gender,
            full_address: address,
            care_of: poaAttrs.co || '',
            photo: photo,
            maskedNumber
        };
    } catch (error) {
        logger.error('[DigiLocker] Failed to parse Aadhaar XML:', error.message);
        return null;
    }
}

/**
 * POST /api/kyc/digilocker/create-session
 * Create DigiLocker SDK session (backend creates session, frontend launches SDK)
 * New SDK API: POST /kyc/digilocker-sdk/sessions/create
 */
router.post('/digilocker/create-session', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // Flow: 'signin' (existing DigiLocker account) or 'signup' (new account)
        const flow = req.body.flow || 'signin';
        // Document types to request consent for
        const docTypes = req.body.docTypes || ['aadhaar', 'pan'];

        const response = await sandboxApi.createDigilockerSession(flow, docTypes);

        if (response.code === 200 && response.data) {
            return res.json({
                success: true,
                sessionId: response.data.id,  // UUID session ID for SDK
                status: response.data.status, // 'created'
                createdAt: response.data.created_at
            });
        }

        res.status(400).json({
            success: false,
            error: response.message || 'Failed to create DigiLocker session'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/kyc/digilocker/status/:sessionId
 * Get DigiLocker SDK session status
 * Status values: 'created', 'initialized', 'authorized', 'succeeded', 'failed', 'expired'
 */
router.get('/digilocker/status/:sessionId', auth, async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const response = await sandboxApi.getDigilockerSessionStatus(sessionId);

        if (response.code === 200 && response.data) {
            return res.json({
                success: true,
                status: response.data.status,
                documentsConsented: response.data.documents_consented || [],
                createdAt: response.data.created_at,
                updatedAt: response.data.updated_at
            });
        }

        res.status(400).json({
            success: false,
            error: response.message || 'Failed to get status'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/kyc/digilocker/fetch-documents
 * Fetch documents from completed DigiLocker SDK session
 * Downloads Aadhaar XML and parses to extract actual user data
 * Maps data to same format as OTP verification for consistent downstream use
 */
router.post('/digilocker/fetch-documents', auth, async (req, res, next) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Session ID is required'
            });
        }

        // Check session status first
        const statusResp = await sandboxApi.getDigilockerSessionStatus(sessionId);
        if (statusResp.data?.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                error: `Session not completed. Status: ${statusResp.data?.status}`
            });
        }

        const consentedDocs = statusResp.data?.documents_consented || [];
        logger.info('[DigiLocker] Documents consented:', consentedDocs);

        // Prepare response data objects
        let aadhaarData = null;
        let panData = null;

        // Fetch and parse Aadhaar if consented
        if (consentedDocs.includes('aadhaar')) {
            try {
                const aadhaarResp = await sandboxApi.getDigilockerDocument(sessionId, 'aadhaar');
                const files = aadhaarResp?.data?.files || [];

                if (files.length > 0) {
                    const fileUrl = files[0]?.url;
                    const metadata = files[0]?.metadata || {};

                    // Check if XML file (Aadhaar from DigiLocker is usually XML)
                    const isXml = metadata.ContentType?.includes('xml') || fileUrl?.includes('.xml');

                    if (isXml && fileUrl) {
                        // Download XML content from S3 URL
                        logger.info('[DigiLocker] Downloading Aadhaar XML from:', fileUrl.substring(0, 50) + '...');
                        try {
                            const xmlResponse = await axios.get(fileUrl, { timeout: 30000 });
                            const xmlContent = xmlResponse.data;

                            // Parse XML to extract data
                            const parsedData = await parseAadhaarXml(xmlContent);

                            if (parsedData) {
                                aadhaarData = {
                                    name: parsedData.name,
                                    dob: parsedData.dob,
                                    date_of_birth: parsedData.date_of_birth,
                                    gender: parsedData.gender,
                                    full_address: parsedData.full_address,
                                    care_of: parsedData.care_of,
                                    photo: parsedData.photo,
                                    maskedAadhaar: parsedData.maskedNumber,
                                    source: 'digilocker',
                                    verifiedAt: new Date().toISOString(),
                                    documentUrl: fileUrl,
                                    issuer: metadata.issuer || 'UIDAI',
                                    issuerId: metadata.issuer_id || 'in.gov.uidai'
                                };
                                logger.info('[DigiLocker] Aadhaar parsed successfully:', {
                                    name: aadhaarData.name,
                                    dob: aadhaarData.dob,
                                    hasPhoto: !!aadhaarData.photo
                                });
                            } else {
                                // Fallback if parsing fails
                                aadhaarData = {
                                    name: 'Via DigiLocker',
                                    dob: '',
                                    gender: '',
                                    full_address: 'Retrieved via DigiLocker',
                                    photo: null,
                                    maskedAadhaar: 'XXXX XXXX XXXX',
                                    source: 'digilocker',
                                    verifiedAt: new Date().toISOString(),
                                    documentUrl: fileUrl,
                                    parseError: true
                                };
                                logger.warn('[DigiLocker] Aadhaar XML parsing returned null, using fallback');
                            }
                        } catch (downloadError) {
                            logger.error('[DigiLocker] Failed to download Aadhaar XML:', downloadError.message);
                            // Still mark as verified but with limited data
                            aadhaarData = {
                                name: 'Via DigiLocker',
                                dob: '',
                                gender: '',
                                full_address: 'Retrieved via DigiLocker',
                                photo: null,
                                maskedAadhaar: 'XXXX XXXX XXXX',
                                source: 'digilocker',
                                verifiedAt: new Date().toISOString(),
                                downloadError: true
                            };
                        }
                    } else {
                        // Non-XML file (PDF, image, etc.)
                        aadhaarData = {
                            name: 'Via DigiLocker',
                            dob: '',
                            gender: '',
                            full_address: 'Retrieved via DigiLocker',
                            photo: null,
                            maskedAadhaar: 'XXXX XXXX XXXX',
                            source: 'digilocker',
                            verifiedAt: new Date().toISOString(),
                            documentUrl: fileUrl,
                            contentType: metadata.ContentType
                        };
                        logger.info('[DigiLocker] Aadhaar document fetched (non-XML format)');
                    }
                }
            } catch (e) {
                logger.error('[DigiLocker] Failed to fetch Aadhaar:', e.message);
            }
        }

        // Fetch PAN if consented
        if (consentedDocs.includes('pan')) {
            try {
                const panResp = await sandboxApi.getDigilockerDocument(sessionId, 'pan');
                const files = panResp?.data?.files || [];

                if (files.length > 0) {
                    panData = {
                        number: 'Via DigiLocker',
                        name: aadhaarData?.name || 'Via DigiLocker', // Use Aadhaar name if available
                        status: 'valid',
                        source: 'digilocker',
                        verifiedAt: new Date().toISOString(),
                        documentUrl: files[0]?.url || null,
                        metadata: files[0]?.metadata || {}
                    };
                    logger.info('[DigiLocker] PAN fetched successfully');
                }
            } catch (e) {
                logger.error('[DigiLocker] Failed to fetch PAN:', e.message);
            }
        }

        // Update application KYC status
        const application = await Application.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        if (aadhaarData) {
            application.kyc.aadhaar = {
                verified: true,
                method: 'digilocker',
                maskedNumber: aadhaarData.maskedAadhaar,
                data: {
                    name: aadhaarData.name,
                    dob: aadhaarData.dob,
                    date_of_birth: aadhaarData.date_of_birth || aadhaarData.dob,
                    gender: aadhaarData.gender,
                    full_address: aadhaarData.full_address,
                    care_of: aadhaarData.care_of,
                    photo: aadhaarData.photo
                },
                photo: aadhaarData.photo,
                verifiedAt: new Date()
            };
        }

        if (panData) {
            application.kyc.pan = {
                verified: true,
                method: 'digilocker',
                number: panData.number,
                data: panData,
                verifiedAt: new Date()
            };
        }

        await application.save();

        // Return in format expected by frontend
        res.json({
            success: true,
            aadhaarData: aadhaarData,
            panData: panData,
            documentsConsented: consentedDocs
        });
    } catch (error) {
        logger.error('[DigiLocker] Fetch documents error:', error);
        next(error);
    }
});

// ==================== PAN VERIFICATION ====================

/**
 * POST /api/kyc/pan/verify
 * Verify PAN number with Aadhaar cross-validation
 * 
 * VALIDATION LOGIC:
 * 1. Aadhaar must be verified first
 * 2. Name and DOB from Aadhaar are passed to PAN API
 * 3. API returns name_as_per_pan_match and date_of_birth_match booleans
 * 4. Both must be true for PAN to be considered belonging to same person
 * 5. For Individual/Sole Proprietorship, category must be 'individual'
 * 6. aadhaar_seeding_status is captured to skip separate PAN-Aadhaar link check
 */
router.post('/pan/verify', auth, async (req, res, next) => {
    try {
        const schema = Joi.object({
            pan: Joi.string().length(10).pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid PAN format. Expected: ABCDE1234F'
            });
        }

        const { pan } = value;

        // STEP 1: Get application and check Aadhaar verification
        const application = await Application.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // STEP 2: Require Aadhaar verification first
        if (!application.kyc?.aadhaar?.verified) {
            return res.status(400).json({
                success: false,
                error: 'Please complete Aadhaar verification first before verifying PAN'
            });
        }

        // STEP 3: Extract name and DOB from verified Aadhaar data
        const aadhaarData = application.kyc.aadhaar.data;
        const nameAsPerAadhaar = aadhaarData?.name || 'NA';
        const dobFromAadhaar = formatDobForPan(aadhaarData?.dob);

        logger.info('[PAN] Cross-validation data:', {
            nameFromAadhaar: nameAsPerAadhaar,
            dobFromAadhaar: dobFromAadhaar,
            originalDob: aadhaarData?.dob
        });

        // STEP 4: Call PAN API with Aadhaar data for matching
        const response = await sandboxApi.verifyPan(
            pan,
            nameAsPerAadhaar,
            dobFromAadhaar,
            'Y',
            'KYC Verification'
        );

        if (response.code === 200 && response.data) {
            const panData = response.data;

            logger.info('[PAN] API Response:', {
                pan: panData.pan,
                category: panData.category,
                status: panData.status,
                nameMatch: panData.name_as_per_pan_match,
                dobMatch: panData.date_of_birth_match,
                aadhaarSeeding: panData.aadhaar_seeding_status,
                remarks: panData.remarks
            });

            // STEP 5: Check PAN validity status
            if (panData.status === 'invalid') {
                const remarkMessage = panData.remarks ? ` (${panData.remarks})` : '';
                return res.status(400).json({
                    success: false,
                    error: `Invalid PAN${remarkMessage}. Please enter a valid PAN number.`,
                    errorCode: 'PAN_INVALID'
                });
            }

            // STEP 6: Check for remarks that indicate unusable PAN
            const blockedRemarks = ['Holder is Deceased', 'Deleted', 'Liquidated', 'Merger'];
            if (panData.remarks && blockedRemarks.some(r => panData.remarks.includes(r))) {
                return res.status(400).json({
                    success: false,
                    error: `PAN cannot be used: ${panData.remarks}`,
                    errorCode: 'PAN_STATUS_BLOCKED'
                });
            }

            // STEP 7: Validate category for Individual and Sole Proprietorship
            const entityType = application.entityType;
            const requiresIndividualPan = ['individual', 'sole_proprietorship'].includes(entityType);

            if (requiresIndividualPan && panData.category !== 'individual') {
                return res.status(400).json({
                    success: false,
                    error: `For ${entityType} entity, you must use an Individual PAN. You submitted a ${panData.category} PAN.`,
                    errorCode: 'PAN_CATEGORY_MISMATCH',
                    details: {
                        expected: 'individual',
                        received: panData.category
                    }
                });
            }

            // STEP 8: Validate name match - CRITICAL for fraud prevention
            if (panData.name_as_per_pan_match === false) {
                logger.warn('[PAN] Name mismatch detected:', {
                    nameProvided: nameAsPerAadhaar,
                    panCategory: panData.category
                });
                return res.status(400).json({
                    success: false,
                    error: 'PAN does not belong to the Aadhaar holder. Name mismatch detected.',
                    errorCode: 'NAME_MISMATCH',
                    details: {
                        nameFromAadhaar: nameAsPerAadhaar
                    }
                });
            }

            // STEP 9: Validate DOB match - Additional fraud prevention
            if (panData.date_of_birth_match === false) {
                logger.warn('[PAN] DOB mismatch detected:', {
                    dobProvided: dobFromAadhaar
                });
                return res.status(400).json({
                    success: false,
                    error: 'PAN does not belong to the Aadhaar holder. Date of birth mismatch detected.',
                    errorCode: 'DOB_MISMATCH',
                    details: {
                        dobFromAadhaar: dobFromAadhaar
                    }
                });
            }

            // STEP 10: All validations passed - PAN is valid and belongs to same person
            const isValid = panData.status === 'valid';
            const isAadhaarLinked = panData.aadhaar_seeding_status === 'y';

            // Save to application
            application.kyc.pan = {
                verified: isValid,
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

            // Also save PAN-Aadhaar link status from this response
            // This eliminates the need for a separate PAN-Aadhaar link check API call
            application.kyc.panAadhaarLinked = isAadhaarLinked;
            application.kyc.panAadhaarLinkData = {
                status: panData.aadhaar_seeding_status,
                message: isAadhaarLinked ? 'PAN is linked with Aadhaar' :
                    panData.aadhaar_seeding_status === 'n' ? 'PAN is not linked with Aadhaar' :
                        'PAN-Aadhaar linking not applicable'
            };

            // Flag for manual review if PAN-Aadhaar not linked
            const requiresManualReview = panData.aadhaar_seeding_status === 'n';
            if (requiresManualReview) {
                application.kyc.requiresManualReview = true;
                application.kyc.manualReviewReason = 'PAN-Aadhaar not linked';
                logger.warn('[PAN] Flagged for manual review - PAN-Aadhaar not linked');
            }

            await application.save();

            logger.info('[PAN] Verification successful:', {
                pan: pan.substring(0, 5) + '****' + pan.slice(-1),
                category: panData.category,
                aadhaarLinked: isAadhaarLinked
            });

            return res.json({
                success: true,
                verified: isValid,
                panData: {
                    pan: panData.pan,
                    category: panData.category,
                    status: panData.status,
                    remarks: panData.remarks,
                    nameMatch: panData.name_as_per_pan_match,
                    dobMatch: panData.date_of_birth_match,
                    aadhaarSeeded: isAadhaarLinked
                },
                // Include link status so frontend can skip separate check
                panAadhaarLinkStatus: {
                    linked: isAadhaarLinked,
                    status: panData.aadhaar_seeding_status
                }
            });
        }

        res.status(400).json({
            success: false,
            error: response.message || 'PAN verification failed'
        });
    } catch (error) {
        logger.error('[PAN] Verification error:', error.message);
        next(error);
    }
});

/**
 * POST /api/kyc/pan-aadhaar-link
 * [DEPRECATED] - Now captured during PAN verification via aadhaar_seeding_status
 * Kept for backward compatibility but no longer needed
 * API returns: aadhaar_seeding_status ('y' = linked, 'n' = not linked, 'na' = not applicable), message
 */
/*
router.post('/pan-aadhaar-link', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId);

        if (!application?.kyc?.pan?.number) {
            return res.status(400).json({
                success: false,
                error: 'PAN not verified yet'
            });
        }

        // Get Aadhaar from request or from verified data
        let aadhaarNumber = req.body.aadhaar;

        // If not in request, try to get from verified Aadhaar
        if (!aadhaarNumber && application.kyc.aadhaar?.maskedNumber) {
            // Need full Aadhaar for this check - masked won't work
            return res.status(400).json({
                success: false,
                error: 'Full Aadhaar number is required for link check'
            });
        }

        if (!aadhaarNumber) {
            return res.status(400).json({
                success: false,
                error: 'Aadhaar number is required for link check'
            });
        }

        const pan = application.kyc.pan.number;
        const response = await sandboxApi.checkPanAadhaarLink(pan, aadhaarNumber);

        if (response.code === 200 && response.data) {
            // API returns aadhaar_seeding_status: 'y' (linked), 'n' (not linked), 'na' (not applicable)
            const seedingStatus = response.data.aadhaar_seeding_status;
            const isLinked = seedingStatus === 'y';

            application.kyc.panAadhaarLinked = isLinked;
            application.kyc.panAadhaarLinkData = {
                status: seedingStatus,
                message: response.data.message
            };
            await application.save();

            return res.json({
                success: true,
                linked: isLinked,
                status: seedingStatus,  // 'y', 'n', or 'na'
                message: response.data.message
            });
        }

        res.status(400).json({
            success: false,
            error: response.message || 'Link check failed'
        });
    } catch (error) {
        next(error);
    }
});
*/

// ==================== SELFIE PHOTO CAPTURE ====================

/**
 * POST /api/kyc/selfie
 * Upload and save live selfie photo for agreement embedding
 * Replaces Face Liveness and Face Compare APIs
 */
router.post('/selfie', auth, async (req, res, next) => {
    try {
        const schema = Joi.object({
            image: Joi.string().required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }

        const { image } = value;

        // Validate that it's a valid base64 image
        if (!image.startsWith('data:image')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid image format. Must be base64 encoded image.'
            });
        }

        // Save selfie to application
        const application = await Application.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // Ensure KYC object exists
        if (!application.kyc) {
            application.kyc = {};
        }

        // Save selfie photo
        application.kyc.selfiePhoto = {
            captured: true,
            image: image,
            capturedAt: new Date()
        };

        // Mark KYC as complete if other requirements are met
        if (application.kyc.aadhaar?.verified && application.kyc.pan?.verified) {
            application.kyc.status = 'completed';  // Use valid enum: pending, in_progress, completed, failed
        }

        await application.save();

        res.json({
            success: true,
            message: 'Selfie captured and saved successfully',
            capturedAt: application.kyc.selfiePhoto.capturedAt
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/kyc/selfie
 * Get selfie photo status
 */
router.get('/selfie', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const selfieData = application.kyc?.selfiePhoto;

        res.json({
            success: true,
            captured: selfieData?.captured || false,
            capturedAt: selfieData?.capturedAt || null
        });
    } catch (error) {
        next(error);
    }
});

// ==================== FACE VERIFICATION (IDfy) - LEGACY ====================
// Note: These routes are kept for backward compatibility but are no longer used
// in the main KYC flow. Use POST /api/kyc/selfie instead.


/**
 * POST /api/kyc/face/liveness
 * Check face liveness
 */
router.post('/face/liveness', auth, async (req, res, next) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                error: 'Image is required'
            });
        }

        // Initiate liveness check (async)
        const response = await idfyApi.checkFaceLiveness(image);

        res.json({
            success: true,
            requestId: response.request_id,
            status: 'processing',
            message: 'Liveness check initiated. Poll for result.'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/kyc/face/compare
 * Compare face with Aadhaar photo
 */
router.post('/face/compare', auth, async (req, res, next) => {
    try {
        const { selfie } = req.body;

        if (!selfie) {
            return res.status(400).json({
                success: false,
                error: 'Selfie image is required'
            });
        }

        // Get Aadhaar photo from application
        const application = await Application.findById(req.user.applicationId);

        if (!application?.kyc?.aadhaar?.photo) {
            return res.status(400).json({
                success: false,
                error: 'Aadhaar photo not available. Complete Aadhaar verification first.'
            });
        }

        const aadhaarPhoto = application.kyc.aadhaar.photo;

        // Initiate face compare (async)
        const response = await idfyApi.compareFaces(selfie, aadhaarPhoto);

        res.json({
            success: true,
            requestId: response.request_id,
            status: 'processing',
            message: 'Face comparison initiated. Poll for result.'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/kyc/task/:requestId
 * Get IDfy async task result
 */
router.get('/task/:requestId', auth, async (req, res, next) => {
    try {
        const { requestId } = req.params;

        const result = await idfyApi.getTaskResult(requestId);

        // Check if completed
        if (result.status === 'completed') {
            const application = await Application.findById(req.user.applicationId);

            // Determine task type and update application
            if (result.task === 'check_photo_liveness') {
                const isLive = result.result?.liveness?.is_live === true;
                application.kyc.liveness = {
                    verified: true,
                    isLive,
                    score: result.result?.liveness?.score,
                    requestId,
                    verifiedAt: new Date()
                };
            } else if (result.task === 'compare') {
                const isMatch = result.result?.match?.is_match === true;
                application.kyc.faceMatch = {
                    verified: true,
                    isMatch,
                    score: result.result?.match?.score,
                    requestId,
                    verifiedAt: new Date()
                };

                // Update KYC status if both liveness and face match done
                if (application.kyc.liveness?.verified && isMatch) {
                    application.kyc.status = 'completed';
                }
            }

            await application.save();
        }

        res.json({
            success: true,
            status: result.status,
            result: result.result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/kyc/sync
 * Get current KYC status for application
 */
router.get('/sync', auth, async (req, res, next) => {
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
            kyc: application.kyc
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
