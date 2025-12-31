/**
 * Documents Routes
 * Handle document upload/download for Proprietorship and Partnership workflows
 * Files saved to: uploads/documents/{userId}/{documentType}.{ext}
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Application = require('../models/Application');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

// Document type configuration for Proprietorship
const PROPRIETORSHIP_DOCS = {
    shopAct: {
        name: 'Shop Act License',
        mandatory: true,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    },
    udyam: {
        name: 'Udyam/Udyog Certificate',
        mandatory: false,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    },
    gst: {
        name: 'GST Certificate',
        mandatory: false,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    }
};

// Document type configuration for Partnership
const PARTNERSHIP_DOCS = {
    partnershipDeed: {
        name: 'Partnership Deed',
        mandatory: true,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    },
    addressProof: {
        name: 'Address Proof',
        mandatory: true,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    },
    gst: {
        name: 'GST Certificate',
        mandatory: true,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    },
    businessPan: {
        name: 'Business PAN',
        mandatory: false,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    },
    udyam: {
        name: 'Udyam/Udyog Certificate',
        mandatory: false,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    }
};

// Document type configuration for Company (Pvt Ltd / LLP / OPC)
const COMPANY_DOCS = {
    company_pan: {
        name: 'Company PAN Card',
        mandatory: true,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    },
    aoa_mou: {
        name: 'AOA/MOU',
        mandatory: true,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    },
    gst_certificate: {
        name: 'GST Certificate',
        mandatory: true,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    },
    udyog_aadhaar: {
        name: 'Udyog Aadhaar',
        mandatory: true,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    }
};

// Get document config by entity type
function getDocConfig(entityType) {
    switch (entityType) {
        case 'proprietorship':
            return PROPRIETORSHIP_DOCS;
        case 'partnership':
            return PARTNERSHIP_DOCS;
        case 'company':
            return COMPANY_DOCS;
        default:
            return {};
    }
}

// Get entityType with fallback chain: Header → JWT → User model → Application model
async function getEntityType(req) {
    const User = require('../models/User');

    // 1. Primary: Check X-Entity-Type header from frontend (localStorage - most reliable)
    const headerEntityType = req.headers['x-entity-type'];
    if (headerEntityType && headerEntityType !== 'individual') {
        logger.debug(`[getEntityType] From header: ${headerEntityType}`);
        return headerEntityType;
    }

    // 2. JWT token
    let entityType = req.user?.entityType;
    if (entityType && entityType !== 'individual') {
        logger.debug(`[getEntityType] From JWT: ${entityType}`);
        return entityType;
    }

    // 3. User model
    const user = await User.findById(req.user.userId);
    if (user?.entityType && user.entityType !== 'individual') {
        logger.debug(`[getEntityType] From User model: ${user.entityType}`);
        return user.entityType;
    }

    // 4. Application model
    const application = await Application.findById(req.user.applicationId);
    if (application?.entityType && application.entityType !== 'individual') {
        logger.debug(`[getEntityType] From Application model: ${application.entityType}`);
        return application.entityType;
    }

    // Default to header value or 'individual'
    return headerEntityType || entityType || user?.entityType || application?.entityType || 'individual';
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userId = req.user.userId;
        const uploadDir = path.join(__dirname, '../uploads/documents', userId);

        // Create directory if it doesn't exist
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const docType = req.body.type;
        const ext = path.extname(file.originalname);
        cb(null, `${docType}${ext}`);
    }
});

// File filter - supports all entity types
const fileFilter = (req, file, cb) => {
    const docType = req.body.type;

    // Check in all configs
    const config = PROPRIETORSHIP_DOCS[docType] || PARTNERSHIP_DOCS[docType];

    if (!config) {
        cb(new Error('Invalid document type'), false);
        return;
    }

    if (!config.allowedTypes.includes(file.mimetype)) {
        cb(new Error('Invalid file type. Only JPG, PNG and PDF allowed.'), false);
        return;
    }

    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * GET /api/documents
 * List all documents for current user's application
 */
