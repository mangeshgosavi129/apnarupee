/**
 * Documents Step - Entity-specific Document Upload
 * Dynamically fetches document config from backend based on entity type
 */
import { useState, useEffect } from 'react';
import { documentsApi } from '../../services/api';
import useApplicationStore from '../../store/applicationStore';
import {
    FileText,
    Upload,
    Trash2,
    Eye,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronRight,
    File
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DocumentsStep() {
    const { nextStep, entityType } = useApplicationStore();
    const [documents, setDocuments] = useState({});
    const [documentConfig, setDocumentConfig] = useState({});
    const [uploading, setUploading] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    // Load document config and existing documents
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Get document config for entity type
            const configResponse = await documentsApi.getConfig();
            if (configResponse.success) {
                setDocumentConfig(configResponse.documents || {});
            }

            // Get existing documents
            const docsResponse = await documentsApi.list();
            if (docsResponse.success) {
                setDocuments(docsResponse.documents || {});
            }
        } catch (err) {
            setError('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (type, file) => {
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            setError('Invalid file type. Only JPG, PNG, PDF allowed.');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setError('File too large. Maximum size is 5MB.');
            return;
        }

        setUploading(prev => ({ ...prev, [type]: true }));
        setError('');

        try {
            const response = await documentsApi.upload(type, file);
            if (response.success) {
                // Reload documents to get updated list
                await loadData();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleDelete = async (type) => {
        const config = documentConfig[type];
        if (!confirm(`Delete ${config?.name || type}?`)) return;

        try {
            const response = await documentsApi.delete(type);
            if (response.success) {
                await loadData();
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleProceed = async () => {
        setError('');

        try {
            const response = await documentsApi.validate();
            if (!response.valid) {
                const missingNames = response.missing.map(m => m.name).join(', ');
                setError(`Please upload mandatory documents: ${missingNames}`);
                return;
            }
            nextStep();
        } catch (err) {
            setError(err.message);
        }
    };

    const renderDocumentCard = (type) => {
        const config = documentConfig[type];
        if (!config) return null;

        const doc = documents[type] || {};
        const isUploading = uploading[type];

        return (
            <div
                key={type}
                className={`p-5 rounded-2xl border transition-all ${doc.uploaded
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                    : config.mandatory
                        ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/30'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${doc.uploaded
                            ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                            : 'bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500'
                            }`}>
                            {doc.uploaded ? (
                                <CheckCircle2 className="w-6 h-6 text-white" />
                            ) : (
                                <FileText className="w-6 h-6 text-slate-400 dark:text-slate-300" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">{config.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {config.mandatory ? 'Required document' : 'Optional document'}
                            </p>
                        </div>
                    </div>
                    {config.mandatory && !doc.uploaded && (
                        <span className="px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-full border border-amber-200 dark:border-amber-800/50">
                            Required
                        </span>
                    )}
                </div>

                {/* Upload Area or Preview */}
                {doc.uploaded ? (
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                <FileCheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">File Uploaded</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Just now'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <a
                                href={documentsApi.getFile(type)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="View Document"
                            >
                                <Eye className="w-5 h-5" />
                            </a>
                            <button
                                onClick={() => handleDelete(type)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete Document"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <label className={`group flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isUploading
                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                        }`}>
                        <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={(e) => handleUpload(type, e.target.files[0])}
                            disabled={isUploading}
                            className="hidden"
                        />
                        {isUploading ? (
                            <>
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Uploading...</span>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="w-6 h-6 text-slate-400 dark:text-slate-300 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Click to upload or drag & drop
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    JPG, PNG or PDF (max 5MB)
                                </span>
                            </>
                        )}
                    </label>
                )}
            </div>
        );
    };

    // Get button text based on entity type
    const getNextStepText = () => {
        if (entityType === 'partnership') {
            return 'Continue to Bank Verification';
        }
        return 'Continue to References';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    // Check if any documents are configured
    const docTypes = Object.keys(documentConfig);
    if (docTypes.length === 0) {
        return (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Documents Required</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8">No specific documents are required for this entity type.</p>
                <button
                    onClick={() => nextStep()}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mx-auto"
                >
                    Continue
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border border-white/50 dark:border-slate-700/50 p-8">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25">
                    <FileText className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Business Documents</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Upload your business documents. Items marked as required must be uploaded.
                </p>
            </div>

            {/* Error */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3"
                >
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
                    </div>
                </motion.div>
            )}

            {/* Document Cards */}
            <div className="space-y-6 mb-8">
                {docTypes.map(type => renderDocumentCard(type))}
            </div>

            {/* Proceed Button */}
            <button
                onClick={handleProceed}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
                {getNextStepText()}
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
}

function FileCheckIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="m9 15 2 2 4-4" />
        </svg>
    )
}
