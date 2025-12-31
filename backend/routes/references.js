/**
 * References Routes
 * Handle reference contacts collection (2 people required for agreement)
 */
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Application = require('../models/Application');
const { auth } = require('../middleware/auth');
const { validateReferences } = require('../validators/individual');

/**
 * POST /api/references
 * Save or update reference contacts
 */
router.post('/', auth, async (req, res, next) => {
    try {
        const schema = Joi.object({
            references: Joi.array().items(
                Joi.object({
                    name: Joi.string().min(2).max(100).required(),
                    mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required()
                        .messages({ 'string.pattern.base': 'Mobile must be 10 digits starting with 6-9' }),
                    email: Joi.string().email().required()
                        .messages({ 'string.email': 'Valid email is required' }),
                    address: Joi.string().min(10).max(500).required()
                        .messages({ 'string.min': 'Address must be at least 10 characters' }),
                    relation: Joi.string().valid('family', 'friend', 'colleague', 'business', 'other').optional()
                })
            ).min(2).max(2).required()
        });

        const { error, value } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                validationErrors: error.details.map(d => ({
                    field: d.path.join('.'),
                    message: d.message
                }))
            });
        }

        // Cross-validation: Check for duplicate phones and self-reference
        const crossValidation = validateReferences(value.references, req.user.phone);
        if (!crossValidation.valid) {
            return res.status(400).json({
                success: false,
                error: crossValidation.error
            });
        }

        const application = await Application.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // Save references
        application.references = value.references.map(ref => ({
            name: ref.name,
            mobile: ref.mobile,
            email: ref.email,
            address: ref.address,
            relation: ref.relation || 'other'
        }));

        await application.save();

        res.json({
            success: true,
            message: 'References saved successfully',
            references: application.references
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/references
 * Get saved reference contacts
 */
router.get('/', auth, async (req, res, next) => {
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
            references: application.references || [],
            complete: (application.references?.length || 0) >= 2
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
