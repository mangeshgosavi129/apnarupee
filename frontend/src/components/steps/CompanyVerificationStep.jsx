/**
 * Company Verification Step Component
 * Handles CIN/LLPIN verification via MCA API and director display
 * Phase 7: Company (Pvt Ltd / LLP / OPC) workflow
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Building2,
    CheckCircle2,
    Circle,
    Loader2,
    ChevronRight,
    AlertCircle,
    Users,
    CreditCard,
    Search,
    FileCheck,
    Upload
} from 'lucide-react';
import api from '../../services/api';

export default function CompanyVerificationStep({ onComplete }) {
    // States
    const [currentPhase, setCurrentPhase] = useState('cin'); // cin, directors, pan, complete
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Company data
    const [cinOrLlpin, setCinOrLlpin] = useState('');
    const [companyVerified, setCompanyVerified] = useState(false);
    const [companyData, setCompanyData] = useState(null);
    const [directors, setDirectors] = useState([]);

    // Company PAN
    const [companyPanFile, setCompanyPanFile] = useState(null);
    const [companyPanUploaded, setCompanyPanUploaded] = useState(false);

    // Load existing data on mount
    useEffect(() => {
        loadCompanyData();
    }, []);

    const loadCompanyData = async () => {
        try {
            const response = await api.get('/company/details');
            if (response.data?.success && response.data?.company?.verified) {
                setCompanyData(response.data.company);
                setDirectors(response.data.directors || []);
                setCompanyVerified(true);
                setCinOrLlpin(response.data.company.cin || response.data.company.llpin);

                // Determine current phase
                if (response.data.company.pan?.uploaded) {
                    setCompanyPanUploaded(true);
                    setCurrentPhase('complete');
                } else {
                    setCurrentPhase('pan');
                }
            }
        } catch (err) {
            // No company verified yet, stay on first phase
        }
    };

    // Verify CIN/LLPIN
    const handleVerifyCompany = async () => {
        if (!cinOrLlpin.trim()) {
            setError('Please enter CIN or LLPIN');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/company/verify', {
                cinOrLlpin: cinOrLlpin.trim().toUpperCase()
            });

            if (response.data?.success) {
                setCompanyData(response.data.company);
                setDirectors(response.data.directors || []);
                setCompanyVerified(true);
                setCurrentPhase('directors');
            } else {
                setError(response.data?.error || 'Verification failed');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Company verification failed. Please check CIN/LLPIN.');
        } finally {
            setLoading(false);
        }
    };

    // Handle Company PAN upload
    const handlePanUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('documentType', 'company_pan');

            const response = await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data?.success) {
                setCompanyPanFile(file);
                setCompanyPanUploaded(true);
                setCurrentPhase('complete');
            } else {
                setError('Failed to upload Company PAN');
            }
        } catch (err) {
            setError('Upload failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Proceed to next step
    const handleProceedToDirectors = () => {
        setCurrentPhase('pan');
    };

    // Complete step
    const handleComplete = () => {
        if (onComplete) onComplete();
    };

    // Validation pattern info
    const getInputPlaceholder = () => {
        return 'Enter CIN (e.g., U12345AB1234ABC123456) or LLPIN (e.g., AAA-1234)';
    };

    return (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border border-white/50 dark:border-slate-700/50 p-8">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
                    <Building2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Company Verification</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Verify your company and directors
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

            {/* Phase: CIN/LLPIN Verification */}
            {currentPhase === 'cin' && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="max-w-xl mx-auto space-y-6"
                >
                    <div className="bg-slate-50/80 dark:bg-slate-700/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/30">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            Enter CIN or LLPIN
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={cinOrLlpin}
                                onChange={(e) => setCinOrLlpin(e.target.value.toUpperCase())}
                                placeholder="e.g. U12345AB1234ABC123456"
                                className="w-full pl-12 pr-4 py-3.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono tracking-wide"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            CIN: 21 characters for Private Limited / OPC
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            LLPIN: 7 characters for LLP (e.g. AAA-1234)
                        </p>
                    </div>

                    <button
                        onClick={handleVerifyCompany}
                        disabled={loading || !cinOrLlpin.trim()}
                        className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Verifying Details...
                            </>
                        ) : (
                            <>
                                Verify & Continue
                                <ChevronRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </motion.div>
            )}

            {/* Phase: Directors Display */}
            {currentPhase === 'directors' && companyData && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                >
                    {/* Company Details Card */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Company Verified</h3>
                                <p className="text-sm text-emerald-600 dark:text-emerald-400">{companyData.name}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                <p className="text-slate-500 dark:text-slate-400 mb-1">Registration No.</p>
                                <p className="font-mono font-medium text-slate-900 dark:text-white">{companyData.cin || companyData.llpin}</p>
                            </div>
                            <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                <p className="text-slate-500 dark:text-slate-400 mb-1">Incorporation Date</p>
                                <p className="font-medium text-slate-900 dark:text-white">{companyData.dateOfIncorporation}</p>
                            </div>
                            <div className="col-span-1 sm:col-span-2 p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                <p className="text-slate-500 dark:text-slate-400 mb-1">Registered Address</p>
                                <p className="font-medium text-slate-900 dark:text-white">{companyData.registeredAddress}</p>
                            </div>
                        </div>
                    </div>

                    {/* Directors List */}
                    <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-500" />
                                Directors / Partners
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                    {directors.length} Found
                                </span>
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {directors.map((director, index) => (
                                <div key={index} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 shadow-sm">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                        {director.name?.charAt(0) || 'D'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-slate-900 dark:text-white truncate">{director.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span>DIN: {director.din}</span>
                                            <span>•</span>
                                            <span>{director.designation}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-xl">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p>Please review the directors list carefully. You will need to complete KYC for each director in the next steps.</p>
                        </div>

                        <button
                            onClick={handleProceedToDirectors}
                            className="w-full mt-6 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                        >
                            Confirm & Continue
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Phase: Company PAN Upload */}
            {currentPhase === 'pan' && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="max-w-xl mx-auto"
                >
                    <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CreditCard className="w-8 h-8 text-orange-500" />
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Upload Company PAN</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-8">
                            Please upload the PAN card for <span className="font-semibold text-slate-900 dark:text-white">{companyData?.name}</span>
                        </p>

                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handlePanUpload}
                                className="hidden"
                                id="company-pan-upload"
                                disabled={loading}
                            />
                            <label
                                htmlFor="company-pan-upload"
                                className={`block w-full border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all ${companyPanUploaded
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                                    : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                                    }`}
                            >
                                {loading ? (
                                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                                ) : companyPanUploaded ? (
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                                ) : (
                                    <CloudUploadIcon className="w-10 h-10 text-slate-400 mx-auto mb-4" />
                                )}

                                <p className={`font-semibold ${companyPanUploaded ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {companyPanUploaded ? 'PAN Card Uploaded Successfully' : 'Click to Upload PAN Card'}
                                </p>
                                {!companyPanUploaded && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                        Support for JPG, PNG or PDF (Max 5MB)
                                    </p>
                                )}
                            </label>
                        </div>

                        {companyPanUploaded && (
                            <button
                                onClick={handleComplete}
                                className="w-full mt-6 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                            >
                                Continue to Director KYC
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Phase: Complete */}
            {currentPhase === 'complete' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                >
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30">
                        <CheckCircle2 className="w-12 h-12 text-white" />
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Company Verified!
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                        <span className="font-semibold text-slate-900 dark:text-white">{companyData?.name}</span> has been successfully verified.
                    </p>

                    <button
                        onClick={handleComplete}
                        className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 mx-auto"
                    >
                        Proceed to Director KYC
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </motion.div>
            )}
        </div>
    );
}

function CloudUploadIcon(props) {
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
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M12 12v9" />
            <path d="m16 16-4-4-4 4" />
        </svg>
    );
}
