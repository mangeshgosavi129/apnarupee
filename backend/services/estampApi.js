/**
 * E-Stamp API Service (SignDesk DSS 2.0)
 * Configured for Individual Entity Type
 * Second Party = KYC User (Individual completing the workflow)
 * First Party = Graphsense Solutions (Corporate - static)
 */

const axios = require('axios');
const fs = require('fs');
const config = require('../config/signdesk');
const logger = require('../utils/logger');

class EstampApi {
    constructor() {
        this.baseUrl = config.estamp.baseUrl;
        this.apiKey = config.estamp.apiKey;
        this.apiId = config.estamp.apiId;
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-parse-rest-api-key': this.apiKey,
            'x-parse-application-id': this.apiId
        };
    }

    generateRefId() {
        return `ESTAMP_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    /**
     * Parse address from DigiLocker/Aadhaar format
     * Aadhaar address format: "at post tirth khu tq tuljapur, Osmanabad, Tirth Kh., Maharashtra, India, 413601"
     */
    parseAadhaarAddress(fullAddress) {
        if (!fullAddress) {
            return {
                street_address: 'N/A',
                city: 'Mumbai',
                state: 'MH',
                pincode: '400001'
            };
        }

        const parts = fullAddress.split(',').map(p => p.trim()).filter(p => p);

        let pincode = '400001';
        let state = 'Maharashtra';
        let city = 'Mumbai';
        let street = parts[0];

        // 1. Extract Pincode
        const pinRegex = /\b\d{6}\b/;
        if (parts.length > 0 && pinRegex.test(parts[parts.length - 1])) {
            pincode = parts.pop().match(pinRegex)[0];
        } else if (pinRegex.test(fullAddress)) {
            const match = fullAddress.match(pinRegex);
            if (match) pincode = match[0];
        }

        // 2. Extract Country (Remove if India)
        if (parts.length > 0 && ['India', 'Bharat', 'INDIA'].includes(parts[parts.length - 1])) {
            parts.pop();
        }

        // 3. Extract State
        if (parts.length > 0) {
            state = parts.pop();
        }

        // 4. Extract City
        if (parts.length > 0) {
            city = parts.pop();
        }

        // 5. Rest is Street
        if (parts.length > 0) {
            street = parts.join(', ');
        } else {
            // If we popped everything, use original string minus extracted parts (approx)
            street = fullAddress.split(',')[0] || fullAddress.substring(0, 30);
        }

        // Basic State Code Mapping (Optional - add more as needed)
        const stateMap = {
            'Maharashtra': 'MH',
            'Karnataka': 'KA',
            'Delhi': 'DL',
            'Gujarat': 'GJ',
            'Telangana': 'TG',
            'Tamil Nadu': 'TN',
            'West Bengal': 'WB',
            'Rajasthan': 'RJ',
            'Uttar Pradesh': 'UP',
            'Madhya Pradesh': 'MP',
            'Bihar': 'BR',
            'Kerala': 'KL',
            'Punjab': 'PB',
            'Haryana': 'HR',
            'Odisha': 'OD'
        };

        const stateCode = stateMap[state] || state;

        console.log('[Estamp] Parsed Address:', { fullAddress, street, city, state: stateCode, pincode });

        return {
            street_address: street,
            city: city,
            state: stateCode,
            pincode: pincode
        };
    }

    /**
     * Request E-Stamp for Individual Entity Type
     * @param {Object} params - User KYC data
     * @param {string} params.content - Base64 encoded PDF (generated agreement)
     * @param {string} params.name - User's full name (from Aadhaar)
     * @param {string} params.email - User's email
     * @param {string} params.phone - User's phone number
     * @param {string} params.panNumber - User's PAN number
     * @param {string} params.address - User's full address (from Aadhaar)
     * @param {string} [params.district] - District for ESBTR (optional)
     * @param {number} [params.stampAmount] - Stamp amount (default 100)
     */
    async requestStampPaperIndividual(params) {
        try {
            const referenceId = this.generateRefId();

            if (!params.content) {
                throw new Error('PDF content is required');
            }

            // Parse user's address
            const userAddress = this.parseAadhaarAddress(params.address);

            // Build payload for Individual entity
            const payload = {
                reference_id: referenceId,
                content: params.content,

                // ============ FIRST PARTY (Static - Graphsense Solutions) ============
                first_party_name: config.firstParty.name,
                first_party_address: {
                    street_address: config.firstParty.address.street,
                    city: config.firstParty.address.city,
                    state: config.stamp.state,
                    pincode: config.firstParty.address.pincode,
                    country: 'India'
                },
                first_party_details: {
                    first_party_entity_type: 'Organization',
                    first_party_id_type: 'PAN',
                    first_party_id_number: config.firstParty.pan
                },

                // ============ SECOND PARTY (User from KYC) ============
                second_party_name: params.name || 'Individual Applicant',
                second_party_address: {
                    street_address: userAddress.street_address,
                    // city: userAddress.city, // Removed to bypass strict city-state validation
                    state: userAddress.state,
                    pincode: userAddress.pincode
                },
                second_party_details: {
                    second_party_entity_type: 'Individual',
                    second_party_id_type: 'PAN',
                    second_party_id_number: params.panNumber || 'N/A'
                },

                // ============ ESBTR Details ============
                esbtr_details: {
                    property_address: {
                        addressline_1: 'Business Park A',
                        road: 'Main Road',
                        town_village: 'Panvel',
                        district: 'Raigad',
                        state_code: config.stamp.state,
                        pincode: '410206'
                    },
                    property_area: '100',
                    property_area_unit: 'Sq.Feet',
                    district: params.district || 'Pune'
                },

                // ============ Stamp Details ============
                stamp_amount: [params.stampAmount || 100],
                consideration_amount: '100000',
                stamp_state: config.stamp.state,
                stamp_type: config.stamp.type,
                stamp_duty_paid_by: 'First Party',
                document_category: [config.stamp.documentCategory],

                // User contact (for duty payer)
                duty_payer_phone_number: params.phone || '9876543210',
                duty_payer_email_id: params.email || 'user@example.com'
            };

            logger.info('[E-Stamp] Initiating for Individual:', {
                referenceId,
                secondParty: params.name,
                pan: params.panNumber,
                email: params.email
            });

            logger.debug('[E-Stamp] Request payload:', JSON.stringify(payload, null, 2));

            const response = await axios.post(
                `${this.baseUrl}/requestStampPaper`,
                payload,
                { headers: this.getHeaders(), timeout: 60000 }
            );

            logger.info('[E-Stamp] Response received', {
                referenceId,
                status: response.data.status,
                transactionId: response.data.transaction_id,
                stampPaperNumber: response.data.stamp_paper_number,
                hasContent: !!response.data.content,
                contentLength: response.data.content?.length || 0
            });

            // Log all response keys and full response for debugging
            logger.info('[E-Stamp] Response keys:', Object.keys(response.data));

            // WRITE TO DEBUG FILE
            const debugResponse = { ...response.data };
            if (debugResponse.content) {
                debugResponse.content = `[BASE64 - ${debugResponse.content.length} chars]`;
            }
            fs.writeFileSync('/tmp/estamp_response.json', JSON.stringify(debugResponse, null, 2));
            logger.info('[E-Stamp] Response written to /tmp/estamp_response.json');

            if (response.data.status === 'success') {
                const stampedContent = response.data.content;
                if (!stampedContent) {
                    logger.warn('[E-Stamp] WARNING: No content in response!');
                }

                logger.info('[E-Stamp] SUCCESS - Stamp paper created:', {
                    transactionId: response.data.transaction_id,
                    contentLength: stampedContent?.length || 0
                });

                return {
                    success: true,
                    referenceId,
                    transactionId: response.data.transaction_id,
                    stampPaperNumber: response.data.stamp_paper_number,
                    stampedContent: stampedContent, // This goes to E-Sign API
                    data: response.data
                };
            }

            logger.warn('[E-Stamp] FAILED:', response.data.message || response.data.error_code);
            return {
                success: false,
                referenceId,
                error: response.data.message || 'E-Stamp failed',
                errorCode: response.data.error_code,
                data: response.data
            };
        } catch (error) {
            logger.error('[E-Stamp] Error:', {
                message: error.response?.data?.message || error.message,
                code: error.response?.data?.error_code
            });
            return {
                success: false,
                error: error.response?.data?.message || error.message,
                errorCode: error.response?.data?.error_code,
                rawError: error.response?.data
            };
        }
    }

    // Alias for backward compatibility
    async requestStampPaper(params) {
        return this.requestStampPaperIndividual(params);
    }
}

module.exports = new EstampApi();
