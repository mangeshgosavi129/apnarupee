/**
 * File Upload Middleware (Multer Configuration)
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const { ALLOWED_FILE_TYPES, ALLOWED_EXTENSIONS } = require('../config/constants');

// Ensure upload directory exists
const ensureUploadDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create application-specific folder
        const applicationId = req.body.applicationId || 'temp';
        const uploadDir = path.join(env.uploadPath, applicationId);
        ensureUploadDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const ext = path.extname(file.originalname);
        const documentType = req.body.documentType || 'document';
        const filename = `${documentType}_${uuidv4()}${ext}`;
        cb(null, filename);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Check MIME type
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        return cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'), false);
    }

    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(new Error('Invalid file extension.'), false);
    }

    cb(null, true);
};

// Create multer upload instance
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: env.maxFileSize, // 5MB default
        files: 1 // Single file upload
    }
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: `Upload error: ${err.message}`
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    next();
};

module.exports = {
    upload,
    handleMulterError,
    ensureUploadDir
};
