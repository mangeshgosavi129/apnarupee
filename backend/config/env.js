/**
 * Environment Configuration
 * Loads and validates environment variables
 */
require('dotenv').config();

const env = {
    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 5000,

    // MongoDB
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dsa_onboarding_v4',

    // JWT
    jwtSecret: process.env.JWT_SECRET || 'default_dev_secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

    // Sandbox API (tokens are auto-refreshed)
    sandbox: {
        apiKey: process.env.SANDBOX_API_KEY,
        apiSecret: process.env.SANDBOX_API_SECRET,
        baseUrl: process.env.SANDBOX_BASE_URL || 'https://api.sandbox.co.in'
    },

    // IDfy API
    idfy: {
        accountId: process.env.IDFY_ACCOUNT_ID,
        apiKey: process.env.IDFY_API_KEY,
        baseUrl: process.env.IDFY_BASE_URL || 'https://eve.idfy.com'
    },

    // SignDesk API
    signdesk: {
        apiKey: process.env.SIGNDESK_API_KEY,
        baseUrl: process.env.SIGNDESK_BASE_URL || 'https://api.signdesk.com'
    },

    // File Upload
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
    uploadPath: process.env.UPLOAD_PATH || './uploads',

    // OTP Simulation
    simulateOtp: process.env.SIMULATE_OTP === 'true',

    // Helper methods
    isDev: () => env.nodeEnv === 'development',
    isProd: () => env.nodeEnv === 'production'
};

module.exports = env;
