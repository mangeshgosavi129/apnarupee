/**
 * Entity Selection Page - Premium Design
 * First step - user selects their entity type
 * Features: Glassmorphism, gradients, responsive grid, micro-animations
 */
import { motion } from 'framer-motion';
import { User, Building2, Users, Briefcase, ArrowRight, Shield, CheckCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApplicationStore } from '../store/applicationStore';

const entities = [
    {
        id: 'individual',
        name: 'Individual',
        icon: User,
        desc: 'Single person DSA agent',
        fullDesc: 'Perfect for freelancers and independent agents',
        color: 'from-blue-500 to-indigo-600',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600'
    },
    {
        id: 'proprietorship',
        name: 'Sole Proprietorship',
        icon: Briefcase,
        desc: 'Single owner business',
        fullDesc: 'Shop Act registered businesses & traders',
        color: 'from-emerald-500 to-teal-600',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600'
    },
    {
        id: 'partnership',
        name: 'Partnership Firm',
        icon: Users,
        desc: '2 or more partners',
        fullDesc: 'For registered partnership firms',
        color: 'from-violet-500 to-purple-600',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/20',
        iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600'
    },
    {
        id: 'company',
        name: 'Pvt Ltd / LLP / OPC',
        icon: Building2,
        desc: 'Registered company',
        fullDesc: 'Private Limited, LLP or One Person Company',
        color: 'from-orange-500 to-rose-600',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        iconBg: 'bg-gradient-to-br from-orange-500 to-rose-600'
    }
];

const features = [
    { icon: Shield, text: '100% Secure & Encrypted' },
    { icon: CheckCircle, text: 'Instant Verification' },
    { icon: Sparkles, text: 'Paperless Onboarding' }
];

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
};

const item = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring', stiffness: 100, damping: 12 }
    }
};

export default function EntitySelection() {
    const navigate = useNavigate();
    const setEntityType = useApplicationStore((state) => state.setEntityType);

    const handleSelect = (entityId) => {
        setEntityType(entityId);
        navigate('/login');
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30" />

            {/* Floating gradient orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 right-0 w-72 h-72 bg-gradient-to-br from-orange-400/15 to-rose-400/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />

            {/* Content */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">

                {/* Logo & Branding */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-6"
                >
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-full shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/50 dark:border-slate-700/50">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="text-white font-bold text-lg">₹</span>
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                            Graphsense Solutions
                        </span>
                    </div>
                </motion.div>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-center mb-10 max-w-2xl mx-auto"
                >
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                        <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-800 dark:from-white dark:via-slate-200 dark:to-slate-300 bg-clip-text text-transparent">
                            Become a
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                            DSA Partner
                        </span>
                    </h1>
                    <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                        Start your journey as a Direct Selling Agent. Select your entity type to begin your onboarding.
                    </p>
                </motion.div>

                {/* Feature Pills */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex flex-wrap justify-center gap-3 mb-10"
                >
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-full border border-slate-200/50 dark:border-slate-700/50 text-sm text-slate-600 dark:text-slate-400"
                        >
                            <feature.icon className="w-4 h-4 text-emerald-500" />
                            <span>{feature.text}</span>
                        </div>
                    ))}
                </motion.div>

                {/* Entity Cards Grid - 4 columns on large screens */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full max-w-6xl"
                >
                    {entities.map((entity) => (
                        <motion.button
                            key={entity.id}
                            variants={item}
                            whileHover={{ y: -8, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelect(entity.id)}
                            className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 hover:shadow-2xl hover:shadow-slate-300/50 dark:hover:shadow-slate-900/60 transition-all duration-500 border border-white/50 dark:border-slate-700/50 text-left overflow-hidden"
                        >
                            {/* Gradient overlay on hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${entity.color} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500`} />

                            {/* Top gradient line */}
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${entity.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                            {/* Icon */}
                            <div className={`relative w-14 h-14 ${entity.iconBg} rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                <entity.icon className="w-7 h-7 text-white" strokeWidth={2} />
                                {/* Glow effect */}
                                <div className={`absolute inset-0 ${entity.iconBg} rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
                            </div>

                            {/* Content */}
                            <div className="relative">
                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2 group-hover:gap-3 transition-all duration-300">
                                    {entity.name}
                                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                                    {entity.desc}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {entity.fullDesc}
                                </p>
                            </div>

                            {/* Bottom decorative element */}
                            <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl ${entity.color} opacity-[0.03] rounded-tl-full`} />
                        </motion.button>
                    ))}
                </motion.div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-12 text-center"
                >
                    <p className="text-sm text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
                        <Shield className="w-4 h-4" />
                        Secure onboarding powered by GraphSense Solutions
                    </p>
                    <p className="text-xs text-slate-300 dark:text-slate-600 mt-2">
                        Your data is protected with bank-grade encryption
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
