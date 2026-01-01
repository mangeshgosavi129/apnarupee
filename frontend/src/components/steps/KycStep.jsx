/**
 * KYC Step Component
 * Simplified 4-phase KYC: Consent → Aadhaar → PAN → Selfie Photo
 * Selfie replaces Face Liveness and Face Compare APIs
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    CheckCircle2,
    Circle,
    Loader2,
    ChevronRight,
    Fingerprint,
    CreditCard,
    Camera,
    AlertCircle,
    User,
    RefreshCw
} from 'lucide-react';
import { kycApi } from '../../services/api';
import { useApplicationStore } from '../../store/applicationStore';

// Sandbox API key for DigiLocker SDK
const SANDBOX_API_KEY = 'key_live_93d80931ac454b22a6f260c26cd845b3';

// KYC Sub-steps (with method selection)
const KYC_PHASES = {
    CONSENT: 'consent',
    METHOD_SELECT: 'method_select', // Choose DigiLocker or Aadhaar OTP
    DIGILOCKER: 'digilocker',
    AADHAAR: 'aadhaar',
    PAN: 'pan',
    SELFIE: 'selfie',
    COMPLETE: 'complete'
};

export default function KycStep({ onComplete }) {
    const { setKyc, kyc: storeKyc } = useApplicationStore();

    // State
    const [currentPhase, setCurrentPhase] = useState(KYC_PHASES.CONSENT);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Verification method selection
    const [verificationMethod, setVerificationMethod] = useState(null); // 'digilocker' or 'otp'

    // DigiLocker state
    const [digilockerSessionId, setDigilockerSessionId] = useState(null);
    const [digilockerStatus, setDigilockerStatus] = useState(null);
    const [digilockerDocumentsConsented, setDigilockerDocumentsConsented] = useState([]);

    // Aadhaar state
    const [aadhaar, setAadhaar] = useState('');
    const [aadhaarReferenceId, setAadhaarReferenceId] = useState('');
    const [aadhaarOtp, setAadhaarOtp] = useState('');
    const [aadhaarVerified, setAadhaarVerified] = useState(false);
    const [aadhaarData, setAadhaarData] = useState(null);

    // PAN state
    const [pan, setPan] = useState('');
    const [panVerified, setPanVerified] = useState(false);
    const [panData, setPanData] = useState(null);

    // Selfie state
    const [selfieImage, setSelfieImage] = useState(null);
    const [selfieCaptured, setSelfieCaptured] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);  // Store stream to properly stop tracks
    const [cameraActive, setCameraActive] = useState(false);

    // Load existing KYC data
    useEffect(() => {
        loadKycStatus();
    }, []);

    // Camera stream management - attach stream to video element when both are ready
    useEffect(() => {
        if (cameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(err => {
                console.error('Video play failed:', err);
            });
        }
    }, [cameraActive]);

    // Cleanup camera on component unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, []);

    const loadKycStatus = async () => {
        try {
            console.log('[KycStep] Loading KYC status from server...');
            const response = await kycApi.sync();
            console.log('[KycStep] Sync response:', response);

            if (response.success && response.kyc) {
                const kyc = response.kyc;
                console.log('[KycStep] KYC data:', {
                    aadhaarVerified: kyc.aadhaar?.verified,
                    panVerified: kyc.pan?.verified,
                    selfieCaptured: kyc.selfiePhoto?.captured
                });

                if (kyc.aadhaar?.verified) {
                    setAadhaarVerified(true);
                    setAadhaarData(kyc.aadhaar.data);
                }
                if (kyc.pan?.verified) {
                    setPanVerified(true);
                    setPanData(kyc.pan.data);
                }
                if (kyc.selfiePhoto?.captured) {
                    setSelfieCaptured(true);
                }

                // Determine current phase based on what's completed
                if (kyc.selfiePhoto?.captured) {
                    console.log('[KycStep] Setting phase: COMPLETE');
                    setCurrentPhase(KYC_PHASES.COMPLETE);
                } else if (kyc.pan?.verified) {
                    console.log('[KycStep] Setting phase: SELFIE');
                    setCurrentPhase(KYC_PHASES.SELFIE);
                } else if (kyc.aadhaar?.verified) {
                    console.log('[KycStep] Setting phase: PAN');
                    setCurrentPhase(KYC_PHASES.PAN);
                } else {
                    console.log('[KycStep] Setting phase: CONSENT (no progress found)');
                    setCurrentPhase(KYC_PHASES.CONSENT);
                }
            } else {
                console.warn('[KycStep] Sync failed or no KYC data:', response);
            }
        } catch (err) {
            console.error('[KycStep] Failed to load KYC status:', err.message);
            // Don't reset phase on error - keep user where they were
        }
    };

    // Phase progress indicator (simplified for user - shows main steps)
    const phases = [
        { id: KYC_PHASES.CONSENT, label: 'Consent', icon: Shield },
        { id: KYC_PHASES.METHOD_SELECT, label: 'Verify', icon: Fingerprint },
        { id: KYC_PHASES.PAN, label: 'PAN', icon: CreditCard },
        { id: KYC_PHASES.SELFIE, label: 'Photo', icon: Camera },
    ];

    const getCurrentPhaseIndex = () => {
        const phase = currentPhase;
        if (phase === KYC_PHASES.DIGILOCKER || phase === KYC_PHASES.AADHAAR) {
            return 1; // Show as "Verify" step
        }
        return phases.findIndex(p => p.id === phase);
    };

    // ==================== Consent Phase ====================
    const handleConsent = () => {
        setCurrentPhase(KYC_PHASES.METHOD_SELECT);
    };

    // ==================== Method Selection ====================
    const handleMethodSelect = (method) => {
        setVerificationMethod(method);
        setError('');
        if (method === 'digilocker') {
            launchDigilocker();
        } else {
            setCurrentPhase(KYC_PHASES.AADHAAR);
        }
    };

    // ==================== DigiLocker SDK ====================
    const launchDigilocker = async () => {
        setLoading(true);
        setError('');

        try {
            // Create session on backend
            const response = await kycApi.createDigilockerSession('signin', ['aadhaar', 'pan']);

            if (!response.success || !response.sessionId) {
                throw new Error(response.error || 'Failed to create DigiLocker session');
            }

            const sessionId = response.sessionId;
            setDigilockerSessionId(sessionId);
            setCurrentPhase(KYC_PHASES.DIGILOCKER);

            // Launch DigiLocker SDK
            if (typeof window.DigilockerSDK !== 'undefined') {
                // Event listener for SDK events
                class EventListener extends window.DigilockerSDK.EventListener {
                    constructor(callback) {
                        super();
                        this.callback = callback;
                    }
                    onEvent(event) {
                        if (this.callback) {
                            this.callback(event);
                        }
                    }
                }

                const handleSDKEvent = (event) => {
                    console.log('DigiLocker SDK Event:', event);
                    if (event.type === 'in.co.sandbox.kyc.digilocker_sdk.session.completed') {
                        handleDigilockerSuccess(sessionId);
                    } else if (event.type === 'in.co.sandbox.kyc.digilocker_sdk.session.closed') {
                        handleDigilockerClosed();
                    }
                };

                const eventListener = new EventListener(handleSDKEvent);
                window.DigilockerSDK.setEventListener(eventListener);
                window.DigilockerSDK.setAPIKey(SANDBOX_API_KEY);

                const options = {
                    session_id: sessionId,
                    brand: {
                        name: 'Apna Rupee',
                        logo_url: 'https://apnarupee.com/logo.png',
                    },
                    theme: {
                        mode: 'light',
                        seed: '#3B82F6',
                    },
                };

                window.DigilockerSDK.open(options);
            } else {
                throw new Error('DigiLocker SDK not loaded. Please refresh the page.');
            }
        } catch (err) {
            console.error('DigiLocker launch error:', err);
            setError(err.message || 'Failed to launch DigiLocker');
            // Fallback to manual OTP
            setCurrentPhase(KYC_PHASES.METHOD_SELECT);
        } finally {
            setLoading(false);
        }
    };

    const handleDigilockerSuccess = async (sessionId) => {
        setLoading(true);
        try {
            // Check session status
            const statusResponse = await kycApi.getDigilockerStatus(sessionId);

            if (statusResponse.success && statusResponse.status === 'succeeded') {
                const documentsConsented = statusResponse.documentsConsented || [];
                setDigilockerDocumentsConsented(documentsConsented);

                // Fetch documents
                const docResponse = await kycApi.fetchDigilockerDocuments(sessionId, documentsConsented);

                if (docResponse.success) {
                    // Check what documents were fetched
                    const gotAadhaar = !!docResponse.aadhaarData;
                    const gotPan = !!docResponse.panData;

                    if (gotAadhaar) {
                        setAadhaarVerified(true);
                        setAadhaarData(docResponse.aadhaarData);
                    }
                    if (gotPan) {
                        setPanVerified(true);
                        setPanData(docResponse.panData);
                    }

                    // Determine next step based on what was fetched
                    if (gotAadhaar && gotPan) {
                        // Both fetched - go to selfie
                        setCurrentPhase(KYC_PHASES.SELFIE);
                    } else if (gotAadhaar && !gotPan) {
                        // Only Aadhaar fetched - need manual PAN (this is fine!)
                        setError('PAN was not found in DigiLocker. Please verify PAN manually.');
                        setCurrentPhase(KYC_PHASES.PAN);
                    } else {
                        // Neither fetched - fallback to complete manual flow
                        // Clear any partial state to avoid confusion
                        setAadhaarVerified(false);
                        setAadhaarData(null);
                        setError('Could not fetch documents from DigiLocker. Please use manual verification.');
                        setCurrentPhase(KYC_PHASES.AADHAAR);
                    }
                } else {
                    throw new Error(docResponse.error || 'Failed to fetch documents');
                }
            } else {
                throw new Error('DigiLocker session not successful');
            }
        } catch (err) {
            console.error('DigiLocker document fetch error:', err);
            // Clear any partial state to avoid confusion in manual flow
            setAadhaarVerified(false);
            setAadhaarData(null);
            setPanVerified(false);
            setPanData(null);
            setError(err.message || 'Failed to fetch documents. Please try manual verification.');
            setCurrentPhase(KYC_PHASES.AADHAAR);
        } finally {
            setLoading(false);
        }
    };

    const handleDigilockerClosed = () => {
        // User closed SDK without completing
        setError('DigiLocker verification cancelled. You can try again or use Aadhaar OTP.');
        setCurrentPhase(KYC_PHASES.METHOD_SELECT);
        setLoading(false);
    };

    // ==================== Aadhaar Phase ====================
    const sendAadhaarOtp = async () => {
        if (aadhaar.length !== 12) {
            setError('Please enter a valid 12-digit Aadhaar number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await kycApi.sendAadhaarOtp(aadhaar);
            if (response.success) {
                setAadhaarReferenceId(response.referenceId);
            } else {
                setError(response.error || 'Failed to send OTP');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const verifyAadhaarOtp = async () => {
        if (aadhaarOtp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await kycApi.verifyAadhaarOtp({
                referenceId: aadhaarReferenceId,
                otp: aadhaarOtp,
                aadhaarNumber: aadhaar // Pass original Aadhaar for proper masking
            });

            if (response.success && response.verified) {
                setAadhaarVerified(true);
                setAadhaarData(response.aadhaarData);
                setCurrentPhase(KYC_PHASES.PAN);
            } else {
                setError(response.error || 'OTP verification failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ==================== PAN Phase ====================
    const verifyPan = async () => {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(pan)) {
            setError('Please enter a valid PAN (e.g., ABCDE1234F)');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await kycApi.verifyPan(pan);

            if (response.success && response.verified) {
                setPanVerified(true);
                setPanData(response.panData);

                // Check PAN-Aadhaar link status (non-blocking)
                // Requires full Aadhaar number (from state) for link check
                if (aadhaar && aadhaar.length === 12) {
                    try {
                        const linkResult = await kycApi.checkPanAadhaarLink(aadhaar);
                        console.log('PAN-Aadhaar Link Status:', linkResult);
                        // Result is stored on backend, just log here
                        if (linkResult.linked) {
                            console.log('✅ PAN is linked to Aadhaar');
                        } else {
                            console.log('⚠️ PAN is NOT linked to Aadhaar:', linkResult.message);
                        }
                    } catch (linkErr) {
                        console.warn('PAN-Aadhaar link check failed (non-blocking):', linkErr.message);
                    }
                }

                setCurrentPhase(KYC_PHASES.SELFIE);
            } else {
                setError(response.error || 'PAN verification failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ==================== Camera Functions ====================
    const startCamera = async () => {
        try {
            // Stop any existing stream first
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });

            streamRef.current = stream;  // Store stream reference
            setCameraActive(true);  // This triggers useEffect to attach stream to video

        } catch (err) {
            console.error('Camera error:', err);
            setError('Camera access denied. Please allow camera access to continue.');
        }
    };

    const stopCamera = () => {
        // Stop all tracks from the stream reference
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log('Stopped track:', track.kind);
            });
            streamRef.current = null;
        }

        // Also clear the video element
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject = null;
        }

        setCameraActive(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return null;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        return dataUrl;
    };

    // ==================== Selfie Phase ====================

    // Upload the already captured selfie to backend
    const uploadSelfie = async () => {
        // Use the already captured selfieImage
        if (!selfieImage) {
            setError('No photo captured. Please capture a photo first.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Upload selfie to backend
            const response = await kycApi.uploadSelfie(selfieImage);

            if (response.success) {
                setSelfieCaptured(true);
                stopCamera();
                setCurrentPhase(KYC_PHASES.COMPLETE);
            } else {
                setError(response.error || 'Failed to save selfie');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Capture photo from video and store in state
    const handleCapturePhoto = () => {
        const photo = capturePhoto();
        if (photo) {
            setSelfieImage(photo);
            stopCamera();  // Stop camera when showing preview
        } else {
            setError('Failed to capture from camera');
        }
    };

    // Retake selfie
    const retakeSelfie = () => {
        setSelfieImage(null);
        startCamera();
    };

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    // ==================== Render Phases ====================

    const renderConsentPhase = () => (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/25">
                    <Shield className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">KYC Verification</h3>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    We need to verify your identity to proceed with the onboarding.
                </p>
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-700/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/30">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">What we'll verify:</h4>
                <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-300">Aadhaar details (via OTP verification)</span>
                    </li>
                    <li className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-300">PAN card verification</span>
                    </li>
                    <li className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-300">Live photo capture (for agreement)</span>
                    </li>
                </ul>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>By continuing,</strong> you consent to the collection and verification of your Aadhaar and PAN details for KYC purposes.
                </p>
            </div>

            <button
                onClick={handleConsent}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
                I Consent & Continue
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );

    // ==================== Method Selection Phase ====================
    const renderMethodSelectPhase = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
                    <Fingerprint className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Choose Verification Method</h3>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Select how you'd like to verify your identity
                </p>
            </div>

            <div className="space-y-4">
                {/* DigiLocker Option */}
                {/*<button
                    onClick={() => handleMethodSelect('digilocker')}
                    disabled={loading}
                    className="w-full p-5 border-2 border-slate-200 dark:border-slate-600 rounded-2xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            { <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600">
                                DigiLocker (Recommended)
                            </h4> }
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Fetch Aadhaar & PAN directly from government repository.
                                No OTP required if you have a DigiLocker account.
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium">
                                    Fastest
                                </span>
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full font-medium">
                                    Secure
                                </span>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
                    </div>
                </button>

                {/* Manual OTP Option */}
                <button
                    onClick={() => handleMethodSelect('otp')}
                    disabled={loading}
                    className="w-full p-5 border-2 border-slate-200 dark:border-slate-600 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-left group"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600">
                                Aadhaar OTP Verification
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Verify using OTP sent to your Aadhaar-linked mobile.
                                Then verify PAN separately.
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full font-medium">
                                    2-Step Process
                                </span>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 flex-shrink-0" />
                    </div>
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span className="ml-2 text-slate-600 dark:text-slate-400">Preparing verification...</span>
                </div>
            )}
        </div>
    );

    // ==================== DigiLocker Phase (Loading/Waiting) ====================
    const renderDigilockerPhase = () => (
        <div className="space-y-6">
            <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/25">
                    {loading ? (
                        <Loader2 className="w-10 h-10 animate-spin text-white" />
                    ) : (
                        <Shield className="w-10 h-10 text-white" />
                    )}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">DigiLocker Verification</h3>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    {loading ? 'Processing your documents...' : 'Complete the verification in the DigiLocker window'}
                </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
                    A DigiLocker window should open. Please authenticate and grant consent to fetch your documents.
                </p>
            </div>

            <div className="flex flex-col gap-3">
                <button
                    onClick={() => launchDigilocker()}
                    disabled={loading}
                    className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Shield className="w-5 h-5" />
                            Retry DigiLocker
                        </>
                    )}
                </button>

                <button
                    onClick={() => setCurrentPhase(KYC_PHASES.METHOD_SELECT)}
                    disabled={loading}
                    className="w-full py-3 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    Choose Different Method
                </button>
            </div>
        </div>
    );

    const renderAadhaarPhase = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Fingerprint className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold">Aadhaar Verification</h3>
            </div>

            {!aadhaarReferenceId ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Aadhaar Number
                        </label>
                        <input
                            type="text"
                            value={aadhaar}
                            onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                            placeholder="Enter 12-digit Aadhaar"
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg tracking-wider"
                            maxLength={12}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            An OTP will be sent to your Aadhaar-linked mobile number
                        </p>
                    </div>

                    <button
                        onClick={sendAadhaarOtp}
                        disabled={loading || aadhaar.length !== 12}
                        className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                        <p className="text-sm text-green-700 dark:text-green-300">
                            OTP sent to Aadhaar-linked mobile
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Enter OTP
                        </label>
                        <input
                            type="text"
                            value={aadhaarOtp}
                            onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="6-digit OTP"
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl tracking-[0.5em]"
                            maxLength={6}
                        />
                    </div>

                    <button
                        onClick={verifyAadhaarOtp}
                        disabled={loading || aadhaarOtp.length !== 6}
                        className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
                    </button>

                    {/* Resend OTP Button */}
                    <button
                        onClick={sendAadhaarOtp}
                        disabled={loading}
                        className="w-full py-2 text-green-600 hover:text-green-700 text-sm font-medium flex items-center justify-center gap-1"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Resend OTP
                    </button>

                    <button
                        onClick={() => setAadhaarReferenceId('')}
                        className="w-full py-2 text-slate-600 hover:text-slate-800 text-sm"
                    >
                        ← Change Aadhaar Number
                    </button>
                </div>
            )}
        </div>
    );

    const renderPanPhase = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-bold">PAN Verification</h3>
            </div>

            {aadhaarVerified && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                            Aadhaar Verified: {aadhaarData?.name}
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        PAN Number
                    </label>
                    <input
                        type="text"
                        value={pan}
                        onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
                        placeholder="ABCDE1234F"
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg tracking-wider uppercase"
                        maxLength={10}
                    />
                </div>

                <button
                    onClick={verifyPan}
                    disabled={loading || pan.length !== 10}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify PAN'}
                </button>
            </div>
        </div>
    );

    const renderSelfiePhase = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Camera className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-lg font-bold">Photo for Agreement</h3>
                <p className="text-sm text-slate-500 mt-1">
                    Take a live selfie or upload a passport-size photo
                </p>
            </div>

            {/* Verification badges */}
            <div className="flex gap-2">
                <div className="flex-1 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-700 dark:text-green-300">Aadhaar ✓</span>
                </div>
                <div className="flex-1 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-700 dark:text-green-300">PAN ✓</span>
                </div>
            </div>

            {/* Photo Preview (if captured or uploaded) */}
            {selfieImage ? (
                <div className="space-y-4">
                    <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden">
                        <img src={selfieImage} alt="Photo preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-3">
                        <button
                            onClick={uploadSelfie}
                            disabled={loading}
                            className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Use This Photo
                                </>
                            )}
                        </button>
                        <button
                            onClick={retakeSelfie}
                            disabled={loading}
                            className="w-full py-2 text-slate-600 hover:text-slate-800 text-sm"
                        >
                            Choose Different Photo
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Option Selection - Live Selfie or Upload */}
                    {!cameraActive ? (
                        <div className="grid grid-cols-2 gap-4">
                            {/* Live Selfie Option */}
                            <button
                                onClick={startCamera}
                                className="flex flex-col items-center justify-center p-6 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl hover:border-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all"
                            >
                                <Camera className="w-10 h-10 text-purple-500 mb-3" />
                                <span className="font-medium text-purple-700 dark:text-purple-300">Live Selfie</span>
                                <span className="text-xs text-purple-500 mt-1">Use camera</span>
                            </button>

                            {/* Upload Photo Option */}
                            <label className="flex flex-col items-center justify-center p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/jpg"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            // Validate file size (max 2MB)
                                            if (file.size > 10 * 1024 * 1024) {
                                                setError('Photo must be less than 10MB');
                                                return;
                                            }
                                            // Read file as base64
                                            const reader = new FileReader();
                                            reader.onload = () => {
                                                setSelfieImage(reader.result);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                                <User className="w-10 h-10 text-blue-500 mb-3" />
                                <span className="font-medium text-blue-700 dark:text-blue-300">Upload Photo</span>
                                <span className="text-xs text-blue-500 mt-1">Passport size</span>
                            </label>
                        </div>
                    ) : (
                        /* Camera Active - Show Video Feed */
                        <div className="space-y-4">
                            <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        const photo = capturePhoto();
                                        if (photo) {
                                            setSelfieImage(photo);
                                            stopCamera();
                                        }
                                    }}
                                    className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <Camera className="w-5 h-5" />
                                    Capture
                                </button>
                                <button
                                    onClick={stopCamera}
                                    className="px-4 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Tip */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 <strong>Tip:</strong> For best results, use a recent passport-size photo with white background, or take a clear selfie with good lighting.
                </p>
            </div>
        </div>
    );

    const renderCompletePhase = () => (
        <div className="text-center py-8">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
            >
                <CheckCircle2 className="w-12 h-12 text-green-500" />
            </motion.div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                KYC Verified!
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your identity has been successfully verified.
            </p>

            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3 text-left max-w-sm mx-auto">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Aadhaar</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Verified
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">PAN</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        {panData?.pan || 'Verified'}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Photo</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Captured
                    </span>
                </div>
            </div>

            <button
                onClick={onComplete}
                className="mt-6 px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors"
            >
                Continue to Bank Verification
            </button>
        </div>
    );

    return (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border border-white/50 dark:border-slate-700/50 overflow-hidden">
            {/* Phase Progress - Horizontal Steps */}
            {currentPhase !== KYC_PHASES.COMPLETE && (
                <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-center">
                        {phases.map((phase, index) => {
                            const Icon = phase.icon;
                            const isActive = phase.id === currentPhase ||
                                (phase.id === KYC_PHASES.METHOD_SELECT && (currentPhase === KYC_PHASES.DIGILOCKER || currentPhase === KYC_PHASES.AADHAAR));
                            const isComplete = getCurrentPhaseIndex() > index;

                            return (
                                <div key={phase.id} className="flex items-center">
                                    <div className="flex flex-col items-center">
                                        {/* Step Circle */}
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isComplete
                                            ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30'
                                            : isActive
                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30'
                                                : 'bg-slate-100 dark:bg-slate-700'
                                            }`}>
                                            {isComplete ? (
                                                <CheckCircle2 className="w-6 h-6 text-white" />
                                            ) : (
                                                <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                                            )}
                                        </div>
                                        {/* Step Label */}
                                        <span className={`text-xs mt-2 font-semibold ${isComplete
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : isActive
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-slate-400 dark:text-slate-500'
                                            }`}>
                                            {phase.label}
                                        </span>
                                    </div>
                                    {/* Connecting Line */}
                                    {index < phases.length - 1 && (
                                        <div className={`w-16 sm:w-24 h-1 mx-3 rounded-full transition-all duration-300 ${isComplete ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-slate-200 dark:bg-slate-600'
                                            }`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="p-8">

                {/* Error Display */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3"
                        >
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-700 dark:text-red-300">{error}</p>
                                <button
                                    onClick={() => setError('')}
                                    className="text-sm text-red-500 hover:text-red-700 mt-1"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Phase Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPhase}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {currentPhase === KYC_PHASES.CONSENT && renderConsentPhase()}
                        {currentPhase === KYC_PHASES.METHOD_SELECT && renderMethodSelectPhase()}
                        {currentPhase === KYC_PHASES.DIGILOCKER && renderDigilockerPhase()}
                        {currentPhase === KYC_PHASES.AADHAAR && renderAadhaarPhase()}
                        {currentPhase === KYC_PHASES.PAN && renderPanPhase()}
                        {currentPhase === KYC_PHASES.SELFIE && renderSelfiePhase()}
                        {currentPhase === KYC_PHASES.COMPLETE && renderCompletePhase()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

