/**
 * Frontend Validation Utilities
 * Format validators for Individual entity
 */

// ==================== Format Validators ====================

/**
 * Validate PAN format: ABCDE1234F
 */
export const validatePan = (pan) => {
    if (!pan) return { valid: false, error: 'PAN is required' };
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan.toUpperCase())) {
        return { valid: false, error: 'Invalid PAN format (e.g., ABCDE1234F)' };
    }
    return { valid: true };
};

/**
 * Validate Aadhaar format: 12 digits
 */
export const validateAadhaar = (aadhaar) => {
    if (!aadhaar) return { valid: false, error: 'Aadhaar is required' };
    const cleaned = aadhaar.replace(/\s/g, '');
    if (!/^\d{12}$/.test(cleaned)) {
        return { valid: false, error: 'Aadhaar must be exactly 12 digits' };
    }
    return { valid: true };
};

/**
 * Validate Mobile: 10 digits starting with 6-9
 */
export const validateMobile = (mobile) => {
    if (!mobile) return { valid: false, error: 'Mobile is required' };
    const cleaned = mobile.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
        return { valid: false, error: 'Mobile must be 10 digits starting with 6-9' };
    }
    return { valid: true };
};

/**
 * Validate Email format
 */
export const validateEmail = (email) => {
    if (!email) return { valid: false, error: 'Email is required' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Invalid email format' };
    }
    return { valid: true };
};

/**
 * Validate IFSC: ABCD0123456
 */
export const validateIfsc = (ifsc) => {
    if (!ifsc) return { valid: false, error: 'IFSC is required' };
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc.toUpperCase())) {
        return { valid: false, error: 'Invalid IFSC format (e.g., SBIN0001234)' };
    }
    return { valid: true };
};

/**
 * Validate Bank Account Number: 9-18 digits
 */
export const validateAccountNumber = (accNo) => {
    if (!accNo) return { valid: false, error: 'Account number is required' };
    if (!/^\d{9,18}$/.test(accNo)) {
        return { valid: false, error: 'Account number must be 9-18 digits' };
    }
    return { valid: true };
};

/**
 * Validate Pincode: 6 digits
 */
export const validatePincode = (pincode) => {
    if (!pincode) return { valid: false, error: 'Pincode is required' };
    if (!/^\d{6}$/.test(pincode)) {
        return { valid: false, error: 'Pincode must be exactly 6 digits' };
    }
    return { valid: true };
};

/**
 * Validate Name: 2-100 characters
 */
export const validateName = (name, label = 'Name') => {
    if (!name) return { valid: false, error: `${label} is required` };
    if (name.trim().length < 2) {
        return { valid: false, error: `${label} must be at least 2 characters` };
    }
    if (name.trim().length > 100) {
        return { valid: false, error: `${label} must be less than 100 characters` };
    }
    return { valid: true };
};

/**
 * Validate Address: 10-500 characters
 */
export const validateAddress = (address, label = 'Address') => {
    if (!address) return { valid: false, error: `${label} is required` };
    if (address.trim().length < 10) {
        return { valid: false, error: `${label} must be at least 10 characters` };
    }
    if (address.trim().length > 500) {
        return { valid: false, error: `${label} must be less than 500 characters` };
    }
    return { valid: true };
};

// ==================== Helper for Form Fields ====================

/**
 * Get field error state for styling
 */
export const getFieldState = (value, validator) => {
    if (!value) return { touched: false, error: null };
    const result = validator(value);
    return { touched: true, error: result.valid ? null : result.error };
};

/**
 * Validate entire form
 */
export const validateForm = (fields) => {
    const errors = {};
    let isValid = true;

    Object.entries(fields).forEach(([key, { value, validator }]) => {
        const result = validator(value);
        if (!result.valid) {
            errors[key] = result.error;
            isValid = false;
        }
    });

    return { isValid, errors };
};

export default {
    validatePan,
    validateAadhaar,
    validateMobile,
    validateEmail,
    validateIfsc,
    validateAccountNumber,
    validatePincode,
    validateName,
    validateAddress,
    getFieldState,
    validateForm
};
