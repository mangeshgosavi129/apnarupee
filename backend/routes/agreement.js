/**
 * Agreement Routes
 * Handle PDF generation, E-Stamp, and E-Sign workflow
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const Application = require('../models/Application');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const estampApi = require('../services/estampApi');
const esignApi = require('../services/esignApi');

// Import PDF Agreement Service (sibling directory to backend folder)
const pdfServicePath = path.resolve(__dirname, '../../pdf-agreement-service/src');
const { generateAgreementPDF } = require(pdfServicePath);

/**
 * Format address object to string (handles Aadhaar address format)
 */
function formatAddressObject(addressData) {
    if (!addressData) return '';
    if (typeof addressData === 'string') return addressData;
    if (typeof addressData === 'object') {
        const parts = [
            addressData.house, addressData.street, addressData.landmark,
            addressData.loc, addressData.vtc, addressData.subdist,
            addressData.dist, addressData.state, addressData.country,
            addressData.pc || addressData.pincode
        ].filter(Boolean);
        return parts.join(', ');
    }
    return String(addressData);
}

/**
 * POST /api/agreement/generate
 * Generate DSA Agreement PDF from application data
 */
router.post('/generate', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId).lean();

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // Validate prerequisites
        const validationErrors = validateForPdfGeneration(application);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required data for PDF generation',
                details: validationErrors
            });
        }

        // Merge user data (phone, email) from authenticated user
        // These are stored on User model, not Application
        application.phone = req.user.phone || '';
        application.email = req.user.email || '';

        // Map selfiePhoto to livenessImage for PDF service compatibility
        if (application.kyc?.selfiePhoto?.image) {
            application.livenessImage = application.kyc.selfiePhoto.image;
            application.faceMatchImage = application.kyc.selfiePhoto.image;
        }

        // Map Aadhaar photo if not already in data
        if (application.kyc?.aadhaar?.data?.photo && !application.aadhaarPhoto) {
            application.aadhaarPhoto = application.kyc.aadhaar.data.photo;
        }

        logger.info('Generating PDF for:', {
            entityType: application.entityType,
            name: application.kyc?.aadhaar?.data?.name,
            dob: application.kyc?.aadhaar?.data?.dob, // For age calculation debugging
            phone: application.phone,
            email: application.email
        });

        // Generate PDF
        const pdfBuffer = await generateAgreementPDF(application);
        const pdfBase64 = pdfBuffer.toString('base64');

        // Update application with generation timestamp
        await Application.findByIdAndUpdate(req.user.applicationId, {
            'agreement.pdfGeneratedAt': new Date()
        });

        logger.info(`PDF generated for application ${application.applicationId}`);

        res.json({
            success: true,
            message: 'PDF generated successfully',
            pdfBase64: pdfBase64,
            contentType: 'application/pdf',
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        logger.error('PDF generation error:', error);
        next(error);
    }
});

/**
 * GET /api/agreement/status
 * Get agreement generation/signing status
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

        const agreement = application.agreement || {};

        res.json({
            success: true,
            status: {
                pdfGenerated: !!agreement.pdfGeneratedAt,
                pdfGeneratedAt: agreement.pdfGeneratedAt,
                estampStatus: agreement.estampStatus || 'pending',
                estampedAt: agreement.estampedAt,
                esignStatus: agreement.esignStatus || 'pending',
                esignedAt: agreement.esignedAt,
                complete: agreement.esignStatus === 'completed'
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/agreement/estamp
 * Initiate E-Stamp process with SignDesk
 */
