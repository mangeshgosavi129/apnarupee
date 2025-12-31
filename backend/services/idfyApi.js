/**
 * IDfy API Service
 * Handles: Face Liveness, Face Compare, GST Verification, Udyam/Udyog Verification
 */
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const logger = require('../utils/logger');

class IdfyApi {
    constructor() {
        this.baseUrl = env.idfy.baseUrl;
        this.accountId = env.idfy.accountId;
        this.apiKey = env.idfy.apiKey;

        // Default task_id and group_id (can be overridden)
        this.defaultTaskId = '74f4c926-250c-43ca-9c53-453e87ceacd1';
        this.defaultGroupId = '8e16424a-58fc-4ba4-ab20-5bc8e7c3c41e';

        // Axios instance with default headers
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'api-key': this.apiKey,
                'account-id': this.accountId
            },
            timeout: 30000
        });

        // Response interceptor for logging
        this.client.interceptors.response.use(
            response => response,
            error => {
                logger.error('IDfy API Error:', {
                    url: error.config?.url,
                    status: error.response?.status,
                    data: error.response?.data
                });
                throw error;
            }
        );
    }

    /**
     * Face Liveness Detection (Async)
     * POST /v3/tasks/async/check_photo_liveness/face
     */
    async checkFaceLiveness(imageBase64OrUrl) {
        try {
            const response = await this.client.post('/v3/tasks/async/check_photo_liveness/face', {
                task_id: this.defaultTaskId,
                group_id: this.defaultGroupId,
                data: {
                    document1: imageBase64OrUrl,
                    detect_face_mask: true,
                    detect_front_facing: true
                }
            });

            logger.info('Face Liveness initiated:', response.data.request_id);
            return response.data;
        } catch (error) {
            throw new Error(`Face Liveness Error: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Face Comparison (Async)
     * POST /v3/tasks/async/compare/face
     */
    async compareFaces(image1Base64OrUrl, image2Base64OrUrl) {
        try {
            const response = await this.client.post('/v3/tasks/async/compare/face', {
                task_id: this.defaultTaskId,
                group_id: this.defaultGroupId,
                data: {
                    document1: image1Base64OrUrl,
                    document2: image2Base64OrUrl
                }
            });

            logger.info('Face Compare initiated:', response.data.request_id);
            return response.data;
        } catch (error) {
            throw new Error(`Face Compare Error: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * GST Certificate Verification by GSTIN (Async)
     * POST /v3/tasks/async/verify_with_source/ind_gst_certificate
     */
    async verifyGstin(gstin, includeFilingDetails = false) {
        try {
            const response = await this.client.post('/v3/tasks/async/verify_with_source/ind_gst_certificate', {
                task_id: this.defaultTaskId,
                group_id: this.defaultGroupId,
                data: {
                    gstin: gstin.toUpperCase(),
                    filing_details: includeFilingDetails,
                    e_invoice_details: false
                }
            });

            logger.info('GST Verification initiated:', response.data.request_id);
            return response.data;
        } catch (error) {
            throw new Error(`GST Verification Error: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * GST Certificate OCR Extraction (Async)
     * POST /v3/tasks/async/extract/ind_gst_certificate
     */
    async extractGstFromImage(imageBase64OrUrl) {
        try {
            const response = await this.client.post('/v3/tasks/async/extract/ind_gst_certificate', {
                task_id: this.defaultTaskId,
                group_id: this.defaultGroupId,
                data: {
                    document1: imageBase64OrUrl
                }
            });

            logger.info('GST OCR initiated:', response.data.request_id);
            return response.data;
        } catch (error) {
            throw new Error(`GST OCR Error: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Udyam Aadhaar Verification by UAM Number (Async)
     * POST /v3/tasks/async/verify_with_source/udyam_aadhaar
     */
    async verifyUdyam(uamNumber) {
        try {
            const response = await this.client.post('/v3/tasks/async/verify_with_source/udyam_aadhaar', {
                task_id: this.defaultTaskId,
                group_id: this.defaultGroupId,
                data: {
                    uam_number: uamNumber.toUpperCase()
                }
            });

            logger.info('Udyam Verification initiated:', response.data.request_id);
            return response.data;
        } catch (error) {
            throw new Error(`Udyam Verification Error: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Udyog Aadhaar Verification by UAM Number (Async) - Fallback
     * POST /v3/tasks/async/verify_with_source/udyog_aadhaar
     */
    async verifyUdyog(uamNumber) {
        try {
            const response = await this.client.post('/v3/tasks/async/verify_with_source/udyog_aadhaar', {
                task_id: this.defaultTaskId,
                group_id: this.defaultGroupId,
                data: {
                    uam_number: uamNumber.toUpperCase()
                }
            });

            logger.info('Udyog Verification initiated:', response.data.request_id);
            return response.data;
        } catch (error) {
            throw new Error(`Udyog Verification Error: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get Task Result (for all async tasks)
     * GET /v3/tasks?request_id={request_id}
     */
    async getTaskResult(requestId) {
        try {
            const response = await this.client.get('/v3/tasks', {
                params: { request_id: requestId }
            });

            // Response is an array
            const result = Array.isArray(response.data) ? response.data[0] : response.data;

            logger.info('Task result fetched:', { requestId, status: result?.status });
            return result;
        } catch (error) {
            throw new Error(`Get Task Error: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Poll Task Result (with retries)
     */
    async pollTaskResult(requestId, maxAttempts = 10, intervalMs = 2000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const result = await this.getTaskResult(requestId);

            if (result.status === 'completed' || result.status === 'failed') {
                return result;
            }

            logger.debug(`Task ${requestId} still in progress, attempt ${attempt}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        throw new Error(`Task ${requestId} did not complete in time`);
    }

    /**
     * Verify Udyam/Udyog with Fallback
     * 1. Try Udyam API
     * 2. If fails, try Udyog API
     * 3. Return result or throw error
     */
    async verifyUdyamWithFallback(uamNumber) {
        try {
            // Step 1: Try Udyam API
            logger.info('Trying Udyam API...');
            const udyamResponse = await this.verifyUdyam(uamNumber);
            const udyamResult = await this.pollTaskResult(udyamResponse.request_id);

            if (udyamResult.status === 'completed' && udyamResult.result?.source_output?.status === 'id_found') {
                return {
                    success: true,
                    source: 'udyam',
                    data: udyamResult.result.source_output
                };
            }
        } catch (error) {
            logger.warn('Udyam API failed, trying Udyog fallback:', error.message);
        }

        try {
            // Step 2: Try Udyog API (fallback for old registrations)
            logger.info('Trying Udyog API (fallback)...');
            const udyogResponse = await this.verifyUdyog(uamNumber);
            const udyogResult = await this.pollTaskResult(udyogResponse.request_id);

            if (udyogResult.status === 'completed' && udyogResult.result?.source_output?.status === 'id_found') {
                return {
                    success: true,
                    source: 'udyog',
                    data: udyogResult.result.source_output
                };
            }
        } catch (error) {
            logger.error('Udyog API also failed:', error.message);
        }

        // Both failed
        return {
            success: false,
            source: null,
            message: 'Could not verify with Udyam or Udyog API. Please upload certificate for OCR.'
        };
    }
}

// Export singleton instance
module.exports = new IdfyApi();
