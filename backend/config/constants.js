/**
 * Application Constants
 */

// Entity Types
const ENTITY_TYPES = {
    INDIVIDUAL: 'individual',
    PROPRIETORSHIP: 'proprietorship',
    PARTNERSHIP: 'partnership',
    COMPANY: 'company'
};

// Company Sub-Types (for COMPANY entity)
const COMPANY_SUB_TYPES = {
    PVT_LTD: 'pvt_ltd',
    LLP: 'llp',
    OPC: 'opc'
};

// Application Status
const APPLICATION_STATUS = {
    LOGIN: 'login',
    KYC: 'kyc',
    BANK: 'bank',
    REFERENCES: 'references',
    DOCUMENTS: 'documents',
    AGREEMENT: 'agreement',
    COMPLETED: 'completed'
};

// Document Types (matching route keys - camelCase)
const DOCUMENT_TYPES = {
    SHOP_ACT: 'shopAct',
    GST: 'gst',
    UDYAM: 'udyam',
    BUSINESS_PAN: 'businessPan',
    PARTNERSHIP_DEED: 'partnershipDeed',
    ADDRESS_PROOF: 'addressProof',
    AOA_MOA: 'aoaMoa',
    COMPANY_PAN: 'companyPan',
    COI: 'coi'
};

// Document Verification Methods
const VERIFICATION_METHODS = {
    API_VERIFY: 'api_verify',
    UPLOAD_ONLY: 'upload_only',
    OCR_EXTRACT: 'ocr_extract'
};

// Document Status
const DOCUMENT_STATUS = {
    PENDING: 'pending',
    UPLOADED: 'uploaded',
    VERIFIED: 'verified',
    FAILED: 'failed',
    SAVED: 'saved'
};

// KYC Status
const KYC_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// Allowed File Types
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

// Allowed File Extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

module.exports = {
    ENTITY_TYPES,
    COMPANY_SUB_TYPES,
    APPLICATION_STATUS,
    DOCUMENT_TYPES,
    VERIFICATION_METHODS,
    DOCUMENT_STATUS,
    KYC_STATUS,
    ALLOWED_FILE_TYPES,
    ALLOWED_EXTENSIONS
};