router.post('/estamp', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId).lean();

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // Merge user data
        application.phone = req.user.phone || '';
        application.email = req.user.email || '';

        // Map selfiePhoto for PDF service
        if (application.kyc?.selfiePhoto?.image) {
            application.livenessImage = application.kyc.selfiePhoto.image;
            application.faceMatchImage = application.kyc.selfiePhoto.image;
        }

        // Generate PDF (with embedded KYC data)
        const pdfBuffer = await generateAgreementPDF(application);
        const pdfBase64 = pdfBuffer.toString('base64');

        // Get second party KYC data based on entity type
        let secondPartyName, secondPartyPan, secondPartyAddress;

        if (application.entityType === 'partnership') {
            // For Partnership - get signatory partner's data
            const partners = application.partners || [];
            const signatory = partners.find(p => p.isSignatory) || partners[0] || {};
            const signatoryKyc = signatory.kyc || {};
            const signatoryAadhaar = signatoryKyc.aadhaar?.data || {};

            secondPartyName = signatory.name || signatoryAadhaar.name || 'Partnership Signatory';
            secondPartyPan = signatoryKyc.pan?.number || 'N/A';
            // Format address object to string
            secondPartyAddress = formatAddressObject(signatoryAadhaar.address) || 'N/A';
        } else {
            // For Individual/Proprietorship - use main KYC data
            const kyc = application.kyc || {};
            const aadhaarData = kyc.aadhaar?.data || {};

            secondPartyName = aadhaarData.name || 'Individual Applicant';
            secondPartyPan = kyc.pan?.number || 'N/A';
            secondPartyAddress = formatAddressObject(aadhaarData.address) || 'N/A';
        }

        // Prepare E-Stamp params
        const estampParams = {
            // Generated PDF with all details embedded
            content: pdfBase64,

            // User's details from KYC (Second Party)
            name: secondPartyName,
            panNumber: secondPartyPan,
            address: secondPartyAddress,

            // User contact (from authenticated user)
            phone: application.phone,
            email: application.email,

            // Stamp configuration
            stampAmount: 100,
            district: 'Pune'
        };

        logger.info('Initiating E-Stamp:', {
            entityType: application.entityType,
            name: estampParams.name,
            pan: estampParams.panNumber,
            email: estampParams.email
        });

        // Call SignDesk E-Stamp API
        const stampResult = await estampApi.requestStampPaperIndividual(estampParams);

        if (stampResult.success) {
            // Update application with E-Stamp result
            await Application.findByIdAndUpdate(req.user.applicationId, {
                'agreement.pdfGeneratedAt': new Date(),
                'agreement.estampRequestId': stampResult.referenceId,
                'agreement.estampTransactionId': stampResult.transactionId,
                'agreement.stampPaperNumber': stampResult.stampPaperNumber,
                'agreement.stampedContent': stampResult.stampedContent,
                'agreement.estampStatus': 'completed',
                'agreement.estampedAt': new Date()
            });

            res.json({
                success: true,
                message: 'E-Stamp completed successfully',
                estampRequestId: stampResult.referenceId,
                transactionId: stampResult.transactionId,
                stampPaperNumber: stampResult.stampPaperNumber,
                status: 'completed',
                nextStep: 'Proceed to E-Sign'
            });
        } else {
            // Update with failed status
            await Application.findByIdAndUpdate(req.user.applicationId, {
                'agreement.estampStatus': 'failed',
                'agreement.estampError': stampResult.error
            });

            res.status(400).json({
                success: false,
                error: stampResult.error || 'E-Stamp failed',
                errorCode: stampResult.errorCode
            });
        }
    } catch (error) {
        logger.error('E-Stamp error:', error);
        next(error);
    }
});

/**
 * POST /api/agreement/esign
 * Initiate E-Sign process with SignDesk
 * Flow: Second Party (User) signs first → First Party (Company) receives email
 */
