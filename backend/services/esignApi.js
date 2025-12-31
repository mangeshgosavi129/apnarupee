/**
 * E-Sign API Service (SignDesk 2.1 V 3.1.0)
 * Configured for Individual Entity Type
 * 
 * Signing Flow:
 * 1. Second Party (KYC User) signs FIRST via invitation link (immediate)
 * 2. First Party (Graphsense Solutions) signs SECOND via email (async)
 */

const axios = require('axios');
const config = require('../config/signdesk');
const logger = require('../utils/logger');

class EsignApi {
    constructor() {
        this.baseUrl = config.esign.baseUrl;
        this.apiKey = config.esign.apiKey;
        this.apiId = config.esign.apiId;
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-parse-rest-api-key': this.apiKey,
            'x-parse-application-id': this.apiId
        };
    }

    generateRefId() {
        return `ESIGN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    getExpiryDate(days = 30) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    }

    /**
     * Extract year of birth from DOB string
     * Handles formats: "30-01-1999", "1999-01-30", "30/01/1999"
     */
    extractYearOfBirth(dob) {
        if (!dob) return '1990';

        // Try to find 4-digit year
        const yearMatch = dob.match(/\b(19|20)\d{2}\b/);
        return yearMatch ? yearMatch[0] : '1990';
    }

    /**
     * Extract last 4 digits of Aadhaar from masked or full number
     */
    extractLast4Aadhaar(aadhaarNumber) {
        if (!aadhaarNumber) return '0000';
        const digits = aadhaarNumber.replace(/\D/g, '');
        return digits.slice(-4) || '0000';
    }

    /**
     * Initiate E-Sign for Individual Entity Type
     * Sequential signing: Second Party (User) → First Party (Company)
     * 
     * @param {Object} params - Sign parameters
     * @param {string} params.documentContent - Base64 stamped PDF from E-Stamp
     * @param {Object} params.secondParty - User/KYC details (signs first)
     * @param {string} params.secondParty.name - User's name
     * @param {string} params.secondParty.email - User's email
     * @param {string} params.secondParty.mobile - User's phone
     * @param {string} params.secondParty.dob - Date of birth (for validation)
     * @param {string} params.secondParty.gender - M/F
     * @param {string} params.secondParty.aadhaarLast4 - Last 4 digits of Aadhaar
     * @param {Object} params.firstParty - Company details (signs second)
     */
    async initiateSignIndividual(params) {
        try {
            const referenceId = this.generateRefId();
            const docRefId = `doc_${Date.now()}`;

            if (!params.documentContent) {
                throw new Error('Stamped document content is required');
            }

            // Extract validation data for second party (user)
            const yearOfBirth = this.extractYearOfBirth(params.secondParty?.dob);
            const aadhaarLast4 = this.extractLast4Aadhaar(params.secondParty?.aadhaarLast4);

            // Build signers array - Second Party FIRST, First Party SECOND
            const signersInfo = [
                // ============ SIGNER 1: Second Party (User/KYC - Signs FIRST) ============
                {
                    document_to_be_signed: docRefId,
                    signer_position: {
                        appearance: 'bottom-left'  // User signs on bottom-left
                    },
                    signer_ref_id: `signer_user_${Date.now()}`,
                    signer_email: params.secondParty.email,
                    signer_name: params.secondParty.name,
                    signer_mobile: params.secondParty.mobile,
                    sequence: '1',  // Signs FIRST
                    page_number: 'all',
                    signature_type: 'aadhaar',
                    authentication_mode: 'email',
                    signer_validation_inputs: {
                        year_of_birth: yearOfBirth,
                        gender: params.secondParty?.gender || 'M',
                        name_as_per_aadhaar: params.secondParty.name,
                        last_four_digits_of_aadhaar: aadhaarLast4
                    },
                    trigger_esign_request: 'true'
                },
                // ============ SIGNER 2: First Party (Company - Signs SECOND via email) ============
                {
                    document_to_be_signed: docRefId,
                    signer_position: {
                        appearance: 'bottom-right'  // Company signs on bottom-right
                    },
                    signer_ref_id: `signer_company_${Date.now()}`,
                    signer_email: params.firstParty?.email || 'info@graphsensesolutions.com',
                    signer_name: params.firstParty?.name || config.firstParty.name,
                    signer_mobile: params.firstParty?.mobile || '9860023457',
                    sequence: '2',  // Signs SECOND (after user)
                    page_number: 'all',
                    signature_type: 'aadhaar',
                    authentication_mode: 'email',  // Receives signing link via email
                    trigger_esign_request: 'true'
                }
            ];

            // Build E-Sign payload
            const payload = {
                reference_id: referenceId,
                expiry_date: this.getExpiryDate(30),
                documents: [{
                    reference_doc_id: docRefId,
                    content_type: 'pdf',
                    content: params.documentContent,
                    signature_sequence: 'sequential',  // Sequential: User first, Company second
                    // Redirect URL after signing - user will be redirected here
                    // Must include token for session restoration
                    return_url: params.returnUrl || 'http://localhost:3007/onboarding?signed=true'
                }],
                signers_info: signersInfo
            };

            logger.info('[E-Sign] Initiating for Individual:', {
                referenceId,
                secondParty: params.secondParty.name,
                firstParty: signersInfo[1].signer_name
            });

            logger.debug('[E-Sign] Request payload (signers):', JSON.stringify(signersInfo, null, 2));

            const response = await axios.post(
                `${this.baseUrl}/signRequest`,
                payload,
                { headers: this.getHeaders(), timeout: 60000 }
            );

            logger.info('[E-Sign] Response received:', {
                referenceId,
                status: response.data.status,
                docketId: response.data.docket_id
            });

            if (response.data.status === 'success') {
                const signerInfo = response.data.signer_info || [];

                // First signer (user) gets the immediate signing URL
                const userSignerInfo = signerInfo[0] || {};
                const companySignerInfo = signerInfo[1] || {};

                logger.info('[E-Sign] SUCCESS - Signing initiated:', {
                    docketId: response.data.docket_id,
                    userSigningUrl: userSignerInfo.invitation_link ? 'Available' : 'Not available'
                });

                return {
                    success: true,
                    referenceId,
                    docketId: response.data.docket_id,
                    // User's signing URL (for immediate use in workflow)
                    signingUrl: userSignerInfo.invitation_link || null,
                    // Company receives signing link via email after user signs
                    companySignerEmail: signersInfo[1].signer_email,
                    signerInfo: signerInfo,
                    rawResponse: response.data
                };
            }

            logger.warn('[E-Sign] FAILED:', response.data.error || response.data.message);
            return {
                success: false,
                error: response.data.error || response.data.message || 'E-Sign failed',
                rawResponse: response.data
            };
        } catch (error) {
            logger.error('[E-Sign] Error:', {
                message: error.response?.data?.message || error.message,
                code: error.response?.data?.error_code,
                details: error.response?.data
            });
            return {
                success: false,
                error: error.response?.data?.error || error.response?.data?.message || error.message,
                errorCode: error.response?.data?.error_code,
                rawError: error.response?.data
            };
        }
    }

    // Alias for backward compatibility
    async initiateSign(params) {
        // Convert old format to new format
        if (params.signers && Array.isArray(params.signers)) {
            // Old format with signers array
            const secondParty = params.signers[0] || {};
            const firstParty = params.signers[1] || {};
            return this.initiateSignIndividual({
                documentContent: params.documentContent,
                secondParty: {
                    name: secondParty.name,
                    email: secondParty.email,
                    mobile: secondParty.mobile,
                    dob: secondParty.dob,
                    gender: secondParty.gender,
                    aadhaarLast4: secondParty.aadhaarLast4
                },
                firstParty: {
                    name: firstParty.name,
                    email: firstParty.email,
                    mobile: firstParty.mobile
                }
            });
        }
        return this.initiateSignIndividual(params);
    }
}

module.exports = new EsignApi();
