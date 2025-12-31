/**
 * References Step Component
 * Collect 2 reference contacts for the DSA agreement
 * Premium design with proper alignment
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    User,
    Phone,
    Mail,
    MapPin,
    CheckCircle2,
    Loader2,
    AlertCircle,
    ChevronRight
} from 'lucide-react';
import { referencesApi } from '../../services/api';

export default function ReferencesStep({ onComplete }) {
    // State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [references, setReferences] = useState([
        { name: '', mobile: '', email: '', address: '' },
        { name: '', mobile: '', email: '', address: '' }
    ]);
    const [isComplete, setIsComplete] = useState(false);

    // Load existing references
    useEffect(() => {
        loadReferences();
    }, []);

    const loadReferences = async () => {
        try {
            const response = await referencesApi.get();
            if (response.success && response.references?.length >= 2) {
                setReferences(response.references);
                setIsComplete(response.complete);
            }
        } catch (err) {
            console.error('Failed to load references:', err);
        }
    };

    // Update reference field
    const updateReference = (index, field, value) => {
        const updated = [...references];
        updated[index] = { ...updated[index], [field]: value };
        setReferences(updated);
    };

    // Validate references
    const validateReferences = () => {
        for (let i = 0; i < 2; i++) {
            const ref = references[i];
            if (!ref.name || ref.name.trim().split(/\s+/).length < 2) {
                setError(`Reference ${i + 1}: Full name required (first and last name)`);
                return false;
            }
            if (!ref.mobile || !/^[6-9]\d{9}$/.test(ref.mobile)) {
                setError(`Reference ${i + 1}: Valid 10-digit mobile number required`);
                return false;
            }
            if (!ref.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ref.email)) {
                setError(`Reference ${i + 1}: Valid email address is required`);
                return false;
            }
            if (!ref.address || ref.address.trim().length < 10) {
                setError(`Reference ${i + 1}: Full address is required (min 10 characters)`);
                return false;
            }
        }
        return true;
    };

    // Save references
    const handleSubmit = async () => {
        setError('');

        if (!validateReferences()) {
            return;
        }

        setLoading(true);

        try {
            const response = await referencesApi.save(references);
            if (response.success) {
                setIsComplete(true);
                onComplete?.();
            } else {
                setError(response.error || 'Failed to save references');
            }
        } catch (err) {
            setError(err.message || 'Failed to save references');
        } finally {
            setLoading(false);
        }
    };

    // Render reference form
    const renderReferenceForm = (index) => (
        <div className="bg-slate-50/80 dark:bg-slate-700/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/30">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md text-white text-sm font-bold">
                    {index + 1}
                </div>
                Reference {index + 1}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={references[index].name}
                        onChange={(e) => updateReference(index, 'name', e.target.value)}
                        placeholder="Enter full name"
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                </div>

                {/* Mobile */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="tel"
                        value={references[index].mobile}
                        onChange={(e) => updateReference(index, 'mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit mobile number"
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                        maxLength={10}
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        value={references[index].email}
                        onChange={(e) => updateReference(index, 'email', e.target.value)}
                        placeholder="email@example.com"
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                        required
                    />
                </div>

                {/* Address */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Full Address <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={references[index].address}
                        onChange={(e) => updateReference(index, 'address', e.target.value)}
                        placeholder="House/flat, street, city, state, pincode"
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                        required
                    />
                </div>
            </div>
        </div>
    );

    // Render complete state
    if (isComplete) {
        return (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border border-white/50 dark:border-slate-700/50 p-8">
                <div className="text-center py-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30"
                    >
                        <CheckCircle2 className="w-10 h-10 text-white" />
                    </motion.div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        References Saved!
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Your reference contacts have been saved.
                    </p>

                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 max-w-md mx-auto space-y-3 text-left">
                        {references.map((ref, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700 rounded-lg">
                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 dark:text-white truncate">{ref.name}</p>
                                    <p className="text-sm text-slate-500 truncate">{ref.mobile} • {ref.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={onComplete}
                        className="mt-6 px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 mx-auto"
                    >
                        Continue to Agreement
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
                    <Users className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reference Contacts</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Please provide 2 reference contacts for your application
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

            {/* Reference Forms */}
            <div className="space-y-6">
                {renderReferenceForm(0)}
                {renderReferenceForm(1)}
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full mt-8 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        Save References
                        <ChevronRight className="w-5 h-5" />
                    </>
                )}
            </button>
        </div>
    );
}
