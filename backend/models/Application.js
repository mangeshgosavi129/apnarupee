/**
 * Application Model
 * Stores the complete DSA onboarding application data
 */
const mongoose = require('mongoose');
const {
    ENTITY_TYPES,
    COMPANY_SUB_TYPES,
    APPLICATION_STATUS,
    DOCUMENT_TYPES,
    VERIFICATION_METHODS,
    DOCUMENT_STATUS,
    KYC_STATUS
} = require('../config/constants');

// Partner/Director Schema (embedded)
const stakeholderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    isSignatory: { type: Boolean, default: false },
    din: String,     // For Pvt Ltd Directors
    dpin: String,    // For LLP Designated Partners
    kyc: {
        aadhaar: {
            verified: { type: Boolean, default: false },
            maskedNumber: String,
            data: mongoose.Schema.Types.Mixed,
            photo: String,  // Base64 or path
            verifiedAt: Date
        },
        pan: {
            verified: { type: Boolean, default: false },
            number: String,
            data: mongoose.Schema.Types.Mixed,
            verifiedAt: Date
        },
        panAadhaarLinked: { type: Boolean, default: null },
        // Live selfie photo for agreement embedding
        selfiePhoto: {
            captured: { type: Boolean, default: false },
            image: String,  // Base64 image data
            capturedAt: Date
        },
        // Legacy fields (deprecated)
        liveness: {
            verified: { type: Boolean, default: false },
            isLive: Boolean,
            score: Number,
            verifiedAt: Date
        },
        faceMatch: {
            verified: { type: Boolean, default: false },
            isMatch: Boolean,
            score: Number,
            verifiedAt: Date
        }
    }
}, { _id: true });

// Document Schema (embedded)
const documentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: Object.values(DOCUMENT_TYPES),
        required: true
    },
    method: {
        type: String,
        enum: Object.values(VERIFICATION_METHODS)
    },
    status: {
        type: String,
        enum: Object.values(DOCUMENT_STATUS),
        default: DOCUMENT_STATUS.PENDING
    },
    // API verification data
    apiData: mongoose.Schema.Types.Mixed,
    apiVerifiedAt: Date,
    // File upload data
    filePath: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: Date
}, { _id: true, timestamps: true });

// Reference Schema (embedded)
const referenceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: String,
    address: String
}, { _id: true });