router.post('/esign', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // Check E-Stamp is complete
        if (application.agreement?.estampStatus !== 'completed') {
            return res.status(400).json({
                success: false,
                error: 'E-Stamp must be completed before E-Sign'
            });
        }

        // Get stamped content from E-Stamp
        const stampedContent = application.agreement?.stampedContent;
        if (!stampedContent) {
            return res.status(400).json({
                success: false,
                error: 'Stamped document not found'
            });
        }

        // Get second party KYC data based on entity type
        let secondPartyName, secondPartyDob, secondPartyGender, secondPartyAadhaarLast4;
        let userEmail = req.user.email || '';
        let userPhone = req.user.phone || '';

        if (application.entityType === 'partnership') {
            // For Partnership - get signatory partner's data
            const partners = application.partners || [];
            const signatory = partners.find(p => p.isSignatory) || partners[0] || {};
            const signatoryKyc = signatory.kyc || {};
            const signatoryAadhaar = signatoryKyc.aadhaar?.data || {};
            const maskedNumber = signatoryKyc.aadhaar?.maskedNumber || '';

            secondPartyName = signatory.name || signatoryAadhaar.name || 'Partnership Signatory';
            // Use date_of_birth (actual Aadhaar field) or dob as fallback
            secondPartyDob = signatoryAadhaar.date_of_birth || signatoryAadhaar.dob || '01-01-1990';
            secondPartyGender = signatoryAadhaar.gender === 'FEMALE' || signatoryAadhaar.gender === 'F' ? 'F' : 'M';
            secondPartyAadhaarLast4 = maskedNumber.slice(-4) || '0000';
            // Use signatory contact if available
            userEmail = signatory.email || userEmail;
            userPhone = signatory.mobile || userPhone;
        } else {
            // For Individual/Proprietorship - use main KYC data
            const kyc = application.kyc || {};
            const aadhaarData = kyc.aadhaar?.data || {};
            const maskedNumber = kyc.aadhaar?.maskedNumber || '';

            secondPartyName = aadhaarData.name || 'Individual Applicant';
            // Use date_of_birth (actual Aadhaar field) or dob as fallback
            secondPartyDob = aadhaarData.date_of_birth || aadhaarData.dob || '01-01-1990';
            secondPartyGender = aadhaarData.gender === 'FEMALE' || aadhaarData.gender === 'F' ? 'F' : 'M';
            secondPartyAadhaarLast4 = maskedNumber.slice(-4) || '0000';
        }

        logger.info('[E-Sign] User data:', {
            entityType: application.entityType,
            email: userEmail,
            phone: userPhone,
            aadhaarLast4: secondPartyAadhaarLast4,
            dob: secondPartyDob,
            name: secondPartyName
        });

        // Prepare E-Sign params
        const esignParams = {
            // Stamped PDF from E-Stamp API
            documentContent: stampedContent,

            // Second Party (User/KYC) - Signs FIRST via invitation link
            secondParty: {
                name: secondPartyName,
                email: userEmail,
                mobile: userPhone,
                // Validation inputs for Aadhaar-based signing
                dob: secondPartyDob,
                gender: secondPartyGender,
                aadhaarLast4: secondPartyAadhaarLast4
            },

            // First Party (Company) - Signs SECOND via email
            firstParty: {
                name: 'Graphsense Solutions',
                email: 'info@graphsensesolutions.com',
                mobile: '9860023457'
            },

            // Return URL after signing - include token for session restoration
            // The token from req.headers.authorization will be used
            returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3007'}/onboarding?signed=true&token=${req.headers.authorization?.replace('Bearer ', '') || ''}`
        };

        logger.info('Initiating E-Sign for Individual:', {
            secondParty: esignParams.secondParty.name,
            secondPartyEmail: esignParams.secondParty.email,
            firstPartyEmail: esignParams.firstParty.email,
            returnUrl: esignParams.returnUrl.substring(0, 60) + '...'
        });

        // Call SignDesk E-Sign API
        const signResult = await esignApi.initiateSignIndividual(esignParams);

        if (signResult.success) {
            // Update application with E-Sign result
            await Application.findByIdAndUpdate(req.user.applicationId, {
                'agreement.esignRequestId': signResult.referenceId,
                'agreement.esignDocketId': signResult.docketId,
                'agreement.esignStatus': 'initiated',
                'agreement.signingUrl': signResult.signingUrl,
                'agreement.companySignerEmail': signResult.companySignerEmail
            });

            res.json({
                success: true,
                message: 'E-Sign initiated successfully',
                esignRequestId: signResult.referenceId,
                docketId: signResult.docketId,
                signingUrl: signResult.signingUrl,
                status: 'initiated',
                nextStep: 'Complete your Aadhaar signing at the URL. Company will receive signing link after you complete.'
            });
        } else {
            await Application.findByIdAndUpdate(req.user.applicationId, {
                'agreement.esignStatus': 'failed',
                'agreement.esignError': signResult.error
            });

            res.status(400).json({
                success: false,
                error: signResult.error || 'E-Sign failed',
                details: signResult.rawError
            });
        }
    } catch (error) {
        logger.error('E-Sign error:', error);
        next(error);
    }
});

// ==================== Helper Functions ====================

/**
 * Validate application has all required data for PDF generation
 * Relaxed validation - only core KYC and entity type required
 */
function validateForPdfGeneration(application) {
    const errors = [];

    if (!application.entityType) {
        errors.push('Entity type is required');
    }

    // Individual/Proprietorship validations
    if (['individual', 'proprietorship'].includes(application.entityType)) {
        if (!application.kyc?.aadhaar?.verified) {
            errors.push('Aadhaar verification required');
        }
        if (!application.kyc?.pan?.verified) {
            errors.push('PAN verification required');
        }
        if (!application.kyc?.selfiePhoto?.captured) {
            errors.push('Selfie photo required');
        }
    }

    // Partnership validations
    if (application.entityType === 'partnership') {
        const partners = application.partners || [];

        if (partners.length < 2) {
            errors.push('At least 2 partners are required for partnership');
        } else {
            // Check that signatory partner has verified KYC
            const signatory = partners.find(p => p.isSignatory) || partners[0];

            if (!signatory) {
                errors.push('Signatory partner not found');
            } else {
                if (!signatory.kyc?.aadhaar?.verified) {
                    errors.push('Signatory partner Aadhaar verification required');
                }
                if (!signatory.kyc?.pan?.verified) {
                    errors.push('Signatory partner PAN verification required');
                }
            }
        }
    }

    // References check - warn but don't block
    if (!application.references || application.references.length < 2) {
        // Make this a warning, not an error for now
        logger.warn('Application has less than 2 references');
    }

    // Log validation result with details
    if (errors.length > 0) {
        logger.warn('PDF validation errors:', { errors, entityType: application.entityType });
    } else {
        logger.info('PDF validation passed for:', application.entityType);
    }

    return errors;
}

/**
 * POST /api/agreement/mark-signed
 * Called when user returns from E-Sign after completing their signature
 * Updates the agreement status to reflect user has signed
 */
router.post('/mark-signed', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // Update esign status to indicate user has signed
        application.agreement.esignStatus = 'user_signed';
        application.agreement.userSignedAt = new Date();
        await application.save();

        logger.info(`User signing completed for application ${application.applicationId}`);

        res.json({
            success: true,
            message: 'Signing status updated - waiting for company signature',
            agreement: {
                esignStatus: 'user_signed',
                userSignedAt: application.agreement.userSignedAt
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;