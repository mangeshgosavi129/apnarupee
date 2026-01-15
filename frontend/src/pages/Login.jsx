/**
 * Login Page - Premium Design
 * Phone + Email entry with OTP verification
 * Features: Glassmorphism, gradients, animations, spacious layout
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, ArrowLeft, ArrowRight, CheckCircle, Loader2, Shield, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApplicationStore } from '../store/applicationStore';
import { authApi } from '../services/api';

// Validation schemas
const loginSchema = z.object({
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
    email: z.string().email('Enter a valid email address')
});

const otpSchema = z.object({
    otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numbers only')
});

export default function Login() {
    const navigate = useNavigate();
    const [step, setStep] = useState('login'); // 'login' | 'otp' | 'success'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [phone, setPhone] = useState('');
    const [devOtp, setDevOtp] = useState(null);

    const { entityType, setAuth, setApplicationId, setStep: setAppStep } = useApplicationStore();

    // Login form
    const loginForm = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: { phone: '', email: '' }
    });

    // OTP form
    const otpForm = useForm({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: '' }
    });

    // Handle login submit
    const handleLoginSubmit = async (data) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.sendOtp({
                phone: data.phone,
                email: data.email,
                entityType: entityType
            });

            setPhone(data.phone);
            if (response.devOtp) {
                setDevOtp(response.devOtp);
            }
            setStep('otp');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP submit
    const handleOtpSubmit = async (data) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.verifyOtp({
                phone,
                otp: data.otp
            });

            // Set auth state
            setAuth(response.user, response.token);
            setApplicationId(response.application.id);
            setAppStep(response.application.currentStep || 0);

            setStep('success');

            // Redirect after short delay
            setTimeout(() => {
                navigate('/onboarding');
            }, 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResend = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.resendOtp(phone);
            if (response.devOtp) {
                setDevOtp(response.devOtp);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const entityLabels = {
        individual: 'Individual',
        proprietorship: 'Sole Proprietorship',
        partnership: 'Partnership Firm',
        company: 'Pvt Ltd / LLP / OPC'
    };

    const entityColors = {
        individual: 'from-blue-500 to-indigo-600',
        proprietorship: 'from-emerald-500 to-teal-600',
        partnership: 'from-violet-500 to-purple-600',
        company: 'from-orange-500 to-rose-600'
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30" />

            {/* Floating gradient orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />

            {/* Content */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-12">

                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-full shadow-lg border border-white/50 dark:border-slate-700/50">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="text-white font-bold text-lg">₹</span>
                        </div>
                        <span className="text-xl font-bold text-slate-800 dark:text-white">
                            GraphSense Solutions
                        </span>
                    </div>
                </motion.div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-lg"
                >
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 p-10 sm:p-12 border border-white/60 dark:border-slate-700/50">

                        {/* Back button */}
                        {step === 'login' && (
                            <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={() => navigate('/')}
                                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white mb-8 transition-colors group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                <span className="text-sm">Change Entity Type</span>
                            </motion.button>
                        )}

                        {/* Entity Badge */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${entityColors[entityType] || 'from-blue-500 to-indigo-600'} rounded-full text-sm font-medium text-white shadow-lg mb-8`}
                        >
                            <Sparkles className="w-4 h-4" />
                            {entityLabels[entityType] || 'DSA'}
                        </motion.div>

                        <AnimatePresence mode="wait">
                            {/* Step 1: Login Form */}
                            {step === 'login' && (
                                <motion.div
                                    key="login"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
                                        Let's get started
                                    </h2>
                                    <p className="text-slate-600 dark:text-slate-400 mb-10 text-lg">
                                        Enter your mobile number and email to continue
                                    </p>

                                    <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-8">
                                        {/* Phone Input */}
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                                Mobile Number
                                            </label>
                                            <div className="relative flex items-center gap-3">
                                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/25">
                                                    <Phone className="w-6 h-6 text-white" />
                                                </div>
                                                <input
                                                    {...loginForm.register('phone')}
                                                    type="tel"
                                                    placeholder="Enter 10-digit mobile"
                                                    maxLength={10}
                                                    className="flex-1 px-5 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-lg"
                                                />
                                            </div>
                                            {loginForm.formState.errors.phone && (
                                                <p className="text-red-500 text-sm mt-3 flex items-center gap-2 ml-17">
                                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                                    {loginForm.formState.errors.phone.message}
                                                </p>
                                            )}
                                        </div>

                                        {/* Email Input */}
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                                Email Address
                                            </label>
                                            <div className="relative flex items-center gap-3">
                                                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/25">
                                                    <Mail className="w-6 h-6 text-white" />
                                                </div>
                                                <input
                                                    {...loginForm.register('email')}
                                                    type="email"
                                                    placeholder="Enter your email"
                                                    className="flex-1 px-5 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all text-lg"
                                                />
                                            </div>
                                            {loginForm.formState.errors.email && (
                                                <p className="text-red-500 text-sm mt-3 flex items-center gap-2 ml-17">
                                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                                    {loginForm.formState.errors.email.message}
                                                </p>
                                            )}
                                        </div>

                                        {/* Error */}
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
                                            >
                                                {error}
                                            </motion.div>
                                        )}

                                        {/* Submit */}
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 transition-all disabled:opacity-70 disabled:cursor-not-allowed text-lg"
                                        >
                                            {loading ? (
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                            ) : (
                                                <>
                                                    Get OTP <ArrowRight className="w-5 h-5" />
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    {/* Security note */}
                                    <p className="text-center text-sm text-slate-400 mt-8 flex items-center justify-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        Your data is encrypted and secure
                                    </p>
                                </motion.div>
                            )}

                            {/* Step 2: OTP Verification */}
                            {step === 'otp' && (
                                <motion.div
                                    key="otp"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <button
                                        onClick={() => setStep('login')}
                                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white mb-8 transition-colors group"
                                    >
                                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                        <span className="text-sm">Change Number</span>
                                    </button>

                                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
                                        Verify OTP
                                    </h2>
                                    <p className="text-slate-600 dark:text-slate-400 mb-2 text-lg">
                                        Enter the 6-digit code sent to
                                    </p>
                                    <p className="text-xl font-semibold text-slate-900 dark:text-white mb-10 flex items-center gap-2">
                                        <Phone className="w-5 h-5 text-blue-500" />
                                        +91 {phone.substring(0, 2)}••••{phone.substring(6)}
                                    </p>

                                    {/* Dev mode OTP hint */}
                                    {devOtp && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-base mb-8"
                                        >
                                            <strong>Dev Mode:</strong> OTP is <code className="font-mono font-bold text-xl bg-amber-200 dark:bg-amber-800 px-3 py-1 rounded-lg ml-2">{devOtp}</code>
                                        </motion.div>
                                    )}

                                    <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-8">
                                        {/* OTP Input */}
                                        <div>
                                            <input
                                                {...otpForm.register('otp')}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                placeholder="• • • • • •"
                                                className="w-full text-center text-4xl tracking-[0.6em] py-6 rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                                            />
                                            {otpForm.formState.errors.otp && (
                                                <p className="text-red-500 text-sm mt-3 text-center">{otpForm.formState.errors.otp.message}</p>
                                            )}
                                        </div>

                                        {/* Error */}
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
                                            >
                                                {error}
                                            </motion.div>
                                        )}

                                        {/* Submit */}
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 transition-all disabled:opacity-70 text-lg"
                                        >
                                            {loading ? (
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                            ) : (
                                                <>
                                                    Verify & Continue <ArrowRight className="w-5 h-5" />
                                                </>
                                            )}
                                        </button>

                                        {/* Resend */}
                                        <button
                                            type="button"
                                            onClick={handleResend}
                                            disabled={loading}
                                            className="w-full py-4 text-blue-600 dark:text-blue-400 hover:underline text-base font-medium"
                                        >
                                            Didn't receive? Resend OTP
                                        </button>
                                    </form>
                                </motion.div>
                            )}

                            {/* Step 3: Success */}
                            {step === 'success' && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-12"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                                        className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/40"
                                    >
                                        <CheckCircle className="w-14 h-14 text-white" />
                                    </motion.div>
                                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
                                        Verified!
                                    </h2>
                                    <p className="text-lg text-slate-600 dark:text-slate-400">
                                        Redirecting to your dashboard...
                                    </p>
                                    <div className="mt-8 flex justify-center">
                                        <div className="w-12 h-1.5 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse"></div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Footer */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-sm text-slate-400 mt-10"
                >
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </motion.p>
            </div>
        </div>
    );
}
