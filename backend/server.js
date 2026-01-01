/**
 * DSA Onboarding Platform v4.0 - Express Server
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Config
const env = require('./config/env');
const connectDB = require('./config/database');
const logger = require('./utils/logger');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Initialize Express
const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false
}));

// CORS - allow all origins in dev
app.use(cors({
    origin: env.isDev() ? '*' : process.env.FRONTEND_URL,
    credentials: true
}));

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
app.use('/api/', apiLimiter);

// Request Logging (development)
if (env.isDev()) {
    app.use((req, res, next) => {
        logger.debug(`${req.method} ${req.path}`);
        next();
    });
}

// Static Files - uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Frontend Path
const FRONTEND_PATH = path.resolve(__dirname, '../frontend');

// Serve static frontend files
app.use(express.static(FRONTEND_PATH));

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.nodeEnv
    });
});

// API Info
app.get('/api', (req, res) => {
    res.json({
        name: 'DSA Onboarding API',
        version: '4.0.0',
        description: 'DSA Onboarding Platform with multi-entity support'
    });
});

// ==================== API Routes ====================

// Auth routes (login, OTP)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Application routes
const applicationRoutes = require('./routes/application');
app.use('/api/application', applicationRoutes);

// KYC routes
const kycRoutes = require('./routes/kyc');
app.use('/api/kyc', kycRoutes);

// Bank routes
const bankRoutes = require('./routes/bank');
app.use('/api/bank', bankRoutes);

// Documents routes
const documentsRoutes = require('./routes/documents');
app.use('/api/documents', documentsRoutes);

// Partners routes (Partnership entity)
const partnersRoutes = require('./routes/partners');
app.use('/api/partners', partnersRoutes);

// Partner KYC routes (Partnership entity)
const partnerKycRoutes = require('./routes/partner-kyc');
app.use('/api/partner-kyc', partnerKycRoutes);

// References routes
const referencesRoutes = require('./routes/references');
app.use('/api/references', referencesRoutes);

// Agreement routes
const agreementRoutes = require('./routes/agreement');
app.use('/api/agreement', agreementRoutes);

// Company routes (Company/LLP entity)
const companyRoutes = require('./routes/company');
app.use('/api/company', companyRoutes);

// Directors routes (reuse company routes for director endpoints)
app.use('/api/directors', companyRoutes);

// ==================== Frontend SPA Fallback ====================

// SPA fallback - serve index.html for non-API routes (client-side routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// ==================== Error Handling ====================

// Global Error Handler
app.use(errorHandler);

// ==================== Server Startup ====================

const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Start Express server
        app.listen(env.port, () => {
            logger.info(`🚀 Server running on port ${env.port} in ${env.nodeEnv} mode`);
            logger.info(`📍 API available at http://localhost:${env.port}/api`);

            if (env.simulateOtp) {
                logger.warn('⚠️  OTP simulation is ENABLED (dev mode)');
            }
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;