router.get('/', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId);

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        // Build document status list
        const userId = req.user.userId;
        const uploadDir = path.join(__dirname, '../uploads/documents', userId);

        const documents = {};

        // Use getEntityType helper to get correct entity type from header/user/application
        const entityType = await getEntityType(req);
        const docConfig = getDocConfig(entityType);
        for (const [type, config] of Object.entries(docConfig)) {
            const docInfo = {
                type,
                name: config.name,
                mandatory: config.mandatory,
                uploaded: false,
                filePath: null,
                uploadedAt: null
            };

            // Check if file exists
            const extensions = ['.jpg', '.jpeg', '.png', '.pdf'];
            for (const ext of extensions) {
                const filePath = path.join(uploadDir, `${type}${ext}`);
                if (fs.existsSync(filePath)) {
                    docInfo.uploaded = true;
                    docInfo.filePath = `/api/documents/file/${type}`;
                    docInfo.fileExt = ext;
                    const stats = fs.statSync(filePath);
                    docInfo.uploadedAt = stats.mtime;
                    break;
                }
            }

            documents[type] = docInfo;
        }

        res.json({
            success: true,
            documents,
            entityType: application.entityType
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/documents/config
 * Get document configuration for entity type
 */
router.get('/config', auth, async (req, res) => {
    const entityType = await getEntityType(req);
    const config = getDocConfig(entityType);

    logger.debug(`[Documents Config] EntityType: ${entityType}, ConfigKeys: ${Object.keys(config).join(',')}`);

    res.json({
        success: true,
        entityType: entityType,
        documents: config
    });
});

/**
 * POST /api/documents/upload
 * Upload a document
 * Body: type (shopAct, udyam, gst, partnershipDeed, etc), file
 */
router.post('/upload', auth, upload.single('file'), async (req, res, next) => {
    try {
        const { type } = req.body;
        const file = req.file;

        const docConfig = PROPRIETORSHIP_DOCS[type] || PARTNERSHIP_DOCS[type] || COMPANY_DOCS[type];
        if (!type || !docConfig) {
            return res.status(400).json({ success: false, error: 'Invalid document type' });
        }

        if (!file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        // Save metadata to MongoDB
        const application = await Application.findById(req.user.applicationId);
        if (application) {
            // Check if document of this type already exists
            const existingDocIndex = application.documents.findIndex(d => d.type === type);

            const docData = {
                type,
                status: 'uploaded',
                filePath: `/uploads/documents/${req.user.userId}/${file.filename}`,
                fileName: file.filename,
                fileSize: file.size,
                mimeType: file.mimetype,
                uploadedAt: new Date()
            };

            if (existingDocIndex >= 0) {
                // Update existing document
                application.documents[existingDocIndex] = { ...application.documents[existingDocIndex].toObject(), ...docData };
            } else {
                // Add new document
                application.documents.push(docData);
            }

            await application.save();
            logger.debug(`Document metadata saved to MongoDB: ${type} for application ${application.applicationId}`);
        }

        logger.info(`Document uploaded: ${type} for user ${req.user.userId}`);

        res.json({
            success: true,
            message: `${docConfig.name} uploaded successfully`,
            document: {
                type,
                name: docConfig.name,
                fileName: file.filename,
                size: file.size,
                uploadedAt: new Date()
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/documents/file/:type
 * Get document file
 */
router.get('/file/:type', auth, async (req, res, next) => {
    try {
        const { type } = req.params;
        const userId = req.user.userId;
        const uploadDir = path.join(__dirname, '../uploads/documents', userId);

        // Find the file with any extension
        const extensions = ['.jpg', '.jpeg', '.png', '.pdf'];
        let filePath = null;

        for (const ext of extensions) {
            const testPath = path.join(uploadDir, `${type}${ext}`);
            if (fs.existsSync(testPath)) {
                filePath = testPath;
                break;
            }
        }

        if (!filePath) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        res.sendFile(filePath);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/documents/:type
 * Delete a document
 */
router.delete('/:type', auth, async (req, res, next) => {
    try {
        const { type } = req.params;
        const userId = req.user.userId;
        const uploadDir = path.join(__dirname, '../uploads/documents', userId);

        const docConfig = PROPRIETORSHIP_DOCS[type] || PARTNERSHIP_DOCS[type];
        if (!docConfig) {
            return res.status(400).json({ success: false, error: 'Invalid document type' });
        }

        // Find and delete the file
        const extensions = ['.jpg', '.jpeg', '.png', '.pdf'];
        let deleted = false;

        for (const ext of extensions) {
            const filePath = path.join(uploadDir, `${type}${ext}`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                deleted = true;
                break;
            }
        }

        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        // Remove from MongoDB
        const application = await Application.findById(req.user.applicationId);
        if (application) {
            application.documents = application.documents.filter(d => d.type !== type);
            await application.save();
            logger.debug(`Document metadata removed from MongoDB: ${type}`);
        }

        logger.info(`Document deleted: ${type} for user ${req.user.userId}`);

        res.json({
            success: true,
            message: `${docConfig.name} deleted successfully`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/documents/validate
 * Check if all mandatory documents are uploaded
 */
router.get('/validate', auth, async (req, res, next) => {
    try {
        const application = await Application.findById(req.user.applicationId);
        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const userId = req.user.userId;
        const uploadDir = path.join(__dirname, '../uploads/documents', userId);
        const docConfig = getDocConfig(application.entityType);

        const missing = [];
        const extensions = ['.jpg', '.jpeg', '.png', '.pdf'];

        for (const [type, config] of Object.entries(docConfig)) {
            if (!config.mandatory) continue;

            let found = false;
            for (const ext of extensions) {
                const filePath = path.join(uploadDir, `${type}${ext}`);
                if (fs.existsSync(filePath)) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                missing.push({ type, name: config.name });
            }
        }

        res.json({
            success: true,
            valid: missing.length === 0,
            missing
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
