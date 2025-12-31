/**
 * Application Store - Zustand State Management
 * Manages all application state with localStorage persistence
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useApplicationStore = create(
    persist(
        (set, get) => ({
            // ==================== Auth State ====================
            user: null,
            token: null,
            isAuthenticated: false,

            // ==================== Application State ====================
            entityType: null,
            currentStep: 0,
            applicationId: null,
            applicationData: null,

            // ==================== KYC State ====================
            kyc: {
                aadhaar: null,
                pan: null,
                panAadhaarLinked: null,
                liveness: null,
                faceMatch: null,
                status: 'pending'
            },

            // ==================== Other Data ====================
            bank: null,
            references: [],
            partners: [],
            directors: [],
            documents: [],

            // ==================== UI State ====================
            loading: false,
            error: null,

            // ==================== Actions ====================

            // Auth Actions
            setAuth: (user, token) => set({
                user,
                token,
                isAuthenticated: !!token
            }),

            logout: () => set({
                user: null,
                token: null,
                isAuthenticated: false,
                entityType: null,
                currentStep: 0,
                applicationId: null,
                applicationData: null,
                kyc: {
                    aadhaar: null,
                    pan: null,
                    panAadhaarLinked: null,
                    liveness: null,
                    faceMatch: null,
                    status: 'pending'
                },
                bank: null,
                references: [],
                partners: [],
                directors: [],
                documents: []
            }),

            // Entity Actions
            setEntityType: (type) => set({ entityType: type }),

            // Step Navigation
            setStep: (step) => set({ currentStep: step }),
            nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
            prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),

            // Application Data
            setApplicationId: (id) => set({ applicationId: id }),
            setApplicationData: (data) => set({ applicationData: data }),

            // KYC Actions
            updateKyc: (data) => set((state) => ({
                kyc: { ...state.kyc, ...data }
            })),

            // Bank Actions
            setBank: (data) => set({ bank: data }),

            // Reference Actions
            addReference: (ref) => set((state) => ({
                references: [...state.references, ref]
            })),
            updateReference: (index, ref) => set((state) => ({
                references: state.references.map((r, i) => i === index ? ref : r)
            })),
            removeReference: (index) => set((state) => ({
                references: state.references.filter((_, i) => i !== index)
            })),

            // Partner Actions (for Partnership)
            addPartner: (partner) => set((state) => ({
                partners: [...state.partners, partner]
            })),
            updatePartner: (index, partner) => set((state) => ({
                partners: state.partners.map((p, i) => i === index ? partner : p)
            })),
            removePartner: (index) => set((state) => ({
                partners: state.partners.filter((_, i) => i !== index)
            })),
            setSignatoryPartner: (index) => set((state) => ({
                partners: state.partners.map((p, i) => ({ ...p, isSignatory: i === index }))
            })),

            // Director Actions (for Company)
            addDirector: (director) => set((state) => ({
                directors: [...state.directors, director]
            })),
            setDirectors: (directors) => set({ directors }),
            setSignatoryDirector: (index) => set((state) => ({
                directors: state.directors.map((d, i) => ({ ...d, isSignatory: i === index }))
            })),

            // Document Actions
            addDocument: (doc) => set((state) => ({
                documents: [...state.documents, doc]
            })),
            updateDocument: (type, data) => set((state) => ({
                documents: state.documents.map(d => d.type === type ? { ...d, ...data } : d)
            })),

            // UI Actions
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),
            clearError: () => set({ error: null }),

            // Restore state from API
            restoreFromApi: (data) => set({
                applicationId: data.applicationId,
                applicationData: data,
                entityType: data.entityType,
                currentStep: data.currentStep || 0,
                kyc: data.kyc || get().kyc,
                bank: data.bank,
                references: data.references || [],
                partners: data.partners || [],
                directors: data.directors || [],
                documents: data.documents || []
            })
        }),
        {
            name: 'dsa-application-store',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
                entityType: state.entityType,
                currentStep: state.currentStep,
                applicationId: state.applicationId
            })
        }
    )
);

export default useApplicationStore;
