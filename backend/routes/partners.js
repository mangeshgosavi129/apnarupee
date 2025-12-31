/**
 * Partners Routes
 * Handle partner management for Partnership entity workflow
 * Partners: 2-10, all do Aadhaar+PAN, only signatory does selfie
 */
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Application = require('../models/Application');
const { auth } = require('../middleware/auth');
const sandboxApi = require('../services/sandboxApi');
const logger = require('../utils/logger');

// Validation schemas
const partnerSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required()
        .messages({ 'string.pattern.base': 'Enter valid 10-digit mobile number' }),
    email: Joi.string().email().required()
});

/**
 * GET /api/partners
 * List all partners for current application
 */
router.get('/', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId);

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const partners = application.partners || [];

        // Add KYC status summary for each partner
        const partnersWithStatus = partners.map(p => ({
            _id: p._id,
            name: p.name,
            mobile: p.mobile,
            email: p.email,
            isSignatory: p.isSignatory || false,
            kycStatus: {
                aadhaar: p.kyc?.aadhaar?.verified || false,
                pan: p.kyc?.pan?.verified || false,
                selfie: p.kyc?.selfiePhoto?.captured || false
            },
            isComplete: (p.kyc?.aadhaar?.verified && p.kyc?.pan?.verified) &&
                (!p.isSignatory || p.kyc?.selfiePhoto?.captured)
        }));

        res.json({
            success: true,
            partners: partnersWithStatus,
            count: partners.length,
            minRequired: 2,
            maxAllowed: 10
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/partners
 * Add a new partner
 */
router.post('/', auth, async (req, res, next) => {
    try {
        const { error, value } = partnerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        const application = await Application.findById(req.user.applicationId);

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        if (!application.partners) {
            application.partners = [];
        }

        // Check max partners limit
        if (application.partners.length >= 10) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 10 partners allowed'
            });
        }

        // Check for duplicate mobile/email
        const duplicate = application.partners.find(
            p => p.mobile === value.mobile || p.email === value.email
        );
        if (duplicate) {
            return res.status(400).json({
                success: false,
                error: 'Partner with this mobile or email already exists'
            });
        }

        // Add partner
        application.partners.push({
            name: value.name,
            mobile: value.mobile,
            email: value.email,
            isSignatory: application.partners.length === 0, // First partner is signatory by default
            kyc: {
                aadhaar: { verified: false },
                pan: { verified: false },
                selfiePhoto: { captured: false }
            }
        });

        await application.save();

        logger.info(`Partner added: ${value.name} for application ${application.applicationId}`);

        res.json({
            success: true,
            message: 'Partner added successfully',
            partner: application.partners[application.partners.length - 1]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/partners/:id
 * Update partner details
 */
router.put('/:id', auth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error, value } = partnerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        const application = await Application.findById(req.user.applicationId);

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const partner = application.partners.id(id);
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }

        // Check for duplicate (excluding self)
        const duplicate = application.partners.find(
            p => p._id.toString() !== id && (p.mobile === value.mobile || p.email === value.email)
        );
        if (duplicate) {
            return res.status(400).json({
                success: false,
                error: 'Another partner with this mobile or email exists'
            });
        }

        // Update partner
        partner.name = value.name;
        partner.mobile = value.mobile;
        partner.email = value.email;

        await application.save();

        res.json({
            success: true,
            message: 'Partner updated successfully',
            partner
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/partners/:id
 * Remove a partner
 */
router.delete('/:id', auth, async (req, res, next) => {
    try {
        const { id } = req.params;

        const application = await Application.findById(req.user.applicationId);

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const partner = application.partners.id(id);
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }

        // Don't allow deletion if only 2 partners left
        if (application.partners.length <= 2) {
            return res.status(400).json({
                success: false,
                error: 'Minimum 2 partners required'
            });
        }

        const wasSignatory = partner.isSignatory;
        partner.deleteOne();

        // If deleted partner was signatory, assign to first remaining partner
        if (wasSignatory && application.partners.length > 0) {
            application.partners[0].isSignatory = true;
        }

        await application.save();

        res.json({
            success: true,
            message: 'Partner removed successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/partners/:id/signatory
 * Set partner as signatory
 */
router.patch('/:id/signatory', auth, async (req, res, next) => {
    try {
        const { id } = req.params;

        const application = await Application.findById(req.user.applicationId);

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const partner = application.partners.id(id);
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Partner not found' });
        }

        // Remove signatory from all partners
        application.partners.forEach(p => { p.isSignatory = false; });

        // Set this partner as signatory
        partner.isSignatory = true;

        await application.save();

        logger.info(`Signatory set: ${partner.name} for application ${application.applicationId}`);

        res.json({
            success: true,
            message: `${partner.name} is now the signatory`,
            partner
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/partners/validate
 * Check if all partners have completed KYC
 */
router.get('/validate', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId);

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const partners = application.partners || [];

        // Check minimum partners
        if (partners.length < 2) {
            return res.json({
                success: true,
                valid: false,
                error: 'Minimum 2 partners required',
                issues: [{ type: 'min_partners', message: 'Add at least 2 partners' }]
            });
        }

        // Check KYC completion for each partner
        const issues = [];

        partners.forEach((p, index) => {
            if (!p.kyc?.aadhaar?.verified) {
                issues.push({
                    partnerId: p._id,
                    partnerName: p.name,
                    type: 'aadhaar',
                    message: `${p.name}: Aadhaar pending`
                });
            }
            if (!p.kyc?.pan?.verified) {
                issues.push({
                    partnerId: p._id,
                    partnerName: p.name,
                    type: 'pan',
                    message: `${p.name}: PAN pending`
                });
            }
            if (p.isSignatory && !p.kyc?.selfiePhoto?.captured) {
                issues.push({
                    partnerId: p._id,
                    partnerName: p.name,
                    type: 'selfie',
                    message: `${p.name}: Selfie pending (signatory)`
                });
            }
        });

        res.json({
            success: true,
            valid: issues.length === 0,
            partners: partners.length,
            issues
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
