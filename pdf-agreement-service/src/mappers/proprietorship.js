/**
 * Sole Proprietorship Entity Data Mapper
 * Transforms v3.0 Application data → PDF fields for Sole Proprietorship workflow
 */

const { ENTITY_TYPES } = require('../config/constants');

/**
 * Map Application data to PDF fields for Sole Proprietorship entity
 * @param {Object} application - Application model from v3.0
 * @returns {Object} - Mapped data for PDF generation
 */
function mapProprietorshipData(application) {
    const kyc = application.kyc || {};
    const references = application.references || [];
    const docs = application.documents || [];

    // Get business address from documents (Shop Act / Udyam / GST)
    const businessDoc = docs.find(d => ['shopAct', 'udyam', 'gst'].includes(d.type));
    const businessAddress = businessDoc?.data?.address || application.businessAddress || '';

    return {
        entityType: ENTITY_TYPES.PROPRIETORSHIP,

        // Page 1 - Party Details
        date: formatDate(new Date()),
        name: kyc.aadhaar?.data?.name || application.name || '',
        age: calculateAge(kyc.aadhaar?.data?.dob),
        pan: kyc.pan?.number || '',
        aadhaar: formatAadhaar(kyc.aadhaar?.maskedNumber || ''),
        residentialAddress: kyc.aadhaar?.data?.address || '',

        // Page 9 - Mail Address
        email: application.email || '',

        // Page 12 - Witnesses
        witness1Name: references[0]?.name || '',
        witness2Name: references[1]?.name || '',

        // Page 17 - Application Form
        passportPhoto: application.faceMatchImage || application.livenessImage || '',
        applicantName: kyc.aadhaar?.data?.name || application.name || '',
        aadhaarNo: formatAadhaar(kyc.aadhaar?.maskedNumber || ''),

        // Page 18 - Business Address
        businessAddress: businessAddress,
        businessMobileNo: application.phone || '',

        // Page 18 - References
        persons: references.slice(0, 2).map(ref => ({
            name: ref.name || '',
            mobile: ref.mobile || '',
            email: ref.email || '',
            address: ref.address || ''
        }))
    };
}

function formatDate(date) {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function calculateAge(dob) {
    if (!dob) {
        logger.warn('[AgeCalc] Step 1 failed: DOB missing or empty');
        return '';
    }
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) {
        logger.warn('[AgeCalc] Step 2 failed: Invalid DOB format', {
            dobPreview: String(dob).slice(0, 10)
        });
        return '';
    }
    const today = new Date();
    if (birthDate > today) {
        logger.warn('[AgeCalc] Step 3 failed: DOB is in the future', {birthYear: birthDate.getFullYear()});
        return '';
    }
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
        logger.debug('[AgeCalc] Step 4 adjustment: Birthday not yet occurred this year');
    }
    logger.debug('[AgeCalc] Step 5: Final validation', {computedAge: age});
    if (age < 0) {
        logger.error('[AgeCalc] Step 5 failed: Computed negative age', {computedAge: age});
        return '';
    }
    logger.info('[AgeCalc] Success: Age calculated', {age});
    return String(age);
}

function formatAadhaar(aadhaar) {
    const clean = String(aadhaar).replace(/\D/g, '');
    if (clean.length !== 12) return aadhaar;
    return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)}`;
}

module.exports = { mapProprietorshipData };
