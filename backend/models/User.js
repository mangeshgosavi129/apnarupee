/**
 * User Model
 * Stores user account information (phone, email, entity type)
 */
const mongoose = require('mongoose');
const { ENTITY_TYPES } = require('../config/constants');

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true,
        match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    entityType: {
        type: String,
        enum: Object.values(ENTITY_TYPES),
        required: [true, 'Entity type is required']
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLoginAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for faster queries (phone already indexed via unique: true)
userSchema.index({ email: 1 });
userSchema.index({ entityType: 1 });

// Virtual for masking phone
userSchema.virtual('maskedPhone').get(function () {
    return this.phone.replace(/(\d{2})\d{6}(\d{2})/, '$1XXXXXX$2');
});

// Instance method to update last login
userSchema.methods.updateLastLogin = function () {
    this.lastLoginAt = new Date();
    return this.save();
};

// Static method to find by phone
userSchema.statics.findByPhone = function (phone) {
    return this.findOne({ phone });
};

module.exports = mongoose.model('User', userSchema);
