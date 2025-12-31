/**
 * Individual Entity Validators
 * Joi schemas for data validation
 */
const Joi = require('joi');

// ==================== Format Validators ====================

// PAN: 5 letters + 4 digits + 1 letter (uppercase)
const panSchema = Joi.string()
    .uppercase()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .messages({
        'string.pattern.base': 'Invalid PAN format. Expected: ABCDE1234F',
        'string.empty': 'PAN is required'
    });

// Aadhaar: 12 digits (spaces/dashes removed)
const aadhaarSchema = Joi.string()
    .pattern(/^\d{12}$/)
    .messages({
        'string.pattern.base': 'Aadhaar must be exactly 12 digits',
        'string.empty': 'Aadhaar is required'
    });

// Mobile: 10 digits starting with 6-9
const mobileSchema = Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .messages({
        'string.pattern.base': 'Invalid mobile number. Must be 10 digits starting with 6-9',
        'string.empty': 'Mobile number is required'
    });

// Email
const emailSchema = Joi.string()
    .email({ tlds: { allow: false } })
    .messages({
        'string.email': 'Invalid email format',
        'string.empty': 'Email is required'
    });

// IFSC: 4 letters + 0 + 6 alphanumeric
const ifscSchema = Joi.string()
    .uppercase()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .messages({
        'string.pattern.base': 'Invalid IFSC code. Expected format: ABCD0123456',
        'string.empty': 'IFSC code is required'
    });

// Bank Account Number: 9-18 digits
const accountNumberSchema = Joi.string()
    .pattern(/^\d{9,18}$/)
    .messages({
        'string.pattern.base': 'Account number must be 9-18 digits',
        'string.empty': 'Account number is required'
    });

// Pincode: 6 digits
const pincodeSchema = Joi.string()
    .pattern(/^\d{6}$/)
    .messages({
        'string.pattern.base': 'Pincode must be exactly 6 digits'
    });

// ==================== Composite Schemas ====================

// Bank Details
const bankDetailsSchema = Joi.object({
    ifsc: ifscSchema.required(),
    accountNumber: accountNumberSchema.required(),
    accountHolderName: Joi.string().min(3).max(100).required().messages({
        'string.min': 'Account holder name must be at least 3 characters',
        'string.empty': 'Account holder name is required'
    }),
    bankName: Joi.string().optional(),
    branchName: Joi.string().optional()
});

// Reference
const referenceSchema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Reference name must be at least 2 characters',
        'string.empty': 'Reference name is required'
    }),
    phone: mobileSchema.required(),
    email: emailSchema.required(),
    address: Joi.string().min(10).max(500).required().messages({
        'string.min': 'Reference address must be at least 10 characters',
        'string.empty': 'Reference address is required'
    }),
    relation: Joi.string().valid('family', 'friend', 'colleague', 'business', 'other').required()
});

// References Array (2 required)
const referencesArraySchema = Joi.array()
    .items(referenceSchema)
    .min(2)
    .max(5)
    .messages({
        'array.min': 'At least 2 references are required'
    });

// ==================== Cross-Validation Functions ====================

/**
 * Parse DOB from various formats
 * Handles: "30-01-1999", "1999-01-30", "30/01/1999"
 */
function parseDob(dobString) {
    if (!dobString) return null;

    // Try DD-MM-YYYY or DD/MM/YYYY
    const ddmmyyyy = dobString.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (ddmmyyyy) {
        return new Date(ddmmyyyy[3], ddmmyyyy[2] - 1, ddmmyyyy[1]);
    }

    // Try YYYY-MM-DD
    const yyyymmdd = dobString.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
    if (yyyymmdd) {
        return new Date(yyyymmdd[1], yyyymmdd[2] - 1, yyyymmdd[3]);
    }

    return new Date(dobString);
}

/**
 * Calculate age from DOB
 */
function calculateAge(dob) {
    if (!dob || isNaN(dob.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    return age;
}

/**
 * Validate age is 18+
 */
function validateAge(dobString) {
    const dob = parseDob(dobString);
    if (!dob) {
        return { valid: false, error: 'Invalid date of birth format' };
    }

    const age = calculateAge(dob);
    if (age === null) {
        return { valid: false, error: 'Could not calculate age' };
    }

    if (age < 18) {
        return { valid: false, error: `Applicant must be 18+ years old (current age: ${age})` };
    }

    if (age > 100) {
        return { valid: false, error: 'Invalid date of birth (age > 100)' };
    }

    return { valid: true, age };
}

/**
 * Convert DOB from Aadhaar format (DD-MM-YYYY) to PAN API format (DD/MM/YYYY)
 * Also handles YYYY-MM-DD format
 */
function formatDobForPan(dobString) {
    if (!dobString) return '01/01/1990'; // Fallback for missing DOB

    // If already in DD/MM/YYYY format, return as-is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dobString)) {
        return dobString;
    }

    // Convert DD-MM-YYYY to DD/MM/YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(dobString)) {
        return dobString.replace(/-/g, '/');
    }

    // Convert YYYY-MM-DD to DD/MM/YYYY
    const yyyymmdd = dobString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmdd) {
        return `${yyyymmdd[3]}/${yyyymmdd[2]}/${yyyymmdd[1]}`;
    }

    return '01/01/1990'; // Fallback
}