// Main Application Schema
const applicationSchema = new mongoose.Schema({
    // Application ID (human readable) - auto-generated in pre-save
    applicationId: {
        type: String,
        unique: true,
        sparse: true  // Allows null before save
    },

    // User reference
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Entity Type
    entityType: {
        type: String,
        enum: Object.values(ENTITY_TYPES),
        required: true
    },
    companySubType: {
        type: String,
        enum: Object.values(COMPANY_SUB_TYPES)
    },

    // Application Status
    status: {
        type: String,
        enum: Object.values(APPLICATION_STATUS),
        default: APPLICATION_STATUS.LOGIN
    },
    currentStep: {
        type: Number,
        default: 0
    },

    // Individual/Proprietor KYC (main applicant)
    kyc: {
        aadhaar: {
            verified: { type: Boolean, default: false },
            maskedNumber: String,
            data: mongoose.Schema.Types.Mixed,
            photo: String,
            verifiedAt: Date
        },
        pan: {
            verified: { type: Boolean, default: false },
            number: String,
            data: mongoose.Schema.Types.Mixed,
            verifiedAt: Date
        },
        panAadhaarLinked: { type: Boolean, default: null },
        panAadhaarLinkData: mongoose.Schema.Types.Mixed,
        // Live selfie photo for agreement embedding
        selfiePhoto: {
            captured: { type: Boolean, default: false },
            image: String,  // Base64 image data
            capturedAt: Date
        },
        // Legacy fields (deprecated - keeping for backward compatibility)
        liveness: {
            verified: { type: Boolean, default: false },
            isLive: Boolean,
            score: Number,
            requestId: String,
            verifiedAt: Date
        },
        faceMatch: {
            verified: { type: Boolean, default: false },
            isMatch: Boolean,
            score: Number,
            requestId: String,
            verifiedAt: Date
        },
        status: {
            type: String,
            enum: Object.values(KYC_STATUS),
            default: KYC_STATUS.PENDING
        }
    },

    // Business Info (for non-individual)
    business: {
        name: String,          // Firm/Company name
        pan: String,           // Business PAN
        gst: String,           // GSTIN
        cin: String,           // CIN for Pvt Ltd
        llpin: String,         // LLPIN for LLP
        udyam: String,         // Udyam number
        registeredAddress: String,
        businessAddress: String
    },

    // Company Info (MCA-verified for Company/LLP)
    company: {
        verified: { type: Boolean, default: false },
        type: { type: String, enum: ['pvt_ltd', 'llp', 'opc'] },
        cin: String,           // For Pvt Ltd/OPC
        llpin: String,         // For LLP
        name: String,
        registeredAddress: String,
        dateOfIncorporation: String,
        email: String,
        status: String,        // Active, Inactive, etc.
        rocCode: String,
        classOfCompany: String,
        category: String,
        pan: {
            number: String,
            uploaded: { type: Boolean, default: false },
            uploadedAt: Date
        },
        verifiedAt: Date
    },

    // Bank Verification
    bank: {
        verified: { type: Boolean, default: false },
        accountNumber: String,
        ifsc: String,
        bankName: String,
        branchName: String,
        holderName: String,
        method: String,                // penny_drop, penny_less (legacy)
        verificationMethod: String,    // 'penny' or 'penniless'
        utr: String,                   // UTR from penny drop
        amountDeposited: String,       // Amount deposited for penny drop
        message: String,               // API response message
        // Manual review flags
        requiresManualReview: { type: Boolean, default: false },
        manualReviewReason: String,
        nameMismatch: { type: Boolean, default: false },
        mismatchDetails: mongoose.Schema.Types.Mixed,
        verifiedAt: Date
    },

    // References (2 people)
    references: [referenceSchema],

    // Partners (for Partnership)
    partners: [stakeholderSchema],

    // Directors (for Company/LLP)
    directors: [stakeholderSchema],

    // Documents
    documents: [documentSchema],

    // Agreement
    agreement: {
        pdfPath: String,
        pdfGeneratedAt: Date,
        // E-Stamp fields
        estampRequestId: String,
        estampTransactionId: String,
        stampPaperNumber: mongoose.Schema.Types.Mixed, // Array from API
        stampedContent: String, // Base64 stamped PDF - passed to E-Sign
        estampStatus: String,
        estampedAt: Date,
        estampError: String,
        // E-Sign fields
        esignRequestId: String,
        esignDocketId: String,
        signingUrl: String,
        companySignerEmail: String,
        esignStatus: String,
        signedPdfPath: String,
        esignedAt: Date,
        esignError: String
    },

    // Metadata
    completedAt: Date,
    submittedAt: Date

}, {
    timestamps: true
});

// Indexes (applicationId already indexed via unique: true)
applicationSchema.index({ userId: 1 });
applicationSchema.index({ entityType: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ createdAt: -1 });

// Pre-save hook to generate applicationId
applicationSchema.pre('save', async function (next) {
    if (this.isNew && !this.applicationId) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments();
        this.applicationId = `DSA-${year}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

// Instance methods
applicationSchema.methods.updateStatus = function (status) {
    this.status = status;
    if (status === APPLICATION_STATUS.COMPLETED) {
        this.completedAt = new Date();
    }
    return this.save();
};

applicationSchema.methods.getSignatory = function () {
    if (this.entityType === ENTITY_TYPES.PARTNERSHIP) {
        return this.partners.find(p => p.isSignatory);
    }
    if (this.entityType === ENTITY_TYPES.COMPANY) {
        return this.directors.find(d => d.isSignatory);
    }
    return null;
};

// Static methods
applicationSchema.statics.findByAppId = function (applicationId) {
    return this.findOne({ applicationId });
};

applicationSchema.statics.findByUser = function (userId) {
    return this.find({ userId }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Application', applicationSchema);
