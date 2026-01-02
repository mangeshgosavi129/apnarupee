/**
 * Sandbox API Service with Automatic Token Refresh
 * Handles: Aadhaar OKYC, PAN, Bank Verification, MCA, DigiLocker
 * 
 * Features:
 * - Automatic token refresh on expiry (24 hour validity)
 * - Token caching with expiry tracking
 * - Automatic retry on 403 Insufficient privilege errors
 */
const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

class SandboxApi {
    constructor() {
        this.baseUrl = env.sandbox.baseUrl || 'https://api.sandbox.co.in';
        this.apiKey = env.sandbox.apiKey;
        this.apiSecret = env.sandbox.apiSecret;

        // Token management
        this.accessToken = null;
        this.tokenExpiresAt = null;
        this.tokenRefreshBuffer = 5 * 60 * 1000; // Refresh 5 minutes before expiry

        // Axios instance with longer timeout for slow Sandbox API
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 60000  // 60 seconds - Sandbox can be very slow
        });

        // Response interceptor for logging
        this.client.interceptors.response.use(
            response => response,
            error => {
                logger.error('Sandbox API Error:', {
                    url: error.config?.url,
                    status: error.response?.status,
                    data: error.response?.data
                });
                throw error;
            }
        );

        logger.info('Sandbox API initialized', { baseUrl: this.baseUrl });
    }

    /**
     * Authenticate and get access token
     * POST /authenticate
     * Token validity: 24 hours
     */
    async authenticate() {
        try {
            logger.info('Authenticating with Sandbox API...');

            const response = await this.client.post('/authenticate', null, {
                headers: {
                    'x-api-key': this.apiKey,
                    'x-api-secret': this.apiSecret,
                    'x-api-version': '1.0.0'
                }
            });

            if (response.data.code === 200 && response.data.data?.access_token) {
                this.accessToken = response.data.data.access_token;
                // Set expiry to 24 hours from now
                this.tokenExpiresAt = Date.now() + (24 * 60 * 60 * 1000);

                logger.info('Sandbox authentication successful', {
                    expiresAt: new Date(this.tokenExpiresAt).toISOString()
                });

                return this.accessToken;
            }

            throw new Error(response.data.message || 'Authentication failed');
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            logger.error('Sandbox authentication failed:', message);
            throw new Error(`Sandbox Auth Error: ${message}`);
        }
    }

    /**
     * Check if token is expired or about to expire
     */
    isTokenExpired() {
        if (!this.accessToken || !this.tokenExpiresAt) {
            return true;
        }
        // Refresh if within buffer time of expiry
        return Date.now() >= (this.tokenExpiresAt - this.tokenRefreshBuffer);
    }

    /**
     * Ensure we have a valid token before making API calls
     */
    async ensureToken() {
        if (this.isTokenExpired()) {
            await this.authenticate();
        }
        return this.accessToken;
    }

    /**
     * Get headers with current access token
     * Note: Sandbox API does NOT use "Bearer" prefix!
     */
    async getHeaders() {
        await this.ensureToken();
        return {
            'Authorization': this.accessToken,  // NOT Bearer token!
            'x-api-key': this.apiKey,
            'x-api-version': '1.0'
        };
    }

    /**
     * Execute API call with automatic token refresh on 403
     * Token refresh is ONLY for Sandbox auth token, NOT for OTP
     */
    async executeWithRetry(method, url, data = null, config = {}) {
        const headers = await this.getHeaders();

        try {
            let response;
            if (method === 'GET') {
                response = await this.client.get(url, { ...config, headers });
            } else {
                response = await this.client.post(url, data, { ...config, headers });
            }
            return response.data;
        } catch (error) {
            const status = error.response?.status;

            // Log API error
            logger.error('Sandbox API Error:', {
                url,
                method,
                status,
                data: error.response?.data,
                message: error.message
            });

            // Check for token-related errors (403 Forbidden / Insufficient privilege)
            if (status === 403) {
                const message = error.response?.data?.message || '';

                // Token expired or insufficient privilege - refresh and retry
                if (message.includes('Insufficient privilege') ||
                    message.includes('expired') ||
                    message.includes('invalid token')) {

                    logger.warn('Sandbox API token expired, refreshing...');

                    // Force token refresh
                    this.accessToken = null;
                    this.tokenExpiresAt = null;

                    // Get new token
                    await this.authenticate();

                    // Retry the request with new token
                    const newHeaders = await this.getHeaders();
                    let retryResponse;
                    if (method === 'GET') {
                        retryResponse = await this.client.get(url, { ...config, headers: newHeaders });
                    } else {
                        retryResponse = await this.client.post(url, data, { ...config, headers: newHeaders });
                    }
                    return retryResponse.data;
                }
            }

            throw error;
        }
    }

    // ==================== AADHAAR OKYC ====================

    /**
     * Generate Aadhaar OTP
     * POST /kyc/aadhaar/okyc/otp
     */
    async generateAadhaarOtp(aadhaarNumber, consent = 'Y', reason = 'KYC Verification') {
        try {
            const headers = await this.getHeaders();

            const payload = {
                '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.request',
                aadhaar_number: aadhaarNumber,
                consent: consent,
                reason: reason
            };

            // Log full request details
            logger.info('================ [AADHAAR OTP REQUEST] ================');
            logger.info('URL: /kyc/aadhaar/okyc/otp');
            logger.info('Aadhaar:', 'XXXX-XXXX-' + aadhaarNumber.slice(-4));
            logger.info('Reason:', reason);
            logger.info('=======================================================');

            const response = await this.client.post('/kyc/aadhaar/okyc/otp', payload, { headers });
            const result = response.data;

            // Log full response
            logger.info('================ [AADHAAR OTP RESPONSE] ================');
            logger.info('Status:', response.status);
            logger.info('Reference ID:', result.data?.reference_id);
            logger.info('Message:', result.message);
            logger.debug('Full Response:', JSON.stringify(result, null, 2));
            logger.info('========================================================');

            return result;
        } catch (error) {
            logger.error('================ [AADHAAR OTP ERROR] ================');
            logger.error('Status:', error.response?.status);
            logger.error('Message:', error.response?.data?.message || error.message);
            logger.error('Data:', JSON.stringify(error.response?.data, null, 2));
            logger.error('=====================================================');

            const message = error.response?.data?.message || error.message || 'Failed to send OTP';
            throw new Error(message);
        }
    }

    /**
     * Resend Aadhaar OTP
     * Uses the same endpoint as generate OTP
     */
    async resendAadhaarOtp(aadhaarNumber, consent = 'Y', reason = 'Resending KYC Verification OTP') {
        logger.info('🔄 RESENDING AADHAAR OTP...');
        return this.generateAadhaarOtp(aadhaarNumber, consent, reason);
    }

    /**
     * Verify Aadhaar OTP
     * POST /kyc/aadhaar/okyc/otp/verify
     */
    async verifyAadhaarOtp(referenceId, otp) {
        try {
            const headers = await this.getHeaders();

            const payload = {
                '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.request',
                reference_id: String(referenceId),
                otp: String(otp)
            };

            // Log full request details
            logger.info('[Aadhaar Verify] Request:', {
                url: '/kyc/aadhaar/okyc/otp/verify',
                payload: { ...payload, otp: '******' },
                headers: { Authorization: 'Bearer...', 'x-api-key': headers['x-api-key'] }
            });

            const response = await this.client.post('/kyc/aadhaar/okyc/otp/verify', payload, { headers });
            const result = response.data;

            // Log full response
            logger.info('[Aadhaar Verify] Response:', JSON.stringify(result, null, 2));

            return result;
        } catch (error) {
            logger.error('[Aadhaar Verify] Error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });

            const message = error.response?.data?.message || error.message || 'Verification failed';
            throw new Error(message);
        }
    }

    // ==================== PAN VERIFICATION ====================

    /**
     * Verify Individual PAN
     * POST /kyc/pan/verify
     * Required fields: pan, name_as_per_pan, date_of_birth, consent, reason
     */
    async verifyPan(panNumber, nameAsPerPan = 'NA', dateOfBirth = '01/01/1990', consent = 'Y', reason = 'KYC Verification') {
        try {
            const response = await this.executeWithRetry('POST', '/kyc/pan/verify', {
                '@entity': 'in.co.sandbox.kyc.pan_verification.request',
                pan: panNumber,
                name_as_per_pan: nameAsPerPan,
                date_of_birth: dateOfBirth,  // Format: DD/MM/YYYY
                consent: consent,
                reason: reason
            });
            //if error then throw error
            logger.info('PAN verified:', response);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            throw new Error(`PAN Verify Error: ${message}`);
        }
    }

    /**
     * Check PAN-Aadhaar Link Status
     * POST /kyc/pan-aadhaar/status
     * Requires both PAN and Aadhaar number
     */
    async checkPanAadhaarLink(panNumber, aadhaarNumber, consent = 'Y', reason = 'KYC Verification') {
        try {
            const payload = {
                '@entity': 'in.co.sandbox.kyc.pan_aadhaar.status',
                pan: panNumber,
                aadhaar_number: aadhaarNumber,
                consent: consent,
                reason: reason
            };

            logger.debug('[PAN-Aadhaar Link] Request:', {
                pan: panNumber,
                aadhaar: `${aadhaarNumber.slice(0, 4)}****${aadhaarNumber.slice(-4)}`
            });

            const response = await this.executeWithRetry('POST', '/kyc/pan-aadhaar/status', payload);

            logger.info('[PAN-Aadhaar Link] Response:', {
                code: response.code,
                seedingStatus: response.data?.aadhaar_seeding_status,
                message: response.data?.message || response.message
            });

            return response;
        } catch (error) {
            logger.error('[PAN-Aadhaar Link] Error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            const message = error.response?.data?.message || error.message;
            throw new Error(`PAN-Aadhaar Link Error: ${message}`);
        }
    }

    // ==================== BANK VERIFICATION ====================

    /**
     * Verify IFSC Code
     * GET /bank/{ifsc}
     * Response: MICR, BRANCH, ADDRESS, STATE, CITY, BANK, BANKCODE, IFSC (all uppercase)
     */
    async verifyIfsc(ifsc) {
        try {
            logger.info('[IFSC] Verification request:', { ifsc });

            // Use executeWithRetry for proper token refresh handling
            const data = await this.executeWithRetry('GET', `/bank/${ifsc}`);

            // API returns uppercase field names directly (e.g., BANK, BRANCH, IFSC)
            logger.info('[IFSC] Verification successful:', {
                ifsc: data.IFSC,
                bank: data.BANK,
                branch: data.BRANCH
            });

            // Return in the format expected by the route handler
            return {
                IFSC: data.IFSC,
                BANK: data.BANK,
                BRANCH: data.BRANCH,
                ADDRESS: data.ADDRESS,
                CITY: data.CITY,
                STATE: data.STATE,
                DISTRICT: data.DISTRICT,
                CONTACT: data.CONTACT,
                MICR: data.MICR,
                NEFT: data.NEFT,
                RTGS: data.RTGS,
                IMPS: data.IMPS,
                UPI: data.UPI
            };
        } catch (error) {
            const status = error.response?.status;
            const message = error.response?.data || error.message;

            logger.error('[IFSC] Verification failed:', {
                ifsc,
                status,
                message
            });

            // Handle 404 - IFSC not found
            if (status === 404) {
                return {
                    status: 404,
                    error: 'Not Found'
                };
            }

            // Return error object instead of throwing
            return {
                status: status || 500,
                error: message,
                message: typeof message === 'string' ? message : 'IFSC verification failed'
            };
        }
    }

    /**
     * Bank Account Verification (Penny Drop)
     * GET /bank/{ifsc}/accounts/{account_number}/verify
     * Optional query params: name, mobile
     * Response: account_exists, name_at_bank, utr, amount_deposited, message
     */
    async verifyBankAccountPenny(ifsc, accountNumber, name = null, mobile = null) {
        try {
            let url = `/bank/${ifsc}/accounts/${accountNumber}/verify`;
            const queryParams = [];
            if (name) queryParams.push(`name=${encodeURIComponent(name)}`);
            if (mobile) queryParams.push(`mobile=${mobile}`);
            if (queryParams.length > 0) {
                url += `?${queryParams.join('&')}`;
            }

            const response = await this.executeWithRetry('GET', url);

            logger.info('Bank account verified (penny):', response.data?.name_at_bank);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            throw new Error(`Bank Penny Drop Error: ${message}`);
        }
    }

    /**
     * Bank Account Verification (Penny-less / IMPS)
     * GET /bank/{ifsc}/accounts/{account_number}/penniless-verify
     * Optional query params: name, mobile
     * Response: account_exists, name_at_bank, message
     */
    async verifyBankAccountPenniless(ifsc, accountNumber, name = null, mobile = null) {
        try {
            let url = `/bank/${ifsc}/accounts/${accountNumber}/penniless-verify`;
            const queryParams = [];
            if (name) queryParams.push(`name=${encodeURIComponent(name)}`);
            if (mobile) queryParams.push(`mobile=${mobile}`);
            if (queryParams.length > 0) {
                url += `?${queryParams.join('&')}`;
            }

            const response = await this.executeWithRetry('GET', url);

            logger.info('Bank account verified (penniless):', response.data?.name_at_bank);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            throw new Error(`Bank Penniless Error: ${message}`);
        }
    }

    // ==================== DIGILOCKER SDK ====================

    /**
     * Create DigiLocker SDK Session
     * POST /kyc/digilocker-sdk/sessions/create
     * @param {string} flow - 'signin' or 'signup'
     * @param {array} docTypes - Array of doc types: 'aadhaar', 'driving_license', 'pan'
     * @returns {object} Response with session id
     */
    async createDigilockerSession(flow = 'signin', docTypes = ['aadhaar', 'pan']) {
        try {
            const response = await this.executeWithRetry('POST', '/kyc/digilocker-sdk/sessions/create', {
                '@entity': 'in.co.sandbox.kyc.digilocker.sdk.session.request',
                flow: flow,           // 'signin' or 'signup'
                doc_types: docTypes   // ['aadhaar', 'pan', 'driving_license']
            });

            logger.info('DigiLocker SDK session created:', response.data?.id);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            throw new Error(`DigiLocker Session Error: ${message}`);
        }
    }

    /**
     * Get DigiLocker SDK Session Status
     * GET /kyc/digilocker-sdk/sessions/{session_id}/status
     * @returns {object} Status: 'created', 'initialized', 'authorized', 'succeeded', 'failed', 'expired'
     */
    async getDigilockerSessionStatus(sessionId) {
        try {
            const response = await this.executeWithRetry('GET', `/kyc/digilocker-sdk/sessions/${sessionId}/status`);
            logger.info('DigiLocker session status:', response.data?.status);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            throw new Error(`DigiLocker Status Error: ${message}`);
        }
    }

    /**
     * Get DigiLocker Document
     * GET /kyc/digilocker-sdk/sessions/{session_id}/documents/{doc_type}
     * @param {string} docType - 'aadhaar', 'pan', 'driving_license'
     * @returns {object} Document files with URLs
     */
    async getDigilockerDocument(sessionId, docType) {
        try {
            const response = await this.executeWithRetry(
                'GET',
                `/kyc/digilocker-sdk/sessions/${sessionId}/documents/${docType}`
            );

            logger.info('DigiLocker document retrieved:', docType);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            throw new Error(`DigiLocker Document Error: ${message}`);
        }
    }

    /**
     * Verify Company by CIN
     * MCA Company Master Data API - Verify Company/LLP by CIN or LLPIN
     * POST /mca/company/master-data/search
     * 
     * @param {string} cinOrLlpin - CIN (21 chars) for Company/OPC, LLPIN (7 chars) for LLP
     * @returns Company/LLP details with directors list
     */
    async verifyCompanyMasterData(cinOrLlpin, consent = 'y', reason = 'Company verification for DSA onboarding') {
        try {
            const headers = await this.getHeaders();

            const payload = {
                '@entity': 'in.co.sandbox.kyc.mca.master_data.request',
                id: cinOrLlpin,
                consent: consent,
                reason: reason
            };

            logger.info('[MCA] Request:', {
                url: '/mca/company/master-data/search',
                payload: payload
            });

            const response = await this.client.post('/mca/company/master-data/search', payload, { headers });
            const result = response.data;

            // Log full response for debugging
            logger.info('[MCA] Response:', JSON.stringify(result, null, 2));

            // Determine entity type from response
            const isLlp = result.data?.['@entity'] === 'in.co.sandbox.kyc.mca.llp';
            const masterData = isLlp ? result.data?.llp_master_data : result.data?.company_master_data;
            const directors = result.data?.['directors/signatory_details'] || [];

            logger.info('[MCA] Company verified:', {
                name: isLlp ? masterData?.llp_name : masterData?.company_name,
                type: isLlp ? 'LLP' : 'Company',
                status: isLlp ? masterData?.llp_status : masterData?.['company_status(for_efiling)'],
                directorsCount: directors.length
            });

            // Normalize response
            return {
                success: true,
                isLlp: isLlp,
                type: isLlp ? 'llp' : 'pvt_ltd',
                raw: result,
                company: {
                    cin: isLlp ? null : masterData?.cin,
                    llpin: isLlp ? masterData?.llpin : null,
                    name: isLlp ? masterData?.llp_name : masterData?.company_name,
                    registeredAddress: masterData?.registered_address,
                    dateOfIncorporation: masterData?.date_of_incorporation,
                    email: masterData?.email_id,
                    status: isLlp ? masterData?.llp_status : masterData?.['company_status(for_efiling)'],
                    rocCode: masterData?.roc_code,
                    classOfCompany: masterData?.class_of_company || null,
                    category: masterData?.company_category || null
                },
                directors: directors.map(d => ({
                    din: d['din/pan'],
                    name: d.name,
                    designation: d.designation,
                    beginDate: d.begin_date,
                    endDate: d.end_date
                }))
            };
        } catch (error) {
            // Log full error details
            logger.error('[MCA] Company verification failed:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });

            const message = error.response?.data?.message || error.message || 'Company verification failed';

            return {
                success: false,
                error: message,
                code: error.response?.data?.code
            };
        }
    }

    /**
     * Force refresh token (for testing/admin purposes)
     */
    async forceRefreshToken() {
        this.accessToken = null;
        this.tokenExpiresAt = null;
        return await this.authenticate();
    }

    /**
     * Get current token status (for debugging)
     */
    getTokenStatus() {
        return {
            hasToken: !!this.accessToken,
            expiresAt: this.tokenExpiresAt ? new Date(this.tokenExpiresAt).toISOString() : null,
            isExpired: this.isTokenExpired(),
            timeToExpiry: this.tokenExpiresAt ? Math.max(0, this.tokenExpiresAt - Date.now()) : 0
        };
    }
}

// Export singleton instance
module.exports = new SandboxApi();
