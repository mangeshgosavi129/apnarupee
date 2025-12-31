/**
 * Director KYC Step Component
 * Handles director KYC (PAN + Aadhaar for all, Selfie for signatory)
 * Phase 7: Company (Pvt Ltd / LLP / OPC) workflow
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    CheckCircle2,
    Circle,
    Loader2,
    ChevronRight,
    ChevronDown,
    AlertCircle,
    CreditCard,
    Fingerprint,
    Camera,
    Star,
    User,
    Phone,
    Mail
} from 'lucide-react';
import api from '../../services/api';
import { kycApi } from '../../services/api';

export default function DirectorKycStep({ onComplete }) {
    // States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [directors, setDirectors] = useState([]);
    const [companyData, setCompanyData] = useState(null);

    // Active director for KYC
    const [activeDirectorIndex, setActiveDirectorIndex] = useState(null);
    const [expandedDirector, setExpandedDirector] = useState(null);

    // KYC form states
    const [panNumber, setPanNumber] = useState('');
    const [panName, setPanName] = useState('');
    const [panDob, setPanDob] = useState('');
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [aadhaarReferenceId, setAadhaarReferenceId] = useState('');
    const [aadhaarOtp, setAadhaarOtp] = useState('');
    const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false);

    // Selfie capture
    const [selfieImage, setSelfieImage] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Load directors on mount
    useEffect(() => {
        loadDirectors();
    }, []);

    const loadDirectors = async () => {
        setLoading(true);
        try {
            const response = await api.get('/company/details');
            if (response.data?.success) {
                setDirectors(response.data.directors || []);
                setCompanyData(response.data.company);
            }
        } catch (err) {
            setError('Failed to load directors');
        } finally {
            setLoading(false);
        }
    };

    // Set signatory
    const handleSetSignatory = async (din) => {
        setLoading(true);
        setError('');
        try {
            await api.put(`/directors/${din}`, { isSignatory: true });
            await loadDirectors();
        } catch (err) {
            setError('Failed to set signatory');
        } finally {
            setLoading(false);
        }
    };

    // Verify PAN
    const handleVerifyPan = async (din) => {
        if (!panNumber || !panName || !panDob) {
            setError('Please fill all PAN fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post(`/directors/${din}/kyc/pan`, {
                pan: panNumber.toUpperCase(),
                name: panName,
                dob: panDob
            });

            if (response.data?.success) {
                await loadDirectors();
                setPanNumber('');
                setPanName('');
                setPanDob('');
            } else {
                setError(response.data?.error || 'PAN verification failed');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'PAN verification failed');
        } finally {
            setLoading(false);
        }
    };

    // Init Aadhaar OKYC
    const handleInitAadhaar = async (din) => {
        if (!aadhaarNumber || aadhaarNumber.length !== 12) {
            setError('Please enter valid 12-digit Aadhaar number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post(`/directors/${din}/kyc/aadhaar`, {
                aadhaarNumber: aadhaarNumber
            });

            if (response.data?.success) {
                setAadhaarReferenceId(response.data.referenceId);
                setAadhaarOtpSent(true);
            } else {
                setError(response.data?.error || 'Failed to send OTP');
            }
        } catch (err) {
            setError('Failed to initiate Aadhaar verification');
        } finally {
            setLoading(false);
        }
    };

    // Verify Aadhaar OTP
    const handleVerifyAadhaarOtp = async (din) => {
        if (!aadhaarOtp || aadhaarOtp.length !== 6) {
            setError('Please enter 6-digit OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post(`/directors/${din}/kyc/aadhaar/verify`, {
                referenceId: aadhaarReferenceId,
                otp: aadhaarOtp
            });

            if (response.data?.success) {
                await loadDirectors();
                setAadhaarNumber('');
                setAadhaarOtp('');
                setAadhaarOtpSent(false);
                setAadhaarReferenceId('');
            } else {
                setError(response.data?.error || 'OTP verification failed');
            }
        } catch (err) {
            setError('Aadhaar verification failed');
        } finally {
            setLoading(false);
        }
    };

    // Camera functions
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
            setCameraActive(true);
        } catch (err) {
            setError('Camera access denied');
        }
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            setSelfieImage(imageData);
            stopCamera();
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const handleSaveSelfie = async (din) => {
        if (!selfieImage) {
            setError('Please capture a selfie');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post(`/directors/${din}/selfie`, {
                selfieImage: selfieImage
            });

            if (response.data?.success) {
                await loadDirectors();
                setSelfieImage(null);
            } else {
                setError('Failed to save selfie');
            }
        } catch (err) {
            setError('Failed to save selfie');
        } finally {
            setLoading(false);
        }
    };

    // Check if all KYC complete
    const allKycComplete = () => {
        const signatory = directors.find(d => d.isSignatory);
        if (!signatory) return false;

        return directors.every(d => {
            const panComplete = d.kyc?.pan?.verified;
            const aadhaarComplete = d.kyc?.aadhaar?.verified;
            const selfieComplete = d.isSignatory ? d.kyc?.selfie?.captured : true;
            return panComplete && aadhaarComplete && selfieComplete;
        });
    };

    // Get director status
    const getDirectorStatus = (director) => {
        const pan = director.kyc?.pan?.verified;
        const aadhaar = director.kyc?.aadhaar?.verified;
        const selfie = director.isSignatory ? director.kyc?.selfie?.captured : true;

        if (pan && aadhaar && selfie) return 'complete';
        if (pan || aadhaar) return 'partial';
        return 'pending';
    };

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    if (loading && directors.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border border-white/50 dark:border-slate-700/50 p-8">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
                    <Users className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Director KYC</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Complete KYC verification for all directors. Select one as the signatory.
                </p>
            </div>

            {/* Error Display */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3"
                >
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-700 dark:text-red-300">{error}</p>
                    </div>
                </motion.div>
            )}

            {/* Signatory Selection Alert */}
            {!directors.some(d => d.isSignatory) && (
                <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 flex items-start gap-3">
                    <Star className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">
                        Action Required: Please select one director as the signatory who will sign the agreement.
                    </p>
                </div>
            )}

            {/* Directors List */}
            <div className="space-y-4">
                {directors.map((director, index) => {
                    const status = getDirectorStatus(director);
                    const isExpanded = expandedDirector === director.din;

                    return (
                        <motion.div
                            key={director.din}
                            className={`rounded-xl overflow-hidden border transition-all ${director.isSignatory
                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 shadow-md ring-1 ring-blue-500/20'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/30'
                                }`}
                        >
                            {/* Director Header */}
                            <div
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                onClick={() => setExpandedDirector(isExpanded ? null : director.din)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${status === 'complete'
                                            ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                                            : status === 'partial'
                                                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                                                : 'bg-gradient-to-br from-slate-400 to-slate-500'
                                        }`}>
                                        {status === 'complete' ? (
                                            <CheckCircle2 className="w-6 h-6 text-white" />
                                        ) : (
                                            <User className="w-6 h-6 text-white" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-bold text-slate-900 dark:text-white truncate">{director.name}</p>
                                            {director.isSignatory && (
                                                <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-full shadow-sm">
                                                    Signatory
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm truncate">{director.designation} | DIN: {director.din}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                    <div className="flex gap-2 text-xs font-medium">
                                        <span className={`px-2 py-1 rounded-lg ${director.kyc?.pan?.verified ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                            PAN {director.kyc?.pan?.verified && '✓'}
                                        </span>
                                        <span className={`px-2 py-1 rounded-lg ${director.kyc?.aadhaar?.verified ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                            Aadhaar {director.kyc?.aadhaar?.verified && '✓'}
                                        </span>
                                        {director.isSignatory && (
                                            <span className={`px-2 py-1 rounded-lg ${director.kyc?.selfie?.captured ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                                Selfie {director.kyc?.selfie?.captured && '✓'}
                                            </span>
                                        )}
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </div>

                            {/* Expanded KYC Section */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-slate-200 dark:border-slate-700"
                                    >
                                        <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-800/50">
                                            {/* Set as Signatory */}
                                            {!director.isSignatory && (
                                                <button
                                                    onClick={() => handleSetSignatory(director.din)}
                                                    disabled={loading}
                                                    className="w-full py-2.5 px-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 font-medium"
                                                >
                                                    <Star className="w-4 h-4" />
                                                    Set as Authorized Signatory
                                                </button>
                                            )}

                                            {/* PAN Verification */}
                                            <div className="bg-white dark:bg-slate-700/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                <div className="flex items-center gap-2.5 mb-5">
                                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                        <CreditCard className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                                                    </div>
                                                    <h4 className="font-semibold text-slate-900 dark:text-white">PAN Verification</h4>
                                                    {director.kyc?.pan?.verified && (
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
                                                    )}
                                                </div>

                                                {director.kyc?.pan?.verified ? (
                                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                                                        <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Verified: {director.kyc.pan.number}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
                                                            <input
                                                                type="text"
                                                                placeholder="PAN Number (e.g., ABCDE1234F)"
                                                                value={panNumber}
                                                                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                                                                maxLength={10}
                                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white font-mono placeholder:text-slate-400"
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Date of Birth (DD/MM/YYYY)"
                                                                value={panDob}
                                                                onChange={(e) => setPanDob(e.target.value)}
                                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                                                            />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Name as per PAN"
                                                            value={panName}
                                                            onChange={(e) => setPanName(e.target.value)}
                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                                                        />
                                                        <button
                                                            onClick={() => handleVerifyPan(director.din)}
                                                            disabled={loading}
                                                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-xl shadow-md transition-all disabled:opacity-50"
                                                        >
                                                            {loading ? 'Verifying...' : 'Verify PAN'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Aadhaar Verification */}
                                            <div className="bg-white dark:bg-slate-700/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                <div className="flex items-center gap-2.5 mb-5">
                                                    <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                                                        <Fingerprint className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                                                    </div>
                                                    <h4 className="font-semibold text-slate-900 dark:text-white">Aadhaar Verification</h4>
                                                    {director.kyc?.aadhaar?.verified && (
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
                                                    )}
                                                </div>

                                                {director.kyc?.aadhaar?.verified ? (
                                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                                                        <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Verified: {director.kyc.aadhaar.maskedNumber}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {!aadhaarOtpSent ? (
                                                            <>
                                                                <input
                                                                    type="text"
                                                                    placeholder="12-digit Aadhaar Number"
                                                                    value={aadhaarNumber}
                                                                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                                                                    maxLength={12}
                                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white font-mono placeholder:text-slate-400"
                                                                />
                                                                <button
                                                                    onClick={() => handleInitAadhaar(director.din)}
                                                                    disabled={loading}
                                                                    className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-md transition-all disabled:opacity-50"
                                                                >
                                                                    {loading ? 'Sending OTP...' : 'Send OTP'}
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-sm mb-2">
                                                                    OTP sent to Aadhaar linked mobile number
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Enter 6-digit OTP"
                                                                    value={aadhaarOtp}
                                                                    onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, ''))}
                                                                    maxLength={6}
                                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white font-mono text-center tracking-[0.5em] text-lg placeholder:tracking-normal placeholder:text-slate-400"
                                                                />
                                                                <button
                                                                    onClick={() => handleVerifyAadhaarOtp(director.din)}
                                                                    disabled={loading}
                                                                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-medium rounded-xl shadow-md transition-all disabled:opacity-50"
                                                                >
                                                                    {loading ? 'Verifying...' : 'Verify OTP'}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Selfie/Photo (only for signatory) */}
                                            {director.isSignatory && (
                                                <div className="bg-white dark:bg-slate-700/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <div className="flex items-center gap-2.5 mb-5">
                                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                                            <Camera className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                                        </div>
                                                        <h4 className="font-semibold text-slate-900 dark:text-white">Photo for Agreement</h4>
                                                        {director.kyc?.selfie?.captured && (
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
                                                        )}
                                                    </div>

                                                    {director.kyc?.selfie?.captured ? (
                                                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                                                            <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Photo Captured Successfully
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {/* Photo preview */}
                                                            {selfieImage ? (
                                                                <div className="space-y-4">
                                                                    <div className="relative rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-600 aspect-video bg-black">
                                                                        <img src={selfieImage} alt="Photo" className="w-full h-full object-contain" />
                                                                    </div>
                                                                    <div className="flex gap-3">
                                                                        <button
                                                                            onClick={() => handleSaveSelfie(director.din)}
                                                                            disabled={loading}
                                                                            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-green-700 shadow-md transition-all"
                                                                        >
                                                                            {loading ? 'Saving...' : 'Use This Photo'}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelfieImage(null);
                                                                                stopCamera();
                                                                            }}
                                                                            className="px-6 py-3 bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl border border-slate-200 dark:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-500 transition-all"
                                                                        >
                                                                            Retake
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : cameraActive ? (
                                                                /* Camera Active */
                                                                <div className="space-y-4">
                                                                    <div className="relative rounded-xl overflow-hidden shadow-lg aspect-video bg-black">
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
                                                                            onClick={capturePhoto}
                                                                            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-green-700 shadow-md transition-all flex items-center justify-center gap-2"
                                                                        >
                                                                            <Camera className="w-5 h-5" />
                                                                            Capture Photo
                                                                        </button>
                                                                        <button
                                                                            onClick={stopCamera}
                                                                            className="px-6 py-3 bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl border border-slate-200 dark:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-500 transition-all"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                /* Option Selection */
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <button
                                                                        onClick={startCamera}
                                                                        className="flex flex-col items-center justify-center p-6 bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/30 rounded-2xl hover:bg-violet-100 dark:hover:bg-violet-900/20 transition-all group"
                                                                    >
                                                                        <div className="w-12 h-12 bg-white dark:bg-violet-900/50 rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                                                            <Camera className="w-6 h-6 text-violet-500 dark:text-violet-300" />
                                                                        </div>
                                                                        <span className="text-violet-700 dark:text-violet-300 font-semibold">Take Live Selfie</span>
                                                                    </button>

                                                                    <label className="flex flex-col items-center justify-center p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all cursor-pointer group">
                                                                        <input
                                                                            type="file"
                                                                            accept="image/jpeg,image/png,image/jpg"
                                                                            className="hidden"
                                                                            onChange={(e) => {
                                                                                const file = e.target.files?.[0];
                                                                                if (file) {
                                                                                    if (file.size > 10 * 1024 * 1024) {
                                                                                        setError('Photo must be less than 10MB');
                                                                                        return;
                                                                                    }
                                                                                    const reader = new FileReader();
                                                                                    reader.onload = () => {
                                                                                        setSelfieImage(reader.result);
                                                                                    };
                                                                                    reader.readAsDataURL(file);
                                                                                }
                                                                            }}
                                                                        />
                                                                        <div className="w-12 h-12 bg-white dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                                                            <User className="w-6 h-6 text-blue-500 dark:text-blue-300" />
                                                                        </div>
                                                                        <span className="text-blue-700 dark:text-blue-300 font-semibold">Upload Photo</span>
                                                                    </label>
                                                                </div>
                                                            )}
                                                            <p className="text-slate-500 dark:text-slate-400 text-xs text-center flex items-center justify-center gap-1">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Please ensure your face is clearly visible and well-lit
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Continue Button */}
            {allKycComplete() && (
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={onComplete}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 mt-8"
                >
                    <CheckCircle2 className="w-6 h-6" />
                    Complete Verification & Continue
                </motion.button>
            )}
        </div>
    );
}
