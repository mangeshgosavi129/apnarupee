/**
 * JWT Authentication Middleware
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Get token from header or query param (for file downloads in new tab)
        let token;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.query.token) {
            // Allow token in query param for file viewing in new tabs
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, env.jwtSecret);

        // Check if user still exists in database
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User no longer exists'
            });
        }

        // Attach user info to request
        req.user = decoded;
        req.userId = decoded.userId;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        }
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
};

// Generate JWT token
const generateToken = (payload) => {
    return jwt.sign(payload, env.jwtSecret, {
        expiresIn: env.jwtExpiresIn
    });
};

module.exports = { auth, generateToken };
