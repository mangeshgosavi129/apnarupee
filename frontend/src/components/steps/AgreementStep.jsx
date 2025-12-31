/**
 * Agreement Step Component
 * Generate PDF Agreement and initiate E-Stamp/E-Sign workflow
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
    FileText,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Download,
    Stamp,
    PenTool,
    ExternalLink,
    Eye
} from 'lucide-react';
import { agreementApi } from '../../services/api';

export default function AgreementStep({ onComplete }) {
    // State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pdfBase64, setPdfBase64] = useState(null);
    const [status, setStatus] = useState({
        pdfGenerated: false,
        estampStatus: 'pending',
        esignStatus: 'pending',
        complete: false
    });
    const [showPreview, setShowPreview] = useState(false);
    const [currentAction, setCurrentAction] = useState('');

    // Load status on mount and check for redirect from E-Sign
    useEffect(() => {
        // Check if user is returning from E-Sign with signed=true
        const urlParams = new URLSearchParams(window.location.search);
        const signedParam = urlParams.get('signed');
        const tokenParam = urlParams.get('token');

        // If token is in URL, restore it to localStorage first
        if (tokenParam) {
            localStorage.setItem('token', tokenParam);
            console.log('[E-Sign Return] Auth token restored from URL');
        }

        // Load status after potential token restoration
        loadStatus();

        if (signedParam === 'true') {
            // Mark as signed in backend
            handleMarkSigned();
            // Clean up URL (remove query params)
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // Mark user's signature as complete
    const handleMarkSigned = async () => {
        try {
            const response = await agreementApi.markSigned();
            if (response.success) {
                setStatus(prev => ({ ...prev, esignStatus: 'user_signed' }));
            }
        } catch (err) {
            console.error('Failed to mark as signed:', err);
        }
    };

    const loadStatus = async () => {
        try {
            const response = await agreementApi.getStatus();
            if (response.success) {
                setStatus(response.status);
            }
        } catch (err) {
            console.error('Failed to load agreement status:', err);
        }
    };

    // Generate PDF
    const handleGeneratePdf = async () => {
        setLoading(true);
        setError('');
        setCurrentAction('Generating PDF...');

        try {
            const response = await agreementApi.generate();
            if (response.success) {
                setPdfBase64(response.pdfBase64);
                setStatus(prev => ({ ...prev, pdfGenerated: true }));
                setShowPreview(true);
            } else {
                // Handle validation errors with details array
                if (response.details && Array.isArray(response.details)) {
                    setError(`${response.error}: ${response.details.join(', ')}`);
                } else {
                    setError(response.error || 'Failed to generate PDF');
                }
            }
        } catch (err) {
            // Handle error from axios / api service
            const errorData = err.response?.data || err;
            if (errorData.details && Array.isArray(errorData.details)) {
                setError(`${errorData.error || 'Validation failed'}: ${errorData.details.join(', ')}`);
            } else {
                setError(errorData.error || err.message || 'Failed to generate PDF');
            }
        } finally {
            setLoading(false);
            setCurrentAction('');
        }
    };

    // Download PDF
    const handleDownload = () => {
        if (!pdfBase64) return;

        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${pdfBase64}`;
        link.download = 'DSA_Agreement.pdf';
        link.click();
    };

    // Initiate E-Stamp
    const handleEstamp = async () => {
        setLoading(true);
        setError('');
        setCurrentAction('Processing E-Stamp...');

        try {
            const response = await agreementApi.estamp();
            if (response.success) {
                // Update status based on actual response (could be 'completed' or 'initiated')
                setStatus(prev => ({
                    ...prev,
                    estampStatus: response.status || 'completed',
                    pdfGenerated: true
                }));
                // Reload full status to sync with backend
                await loadStatus();
            } else {
                setError(response.error || 'E-Stamp failed');
            }
        } catch (err) {
            const errorData = err.response?.data || err;
            setError(errorData.error || err.message || 'E-Stamp failed');
        } finally {
            setLoading(false);
            setCurrentAction('');
        }
    };

    // Initiate E-Sign
    const handleEsign = async () => {
        setLoading(true);
        setError('');
        setCurrentAction('Processing E-Sign...');

        try {
            const response = await agreementApi.esign();
            if (response.success) {
                // Update status based on actual response
                setStatus(prev => ({
                    ...prev,
                    esignStatus: response.status || 'initiated'
                }));
                // Open signing URL in new tab
                if (response.signingUrl) {
                    window.open(response.signingUrl, '_blank');
                }
                // Reload status to sync
                await loadStatus();
            } else {
                setError(response.error || 'E-Sign failed');
            }
        } catch (err) {
            const errorData = err.response?.data || err;
            setError(errorData.error || err.message || 'E-Sign failed');
        } finally {
            setLoading(false);
            setCurrentAction('');
        }
    };

    // Render progress tracker
    const renderProgress = () => (
        <div className="space-y-4 mb-8">
            {/* PDF Generation */}
            <div className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border ${status.pdfGenerated ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${status.pdfGenerated ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/25' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    {status.pdfGenerated ? (
                        <CheckCircle2 className="w-6 h-6 text-white" />
                    ) : (
                        <FileText className="w-6 h-6 text-white" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white">Generate Agreement PDF</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Create DSA Agreement with your details</p>
                </div>
                <div className="flex-shrink-0">
                    {status.pdfGenerated ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-xl">
                            <CheckCircle2 className="w-4 h-4" />
                            Complete
                        </span>
                    ) : (
                        <button
                            onClick={handleGeneratePdf}
                            disabled={loading}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all"
                        >
                            Generate
                        </button>
                    )}
                </div>
            </div>

            {/* E-Stamp */}
            <div className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border ${status.estampStatus === 'completed' ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${status.estampStatus === 'completed' ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/25' : status.pdfGenerated ? 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/25' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    {status.estampStatus === 'completed' ? (
                        <CheckCircle2 className="w-6 h-6 text-white" />
                    ) : (
                        <Stamp className="w-6 h-6 text-white" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white">E-Stamp Agreement</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Apply digital stamp duty</p>
                </div>
                <div className="flex-shrink-0">
                    {status.estampStatus === 'completed' ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-xl">
                            <CheckCircle2 className="w-4 h-4" />
                            Complete
                        </span>
                    ) : status.estampStatus === 'initiated' ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm font-medium rounded-xl">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing
                        </span>
                    ) : (
                        <button
                            onClick={handleEstamp}
                            disabled={loading || !status.pdfGenerated}
                            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:from-slate-400 disabled:to-slate-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all"
                        >
                            E-Stamp
                        </button>
                    )}
                </div>
            </div>

            {/* E-Sign */}
            <div className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border ${status.esignStatus === 'completed' ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${status.esignStatus === 'completed' ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/25' : status.estampStatus === 'completed' ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    {status.esignStatus === 'completed' ? (
                        <CheckCircle2 className="w-6 h-6 text-white" />
                    ) : (
                        <PenTool className="w-6 h-6 text-white" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white">E-Sign Agreement</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Sign digitally with Aadhaar</p>
                    {status.estampStatus === 'completed' && status.esignStatus !== 'completed' && status.esignStatus !== 'user_signed' && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Please enable pop-ups to open the signing window
                        </p>
                    )}
                </div>
                <div className="flex-shrink-0">
                    {status.esignStatus === 'completed' ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-xl">
                            <CheckCircle2 className="w-4 h-4" />
                            Complete
                        </span>
                    ) : status.esignStatus === 'user_signed' ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-xl">
                            <CheckCircle2 className="w-4 h-4" />
                            You signed ✓
                        </span>
                    ) : status.esignStatus === 'initiated' ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-sm font-medium rounded-xl">
                            <ExternalLink className="w-4 h-4" />
                            Signing...
                        </span>
                    ) : (
                        <button
                            onClick={handleEsign}
                            disabled={loading || status.estampStatus !== 'completed'}
                            className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all"
                        >
                            E-Sign
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    // Render PDF preview modal


    // Render complete state
    if (status.complete) {
        return (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border border-white/50 dark:border-slate-700/50 p-8">
                <div className="text-center py-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30"
                    >
                        <CheckCircle2 className="w-12 h-12 text-white" />
                    </motion.div>

                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        🎉 Congratulations!
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Your DSA Agreement has been successfully signed.
                    </p>

                    <button
                        onClick={onComplete}
                        className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all"
                    >
                        Complete Onboarding
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border border-white/50 dark:border-slate-700/50 p-8">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
                    <FileText className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">DSA Agreement</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Generate, stamp, and sign your agreement
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
                        <button
                            onClick={() => setError('')}
                            className="text-sm text-red-500 hover:text-red-700 mt-1"
                        >
                            Dismiss
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-blue-700 dark:text-blue-300">{currentAction}</span>
                </div>
            )}

            {/* Progress Steps */}
            {renderProgress()}

            {/* PDF Preview Actions */}
            {status.pdfGenerated && pdfBase64 && (
                <div className="flex gap-4 justify-center mt-6">
                    <button
                        onClick={() => setShowPreview(true)}
                        className="px-6 py-2.5 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl flex items-center gap-2 font-medium transition-all group"
                    >
                        <Eye className="w-4 h-4 text-slate-500 group-hover:text-blue-500 transition-colors" />
                        Preview PDF
                    </button>
                    <button
                        onClick={handleDownload}
                        className="px-6 py-2.5 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl flex items-center gap-2 font-medium transition-all group"
                    >
                        <Download className="w-4 h-4 text-slate-500 group-hover:text-blue-500 transition-colors" />
                        Download
                    </button>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && pdfBase64 && renderPreview()}
        </div>
    );

    // Render PDF preview modal
    function renderPreview() {
        return createPortal(
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6"
                onClick={() => setShowPreview(false)}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Agreement Preview</h3>
                            <p className="text-xs text-slate-500">Review the document before signing</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDownload}
                                className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Download</span>
                            </button>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-900/50 p-4 overflow-hidden relative">
                        <iframe
                            src={`data:application/pdf;base64,${pdfBase64}`}
                            className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white"
                            title="Agreement PDF Preview"
                        />
                    </div>
                </motion.div>
            </motion.div>,
            document.body
        );
    }
}
