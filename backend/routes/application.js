/**
 * Application Routes
 * Handles: Get application, update application, status updates
 */
const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * GET /api/application
 * Get current user's application
 */
router.get('/', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId)
            .populate('userId', 'phone email entityType');

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        res.json({
            success: true,
            application
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/application/:id
 * Get application by ID
 */
router.get('/:id', auth, async (req, res, next) => {
    try {
        const application = await Application.findOne({
            _id: req.params.id,
            userId: req.user.userId
        }).populate('userId', 'phone email entityType');

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        res.json({
            success: true,
            application
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/application/status
 * Update application status and step
 */
router.patch('/status', auth, async (req, res, next) => {
    try {
        const { status, currentStep } = req.body;

        const application = await Application.findById(req.user.applicationId);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        if (status) application.status = status;
        if (currentStep !== undefined) application.currentStep = currentStep;

        await application.save();

        logger.info(`Application ${application.applicationId} status updated to ${status || application.status}`);

        res.json({
            success: true,
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
 * GET /api/application/progress
 * Get application progress summary
 */
router.get('/progress/summary', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // Calculate progress
        const progress = {
            entityType: application.entityType,
            status: application.status,
            currentStep: application.currentStep,
            kyc: {
                aadhaar: application.kyc?.aadhaar?.verified || false,
                pan: application.kyc?.pan?.verified || false,
                panAadhaarLinked: application.kyc?.panAadhaarLinked || null,
                liveness: application.kyc?.liveness?.verified || false,
                faceMatch: application.kyc?.faceMatch?.verified || false
            },
            bank: application.bank?.verified || false,
            references: application.references?.length || 0,
            documents: application.documents?.filter(d => d.status === 'verified' || d.status === 'saved').length || 0,
            agreement: {
                generated: !!application.agreement?.pdfPath,
                stamped: !!application.agreement?.estampedAt,
                signed: !!application.agreement?.esignedAt
            }
        };

        // Determine completion percentage
        let completedSteps = 0;
        let totalSteps = 5; // login, kyc, bank, references, agreement

        if (application.status !== 'login') completedSteps++;
        if (progress.kyc.faceMatch) completedSteps++;
        if (progress.bank) completedSteps++;
        if (progress.references >= 2) completedSteps++;
        if (progress.agreement.signed) completedSteps++;

        progress.completionPercentage = Math.round((completedSteps / totalSteps) * 100);

        res.json({
            success: true,
            progress
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
