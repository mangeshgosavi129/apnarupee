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

/* =========================
   Core Security Middleware
========================= */
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: env.isDev() ? '*' : process.env.FRONTEND_URL,
    credentials: true
}));

/* =========================
   Body Parsers (MUST be early)
========================= */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* =========================
   Rate Limiting (API only)
========================= */
app.use('/api', apiLimiter);

/* =========================
   Dev Request Logger
========================= */
if (env.isDev()) {
    app.use((req, res, next) => {
        logger.debug(`${req.method} ${req.path}`);
        next();
    });
}

/* =========================
   Static Uploads
========================= */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =========================
   Health & Meta
========================= */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.nodeEnv
    });
});

app.get('/api', (req, res) => {
    res.json({
        name: 'DSA Onboarding API',
        version: '4.0.0',
        description: 'DSA Onboarding Platform with multi-entity support'
    });
});

/* =========================
   API Routes (ALWAYS before frontend)
========================= */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/application', require('./routes/application'));
app.use('/api/kyc', require('./routes/kyc'));
app.use('/api/bank', require('./routes/bank'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/partner-kyc', require('./routes/partner-kyc'));
app.use('/api/references', require('./routes/references'));
app.use('/api/agreement', require('./routes/agreement'));
app.use('/api/company', require('./routes/company'));
app.use('/api/directors', require('./routes/company'));

/* =========================
   Frontend (LAST, ALWAYS)
========================= */
const FRONTEND_PATH = path.resolve(__dirname, '../frontend/dist');

// Serve static frontend files
app.use(express.static(FRONTEND_PATH));

// SPA fallback (non-API routes only)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

/* =========================
   Global Error Handler
========================= */
app.use(errorHandler);

/* =========================
   Start Server
========================= */
const startServer = async () => {
    try {
        await connectDB();

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