/**
 * Bank Step Component
 * Bank verification: IFSC lookup → Account verification (Penny Drop/Penniless)
 * Premium design with proper alignment
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Landmark,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Building2,
    CreditCard,
    Search,
    Hash,
    ChevronRight
} from 'lucide-react';
import { bankApi } from '../../services/api';
import { useApplicationStore } from '../../store/applicationStore';

export default function BankStep({ onComplete }) {
    const { setBank, bank: storeBank } = useApplicationStore();

    // State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // IFSC state
    const [ifsc, setIfsc] = useState('');
    const [bankDetails, setBankDetails] = useState(null);

    // Account state
    const [accountNumber, setAccountNumber] = useState('');
    const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
    const [verificationMethod, setVerificationMethod] = useState('penniless');
    const [verified, setVerified] = useState(false);
    const [verifiedData, setVerifiedData] = useState(null);

    // Load existing bank data on mount
    useEffect(() => {
        loadBankStatus();
    }, []);

    const loadBankStatus = async () => {
        try {
            const response = await bankApi.getStatus();

            if (response.success && response.bank?.verified) {
                const bankData = response.bank;
                setIfsc(bankData.ifsc || '');
                setAccountNumber(bankData.accountNumber || '');
                setConfirmAccountNumber(bankData.accountNumber || '');
                setVerified(true);
                setVerifiedData({
                    holderName: bankData.holderName,
                    accountNumber: bankData.accountNumber,
                    ifsc: bankData.ifsc
                });
                setBankDetails({
                    bank: bankData.bankName,
                    branch: bankData.branchName
                });
                setBank(bankData);
            }
        } catch (err) {
            console.log('Bank status not available:', err.message);
        }
    };

    // Verify IFSC
    const verifyIfsc = async () => {
        if (ifsc.length !== 11) {
            setError('IFSC must be 11 characters');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await bankApi.verifyIfsc(ifsc);

            if (response.success) {
                setBankDetails(response.bankDetails);
            } else {
                setError(response.error || 'Invalid IFSC code');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Verify Bank Account
    const verifyAccount = async () => {
        if (accountNumber !== confirmAccountNumber) {
            setError('Account numbers do not match');
            return;
        }

        if (accountNumber.length < 9 || accountNumber.length > 18) {
            setError('Account number must be 9-18 digits');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await bankApi.verifyAccount({
                ifsc,
                accountNumber,
                method: verificationMethod
            });

            if (response.success && response.verified) {
                setVerified(true);
                setVerifiedData(response.bankDetails);

                setBank({
                    verified: true,
                    accountNumber: response.bankDetails?.accountNumber || accountNumber,
                    ifsc: response.bankDetails?.ifsc || ifsc,
                    holderName: response.bankDetails?.holderName,
                    bankName: bankDetails?.bank,
                    branchName: bankDetails?.branch,
                    verificationMethod
                });
            } else {
                setError(response.error || 'Bank verification failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Format IFSC for display
    const formatIfsc = (value) => {
        return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    };

    if (verified) {
        return (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border border-white/50 dark:border-slate-700/50 p-8">
                <div className="text-center py-6">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30"
                    >
                        <CheckCircle2 className="w-10 h-10 text-white" />
                    </motion.div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Bank Account Verified!
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Your bank account has been successfully verified.
                    </p>

                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 max-w-md mx-auto">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-600">
                                <span className="text-sm text-slate-500">Account Holder</span>
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{verifiedData?.holderName}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-600">
                                <span className="text-sm text-slate-500">Account Number</span>
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                    ****{accountNumber.slice(-4)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-600">
                                <span className="text-sm text-slate-500">Bank</span>
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{bankDetails?.bank}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-slate-500">Branch</span>
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{bankDetails?.branch}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onComplete}
                        className="mt-8 px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 mx-auto"
                    >
                        Continue to References
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border border-white/50 dark:border-slate-700/50 p-8">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
                    <Landmark className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Bank Verification
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Verify your bank account for payout processing
                </p>
            </div>

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

            <div className="space-y-6">
                {/* IFSC Input */}
                <div className="bg-slate-50/80 dark:bg-slate-700/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/30">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        IFSC Code <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={ifsc}
                            onChange={(e) => {
                                setIfsc(formatIfsc(e.target.value));
                                setBankDetails(null);
                            }}
                            placeholder="e.g., SBIN0001234"
                            className="flex-1 px-5 py-3.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase text-lg font-mono tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400"
                            maxLength={11}
                        />
                        <button
                            onClick={verifyIfsc}
                            disabled={loading || ifsc.length !== 11}
                            className="px-6 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            <span className="hidden sm:inline">Lookup</span>
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Enter your bank's 11-character IFSC code to find the branch</p>
                </div>

                {/* Bank Details */}
                {bankDetails && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <p className="font-semibold text-emerald-800 dark:text-emerald-200 text-lg">
                                    {bankDetails.bank}
                                </p>
                                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                    {bankDetails.branch}
                                </p>
                                {bankDetails.address && (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                        {bankDetails.address}
                                    </p>
                                )}
                            </div>
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                    </motion.div>
                )}

                {/* Account Details (only show after IFSC verified) */}
                {bankDetails && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-slate-50/80 dark:bg-slate-700/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/30 space-y-5"
                    >
                        <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-500" />
                            Account Details
                        </h4>

                        {/* Account Number */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Account Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 18))}
                                placeholder="Enter account number"
                                className="w-full px-4 py-3.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono tracking-wider"
                            />
                        </div>

                        {/* Confirm Account Number */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Confirm Account Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={confirmAccountNumber}
                                onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 18))}
                                placeholder="Re-enter account number"
                                className={`w-full px-4 py-3.5 border rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono tracking-wider ${confirmAccountNumber && accountNumber !== confirmAccountNumber
                                    ? 'border-red-500 ring-2 ring-red-100'
                                    : confirmAccountNumber && accountNumber === confirmAccountNumber
                                        ? 'border-emerald-500 ring-2 ring-emerald-100'
                                        : 'border-slate-200 dark:border-slate-600'
                                    }`}
                            />
                            {confirmAccountNumber && accountNumber !== confirmAccountNumber && (
                                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Account numbers don't match
                                </p>
                            )}
                            {confirmAccountNumber && accountNumber === confirmAccountNumber && (
                                <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Account numbers match
                                </p>
                            )}
                        </div>



                        {/* Verify Button */}
                        <button
                            onClick={verifyAccount}
                            disabled={loading || !accountNumber || accountNumber !== confirmAccountNumber}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-5 h-5" />
                                    Verify Account
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
