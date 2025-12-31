/**
 * Partnership Firm Entity Data Mapper
 * Transforms v3.0 Application data → PDF fields for Partnership workflow
 */

const { ENTITY_TYPES } = require('../config/constants');

/**
 * Map Application data to PDF fields for Partnership entity
 * @param {Object} application - Application model from v3.0
 * @returns {Object} - Mapped data for PDF generation
 */
function mapPartnershipData(application) {
    const partners = application.partners || [];
    const signatory = partners.find(p => p.isSignatory) || partners[0] || {};
    const docs = application.documents || [];

    // Get business address from docs
    const gstDoc = docs.find(d => d.type === 'gst');
    const businessAddress = gstDoc?.data?.address || application.businessAddress || '';

    // Firm PAN from documents
    const panDoc = docs.find(d => d.type === 'businessPan');
    const firmPan = panDoc?.data?.pan || application.firmPan || '';

    return {
        entityType: ENTITY_TYPES.PARTNERSHIP,

        // Page 1 - Party Details (Firm)
        date: formatDate(new Date()),
        name: application.firmName || application.name || '',
        age: '',  // Not applicable for firms
        pan: firmPan,
        aadhaar: '',  // Not applicable for firms
        residentialAddress: businessAddress,  // Use business address

        // Page 9 - Mail Address
        email: application.email || '',

        // Page 12 - Witnesses (partners)
        witness1Name: partners[0]?.name || '',
        witness2Name: partners[1]?.name || '',

        // Page 17 - Application Form
        passportPhoto: signatory.kyc?.faceMatchImage || application.livenessImage || '',
        applicantName: application.firmName || application.name || '',
        // No Aadhaar, DIN, DPIN for partnership

        // Page 18 - Business Address
        businessAddress: businessAddress,
        businessMobileNo: application.phone || '',

        // Page 18 - Partners (first 2)
        persons: partners.slice(0, 2).map(p => ({
            name: p.name || '',
            mobile: p.mobile || '',
            email: p.email || '',
            address: p.kyc?.aadhaar?.data?.address || ''
        }))
    };
}

function formatDate(date) {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

module.exports = { mapPartnershipData };