/**
 * Calculate string similarity (Levenshtein-based)
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    // Normalize: uppercase, remove extra spaces
    const s1 = str1.toUpperCase().trim().replace(/\s+/g, ' ');
    const s2 = str2.toUpperCase().trim().replace(/\s+/g, ' ');

    if (s1 === s2) return 1;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    // Simple word-based matching
    const words1 = s1.split(' ');
    const words2 = s2.split(' ');

    let matches = 0;
    words1.forEach(w1 => {
        if (words2.some(w2 => w2 === w1 || w2.includes(w1) || w1.includes(w2))) {
            matches++;
        }
    });

    return matches / Math.max(words1.length, words2.length);
}

/**
 * Validate name match between PAN and Aadhaar
 */
function validateNameMatch(panName, aadhaarName) {
    if (!panName || !aadhaarName) {
        return { valid: true, warning: 'Name comparison skipped (missing data)' };
    }

    const similarity = calculateSimilarity(panName, aadhaarName);

    if (similarity < 0.5) {
        return {
            valid: false,
            error: `Name mismatch: PAN "${panName}" vs Aadhaar "${aadhaarName}"`,
            similarity
        };
    }

    if (similarity < 0.8) {
        return {
            valid: true,
            warning: `Names partially match (${Math.round(similarity * 100)}%): "${panName}" vs "${aadhaarName}"`,
            similarity
        };
    }

    return { valid: true, similarity };
}

/**
 * Validate references (no duplicates, not self)
 */
function validateReferences(references, userPhone) {
    if (!references || references.length < 2) {
        return { valid: false, error: 'At least 2 references are required' };
    }

    // Normalize phone numbers - check both 'phone' and 'mobile' fields
    const normalizePhone = (phone) => phone?.replace(/\D/g, '').slice(-10) || '';
    const userPhoneNorm = normalizePhone(userPhone);

    // Support both 'phone' and 'mobile' field names
    const phones = references.map(r => normalizePhone(r.phone || r.mobile));
    const emails = references.map(r => r.email?.toLowerCase());

    // Filter out empty phones before checking uniqueness
    const validPhones = phones.filter(p => p && p.length > 0);

    // Check for duplicate phones (only if we have phones)
    if (validPhones.length > 0) {
        const uniquePhones = new Set(validPhones);
        if (uniquePhones.size !== validPhones.length) {
            return { valid: false, error: 'Reference phone numbers must be unique' };
        }
    }

    // Check for duplicate emails
    const validEmails = emails.filter(e => e && e.length > 0);
    if (validEmails.length > 0) {
        const uniqueEmails = new Set(validEmails);
        if (uniqueEmails.size !== validEmails.length) {
            return { valid: false, error: 'Reference email addresses must be unique' };
        }
    }

    // Check if user's phone is used as reference
    if (userPhoneNorm && validPhones.includes(userPhoneNorm)) {
        return { valid: false, error: 'Cannot use your own phone number as reference' };
    }

    return { valid: true };
}

// ==================== Validation Middleware ====================

/**
 * Create validation middleware from Joi schema
 */
function validate(schema, source = 'body') {
    return (req, res, next) => {
        const data = source === 'body' ? req.body :
            source === 'params' ? req.params :
                req.query;

        const { error, value } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(d => ({
                field: d.path.join('.'),
                message: d.message
            }));

            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                validationErrors: errors
            });
        }

        // Replace with validated/sanitized values
        if (source === 'body') req.body = value;
        else if (source === 'params') req.params = value;
        else req.query = value;

        next();
    };
}

// ==================== Exports ====================

module.exports = {
    // Schemas
    panSchema,
    aadhaarSchema,
    mobileSchema,
    emailSchema,
    ifscSchema,
    accountNumberSchema,
    pincodeSchema,
    bankDetailsSchema,
    referenceSchema,
    referencesArraySchema,

    // Cross-validation
    parseDob,
    calculateAge,
    validateAge,
    formatDobForPan,
    calculateSimilarity,
    validateNameMatch,
    validateReferences,

    // Middleware
    validate
};
