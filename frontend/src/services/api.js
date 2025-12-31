/**
 * API Service - Axios wrapper for backend API calls
 */
import axios from 'axios';
import useApplicationStore from '../store/applicationStore';

// Create axios instance
const api = axios.create({
    baseURL: '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor - add auth token and entityType
api.interceptors.request.use(
    (config) => {
        const state = useApplicationStore.getState();
        if (state.token) {
            config.headers.Authorization = `Bearer ${state.token}`;
        }
        // Send entityType from frontend store as header for document config
        if (state.entityType) {
            config.headers['X-Entity-Type'] = state.entityType;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const message = error.response?.data?.error || error.message || 'An error occurred';

        // Handle 401 Unauthorized - logout
        if (error.response?.status === 401) {
            useApplicationStore.getState().logout();
            window.location.href = '/';
        }

        return Promise.reject(new Error(message));
    }
);

// ==================== Auth API ====================

export const authApi = {
    sendOtp: (data) => api.post('/auth/send-otp', data),
    verifyOtp: (data) => api.post('/auth/verify-otp', data),
    resendOtp: (phone) => api.post('/auth/resend-otp', { phone })
};

// ==================== Application API ====================

export const applicationApi = {
    get: () => api.get('/application'),
    getById: (id) => api.get(`/application/${id}`),
    updateStatus: (data) => api.patch('/application/status', data),
    getProgress: () => api.get('/application/progress/summary')
};

// ==================== KYC API ====================

export const kycApi = {
    // DigiLocker SDK
    createDigilockerSession: (flow = 'signin', docTypes = ['aadhaar', 'pan']) =>
        api.post('/kyc/digilocker/create-session', { flow, docTypes }),
    getDigilockerStatus: (sessionId) =>
        api.get(`/kyc/digilocker/status/${sessionId}`),
    fetchDigilockerDocuments: (sessionId, docTypes = ['aadhaar', 'pan']) =>
        api.post('/kyc/digilocker/fetch-documents', { sessionId, docTypes }),

    // Aadhaar OKYC
    sendAadhaarOtp: (aadhaar) => api.post('/kyc/aadhaar/send-otp', { aadhaar }),
    verifyAadhaarOtp: (data) => api.post('/kyc/aadhaar/verify-otp', data),

    // PAN
    verifyPan: (pan) => api.post('/kyc/pan/verify', { pan }),
    checkPanAadhaarLink: (aadhaar) => api.post('/kyc/pan-aadhaar-link', { aadhaar }),

    // Selfie Photo (replaces Face Liveness/Compare)
    uploadSelfie: (image) => api.post('/kyc/selfie', { image }),
    getSelfieStatus: () => api.get('/kyc/selfie'),

    // Face (Legacy - kept for backward compatibility)
    checkLiveness: (image) => api.post('/kyc/face/liveness', { image }),
    compareFaces: (selfie, aadhaarPhoto) => api.post('/kyc/face/compare', { selfie, aadhaarPhoto }),
    getTaskResult: (requestId) => api.get(`/kyc/task/${requestId}`),

    // Sync all KYC
    sync: () => api.get('/kyc/sync')
};

// ==================== Bank API ====================

export const bankApi = {
    verifyIfsc: (ifsc) => api.post('/bank/verify-ifsc', { ifsc }),
    verifyAccount: (data) => api.post('/bank/verify', data),
    getStatus: () => api.get('/bank/status')
};

// ==================== References API ====================

export const referencesApi = {
    save: (references) => api.post('/references', { references }),
    get: () => api.get('/references')
};

// ==================== Documents API ====================

export const documentsApi = {
    // Get document config for entity type
    getConfig: () => api.get('/documents/config'),

    // List all documents
    list: () => api.get('/documents'),

    // Upload document
    upload: (type, file) => {
        const formData = new FormData();
        formData.append('type', type);
        formData.append('file', file);
        return api.post('/documents/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // Get document file URL with token for new tab viewing
    getFile: (type) => {
        const token = useApplicationStore.getState().token;
        return `/api/documents/file/${type}?token=${token}`;
    },

    // Delete document
    delete: (type) => api.delete(`/documents/${type}`),

    // Validate mandatory documents
    validate: () => api.get('/documents/validate'),

    // Legacy verify endpoints (for future API verification)
    verifyGstin: (gstin) => api.post('/documents/gst/verify', { gstin }),
    verifyUdyam: (uamNumber) => api.post('/documents/udyam/verify', { uamNumber })
};

// ==================== Agreement API ====================

export const agreementApi = {
    generate: () => api.post('/agreement/generate'),
    estamp: () => api.post('/agreement/estamp'),
    esign: () => api.post('/agreement/esign'),
    getStatus: () => api.get('/agreement/status'),
    download: (type) => api.get(`/agreement/download/${type}`, { responseType: 'blob' }),
    // Called when user returns from E-Sign after completing their signature
    markSigned: () => api.post('/agreement/mark-signed')
};

// ==================== Partners API (for Partnership) ====================

export const partnersApi = {
    list: () => api.get('/partners'),
    add: (data) => api.post('/partners', data),
    update: (id, data) => api.put(`/partners/${id}`, data),
    remove: (id) => api.delete(`/partners/${id}`),
    setSignatory: (id) => api.patch(`/partners/${id}/signatory`),
    validate: () => api.get('/partners/validate'),

    // Partner KYC
    sendAadhaarOtp: (partnerId, aadhaarNumber) =>
        api.post(`/partner-kyc/${partnerId}/aadhaar/send-otp`, { aadhaarNumber }),
    verifyAadhaarOtp: (partnerId, data) =>
        api.post(`/partner-kyc/${partnerId}/aadhaar/verify-otp`, data),
    verifyPan: (partnerId, panNumber) =>
        api.post(`/partner-kyc/${partnerId}/pan/verify`, { panNumber }),
    captureSelfie: (partnerId, image) =>
        api.post(`/partner-kyc/${partnerId}/selfie`, { image }),
    getKycStatus: (partnerId) =>
        api.get(`/partner-kyc/${partnerId}/status`)
};

export default api;

