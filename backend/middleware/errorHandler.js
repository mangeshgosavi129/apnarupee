/**
 * Global Error Handler Middleware
 */
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    // Log error
    logger.error(err.message, {
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            messages
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            error: 'Duplicate field value entered'
        });
    }

    // Mongoose cast error (bad ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            error: 'Invalid resource ID'
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expired'
        });
    }

    // Joi validation error
    if (err.isJoi) {
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            messages: err.details.map(d => d.message)
        });
    }

    // Default server error
    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Internal Server Error'
    });
};

module.exports = errorHandler;
