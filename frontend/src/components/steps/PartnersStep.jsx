/**
 * Partners Step - Partnership Entity
 * Add/manage partners, mark signatory, track KYC completion
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { partnersApi } from '../../services/api';
import useApplicationStore from '../../store/applicationStore';

export default function PartnersStep() {
    const { nextStep } = useApplicationStore();
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', mobile: '', email: '' });

    // Selected partner for KYC
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [kycPhase, setKycPhase] = useState(null); // 'aadhaar', 'pan', 'selfie'

    const loadPartners = useCallback(async () => {
        try {
            setLoading(true);
            const response = await partnersApi.list();
            if (response.success) {
                setPartners(response.partners || []);
            }
        } catch (err) {
            setError('Failed to load partners');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPartners();
    }, [loadPartners]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            if (editingId) {
                await partnersApi.update(editingId, formData);
            } else {
                await partnersApi.add(formData);
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({ name: '', mobile: '', email: '' });
            await loadPartners();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (partner) => {
        setFormData({ name: partner.name, mobile: partner.mobile, email: partner.email });
        setEditingId(partner._id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Remove this partner?')) return;
        try {
            await partnersApi.remove(id);
            await loadPartners();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSetSignatory = async (id) => {
        try {
            await partnersApi.setSignatory(id);
            await loadPartners();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleStartKyc = (partner) => {
        setSelectedPartner(partner);
        if (!partner.kycStatus.aadhaar) {
            setKycPhase('aadhaar');
        } else if (!partner.kycStatus.pan) {
            setKycPhase('pan');
        } else if (partner.isSignatory && !partner.kycStatus.selfie) {
            setKycPhase('selfie');
        }
    };

    const handleProceed = async () => {
        setError('');
        try {
            const response = await partnersApi.validate();
            if (!response.valid) {
                setError(response.issues?.map(i => i.message).join(', ') || 'Complete KYC for all partners');
                return;
            }
            nextStep();
        } catch (err) {
            setError(err.message);
        }
    };

    // KYC Phase rendering
    if (selectedPartner && kycPhase) {
        return (
            <PartnerKycFlow
                partner={selectedPartner}
                phase={kycPhase}
                onComplete={async () => {
                    await loadPartners();
                    setSelectedPartner(null);
                    setKycPhase(null);
                }}
                onBack={() => {
                    setSelectedPartner(null);
                    setKycPhase(null);
                }}
            />
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border border-white/50 dark:border-slate-700/50 p-8">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl mb-4 shadow-xl shadow-violet-500/25">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Partnership Details</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Add partners and complete KYC for each. Mark one as signatory.</p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
                    {error}
                </div>
            )}

            {/* Partner List */}
            <div className="space-y-4 mb-6">
                {partners.map((partner) => (
                    <div
                        key={partner._id}
                        className={`p-5 rounded-2xl border-2 transition-all ${partner.isSignatory
                            ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30'
                            }`}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${partner.isComplete
                                    ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                                    : 'bg-gradient-to-br from-slate-400 to-slate-500'
                                    }`}>
                                    {partner.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-slate-900 dark:text-white">{partner.name}</span>
                                        {partner.isSignatory && (
                                            <span className="px-2.5 py-0.5 text-xs bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full font-medium shadow-sm">Signatory</span>
                                        )}
                                    </div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{partner.mobile} • {partner.email}</div>
                                </div>
                            </div>

                            {/* KYC Status badges */}
                            <div className="flex gap-2 flex-wrap">
                                <span className={`px-3 py-1.5 text-xs font-medium rounded-lg ${partner.kycStatus.aadhaar
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                                    }`}>
                                    Aadhaar {partner.kycStatus.aadhaar ? '✓' : ''}
                                </span>
                                <span className={`px-3 py-1.5 text-xs font-medium rounded-lg ${partner.kycStatus.pan
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                                    }`}>
                                    PAN {partner.kycStatus.pan ? '✓' : ''}
                                </span>
                                {partner.isSignatory && (
                                    <span className={`px-3 py-1.5 text-xs font-medium rounded-lg ${partner.kycStatus.selfie
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                        : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                                        }`}>
                                        Selfie {partner.kycStatus.selfie ? '✓' : ''}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                            {!partner.isComplete && (
                                <button
                                    onClick={() => handleStartKyc(partner)}
                                    className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-medium shadow-lg shadow-blue-500/25 transition-all"
                                >
                                    {partner.kycStatus.aadhaar ? 'Continue KYC' : 'Start KYC'}
                                </button>
                            )}
                            {!partner.isSignatory && (
                                <button
                                    onClick={() => handleSetSignatory(partner._id)}
                                    className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg font-medium transition-all"
                                >
                                    Make Signatory
                                </button>
                            )}
                            <button
                                onClick={() => handleEdit(partner)}
                                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-all"
                            >
                                Edit
                            </button>
                            {partners.length > 2 && (
                                <button
                                    onClick={() => handleDelete(partner._id)}
                                    className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg font-medium transition-all"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Partner Button */}
            {partners.length < 10 && (
                <button
                    onClick={() => {
                        setFormData({ name: '', mobile: '', email: '' });
                        setEditingId(null);
                        setShowForm(true);
                    }}
                    className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all font-medium mb-6"
                >
                    + Add Partner {partners.length < 2 && `(${2 - partners.length} required)`}
                </button>
            )}

            {/* Add/Edit Form Modal */}
            {showForm && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md m-4 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{editingId ? 'Edit Partner' : 'Add Partner'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter full name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mobile Number</label>
                                <input
                                    type="tel"
                                    placeholder="10-digit mobile number"
                                    value={formData.mobile}
                                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
                                >
                                    {saving ? 'Saving...' : (editingId ? 'Update' : 'Add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Proceed Button */}
            <button
                onClick={handleProceed}
                disabled={partners.length < 2}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Continue to Documents
            </button>
        </div>
    );
}

/**
 * Partner KYC Flow - Aadhaar, PAN, Selfie
 */
function PartnerKycFlow({ partner, phase, onComplete, onBack }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Aadhaar state
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [referenceId, setReferenceId] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    // PAN state
    const [panNumber, setPanNumber] = useState('');

    // Selfie state
    const [selfieImage, setSelfieImage] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Start camera
    const startCamera = async () => {
        try {
            setError('');
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            setStream(mediaStream);
            setCameraActive(true);
        } catch (err) {
            setError('Camera access denied. Please allow camera permissions.');
            console.error('Camera error:', err);
        }
    };

    // Effect to attach stream to video element when camera becomes active
    useEffect(() => {
        if (stream && videoRef.current && cameraActive) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(console.error);
        }
    }, [stream, cameraActive]);

    // Capture selfie from video
    const captureFromCamera = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL('image/jpeg', 0.9);
            setSelfieImage(imageData);
            stopCamera();
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setCameraActive(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    const handleSendOtp = async () => {
        if (aadhaarNumber.length !== 12) {
            setError('Enter 12-digit Aadhaar number');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await partnersApi.sendAadhaarOtp(partner._id, aadhaarNumber);
            if (response.success) {
                setReferenceId(response.referenceId);
                setOtpSent(true);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            setError('Enter 6-digit OTP');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await partnersApi.verifyAadhaarOtp(partner._id, { referenceId, otp, aadhaarNumber });
            if (response.success) {
                onComplete();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyPan = async () => {
        if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber.toUpperCase())) {
            setError('Enter valid PAN (e.g., ABCDE1234F)');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await partnersApi.verifyPan(partner._id, panNumber.toUpperCase());
            if (response.success) {
                onComplete();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitSelfie = async () => {
        if (!selfieImage) {
            setError('Capture selfie first');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await partnersApi.captureSelfie(partner._id, selfieImage);
            if (response.success) {
                onComplete();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border border-white/50 dark:border-slate-700/50 p-8">
            <button onClick={() => { stopCamera(); onBack(); }} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-6 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                ← Back to Partners
            </button>

            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/25">
                    {phase === 'aadhaar' && (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                        </svg>
                    )}
                    {phase === 'pan' && (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                    )}
                    {phase === 'selfie' && (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    )}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    KYC for {partner.name}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    {phase === 'aadhaar' && 'Aadhaar Verification'}
                    {phase === 'pan' && 'PAN Verification'}
                    {phase === 'selfie' && 'Selfie Capture'}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-xl">{error}</div>
            )}

            {/* Aadhaar Phase */}
            {phase === 'aadhaar' && !otpSent && (
                <div className="space-y-5">
                    <div className="bg-slate-50/80 dark:bg-slate-700/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/30">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            12-digit Aadhaar Number
                        </label>
                        <input
                            type="text"
                            placeholder="Enter your Aadhaar number"
                            value={aadhaarNumber}
                            onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                            className="w-full px-5 py-4 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-center text-xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                    </div>
                    <button
                        onClick={handleSendOtp}
                        disabled={loading || aadhaarNumber.length !== 12}
                        className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? 'Sending OTP...' : 'Get OTP'}
                    </button>
                </div>
            )}

            {phase === 'aadhaar' && otpSent && (
                <div className="space-y-5">
                    <div className="text-center mb-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                            📱 OTP sent to Aadhaar-linked mobile number
                        </p>
                    </div>
                    <div className="bg-slate-50/80 dark:bg-slate-700/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/30">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            Enter 6-digit OTP
                        </label>
                        <input
                            type="text"
                            placeholder="· · · · · ·"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-5 py-4 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-center text-3xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-300"
                        />
                    </div>
                    <button
                        onClick={handleVerifyOtp}
                        disabled={loading || otp.length !== 6}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                </div>
            )}

            {/* PAN Phase */}
            {phase === 'pan' && (
                <div className="space-y-5">
                    <div className="bg-slate-50/80 dark:bg-slate-700/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/30">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            PAN Number
                        </label>
                        <input
                            type="text"
                            placeholder="ABCDE1234F"
                            value={panNumber}
                            onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                            className="w-full px-5 py-4 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-center text-xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                        <p className="text-xs text-slate-400 mt-2 text-center">Enter your 10-character PAN card number</p>
                    </div>
                    <button
                        onClick={handleVerifyPan}
                        disabled={loading || panNumber.length !== 10}
                        className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? 'Verifying...' : 'Verify PAN'}
                    </button>
                </div>
            )}

            {/* Selfie Phase - Live Camera */}
            {phase === 'selfie' && (
                <div className="space-y-5 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                        📷 Take a live selfie or upload a passport-size photo
                    </p>

                    {/* Photo Preview */}
                    {selfieImage ? (
                        <div className="space-y-4">
                            <div className="relative w-64 h-64 mx-auto bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
                                <img
                                    src={selfieImage}
                                    alt="Photo"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="space-y-3">
                                <button
                                    onClick={handleSubmitSelfie}
                                    disabled={loading}
                                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all"
                                >
                                    {loading ? 'Saving...' : '✓ Use This Photo'}
                                </button>
                                <button
                                    onClick={() => { setSelfieImage(null); stopCamera(); }}
                                    className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 font-medium transition-all"
                                >
                                    Choose Different Photo
                                </button>
                            </div>
                        </div>
                    ) : cameraActive ? (
                        /* Camera Active */
                        <div className="space-y-4">
                            <div className="relative w-64 h-64 mx-auto bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                    style={{ transform: 'scaleX(-1)' }}
                                />
                                {/* Face guide overlay */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-40 h-48 border-2 border-white/50 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="flex gap-3">
                                <button
                                    onClick={captureFromCamera}
                                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 flex items-center justify-center gap-2 font-semibold shadow-lg"
                                >
                                    📸 Capture
                                </button>
                                <button
                                    onClick={stopCamera}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Option Selection */
                        <div className="space-y-5">
                            <div className="relative w-64 h-64 mx-auto bg-slate-100 dark:bg-slate-700 rounded-2xl overflow-hidden flex flex-col items-center justify-center text-slate-400">
                                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="mt-2 text-sm">Select option below</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={startCamera}
                                    className="flex flex-col items-center justify-center p-5 bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-200 dark:border-violet-800 rounded-2xl hover:border-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-all"
                                >
                                    <svg className="w-10 h-10 text-violet-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span className="font-semibold text-violet-700 dark:text-violet-400">Live Selfie</span>
                                    <span className="text-xs text-violet-500 mt-1">Use camera</span>
                                </button>
                                <label className="flex flex-col items-center justify-center p-5 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all cursor-pointer">
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
                                    <svg className="w-10 h-10 text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="font-semibold text-blue-700 dark:text-blue-400">Upload Photo</span>
                                    <span className="text-xs text-blue-500 mt-1">Passport size</span>
                                </label>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                💡 Use a passport-size photo with white background or take a clear selfie
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

