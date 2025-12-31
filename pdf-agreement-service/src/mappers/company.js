/**
 * Company Entity Data Mapper (Pvt Ltd / LLP / OPC)
 * Transforms v3.0 Application data → PDF fields for Company workflow
 */

const { ENTITY_TYPES, COMPANY_SUB_TYPES } = require('../config/constants');

/**
 * Map Application data to PDF fields for Company entity
 * @param {Object} application - Application model from v3.0
 * @returns {Object} - Mapped data for PDF generation
 */
function mapCompanyData(application) {
    const directors = application.directors || [];
    const signatory = directors.find(d => d.isSignatory) || directors[0] || {};
    const docs = application.documents || [];

    // Company sub-type
    const subType = application.companySubType || COMPANY_SUB_TYPES.PVT_LTD;

    // Get business address from MCA or GST
    const gstDoc = docs.find(d => d.type === 'gst');
    const businessAddress = application.registeredAddress || gstDoc?.data?.address || '';

    // Company PAN
    const panDoc = docs.find(d => d.type === 'companyPan');
    const companyPan = panDoc?.data?.pan || application.companyPan || '';

    return {
        entityType: ENTITY_TYPES.COMPANY,
        companySubType: subType,

        // Page 1 - Party Details (Company)
        date: formatDate(new Date()),
        name: application.companyName || application.name || '',
        age: '',  // Not applicable
        pan: companyPan,
        aadhaar: '',  // Not applicable
        residentialAddress: businessAddress,  // Registered address

        // Page 9 - Mail Address
        email: application.email || '',

        // Page 12 - Witnesses (directors)
        witness1Name: directors[0]?.name || '',
        witness2Name: directors[1]?.name || '',

        // Page 17 - Application Form
        passportPhoto: signatory.kyc?.faceMatchImage || application.livenessImage || '',
        applicantName: application.companyName || application.name || '',

        // DIN for Pvt Ltd/OPC, DPIN for LLP
        dinNo: (subType === COMPANY_SUB_TYPES.PVT_LTD || subType === COMPANY_SUB_TYPES.OPC)
            ? signatory.din || '' : '',
        dpinNo: subType === COMPANY_SUB_TYPES.LLP ? signatory.dpin || '' : '',

        // For status checkbox
        isLLP: subType === COMPANY_SUB_TYPES.LLP,

        // Page 18 - Business Address
        businessAddress: businessAddress,
        businessMobileNo: application.phone || '',

        // Page 18 - Directors (first 2)
        persons: directors.slice(0, 2).map(d => ({
            name: d.name || '',
            mobile: d.mobile || '',
            email: d.email || '',
            address: d.kyc?.aadhaar?.data?.address || ''
        }))
    };
}

function formatDate(date) {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

module.exports = { mapCompanyData };
