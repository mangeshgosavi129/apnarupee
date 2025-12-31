/**
 * Onboarding Page - Premium Design
 * Multi-step onboarding flow with progress indicator
 * Features: Glassmorphism, gradients, responsive, proper alignment
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApplicationStore } from '../store/applicationStore';
import {
    CheckCircle,
    Circle,
    IdCard,
    Landmark,
    Users,
    FileText,
    FileCheck,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Shield,
    Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Step components
import KycStep from '../components/steps/KycStep';
import BankStep from '../components/steps/BankStep';
import ReferencesStep from '../components/steps/ReferencesStep';
import AgreementStep from '../components/steps/AgreementStep';
import DocumentsStep from '../components/steps/DocumentsStep';
import PartnersStep from '../components/steps/PartnersStep';
import CompanyVerificationStep from '../components/steps/CompanyVerificationStep';
import DirectorKycStep from '../components/steps/DirectorKycStep';

// Steps configuration
const getSteps = (entityType) => {
    if (entityType === 'company') {
        return [
            { id: 'company', name: 'Company', icon: IdCard, component: CompanyVerificationStep },
            { id: 'directors', name: 'Director KYC', icon: Users, component: DirectorKycStep },
            { id: 'bank', name: 'Bank', icon: Landmark, component: BankStep },
            { id: 'documents', name: 'Documents', icon: FileText, component: DocumentsStep },
            { id: 'references', name: 'References', icon: Users, component: ReferencesStep },
            { id: 'agreement', name: 'Agreement', icon: FileCheck, component: AgreementStep }
        ];
    }

    if (entityType === 'partnership') {
        return [
            { id: 'partners', name: 'Partners', icon: Users, component: PartnersStep },
            { id: 'bank', name: 'Bank', icon: Landmark, component: BankStep },
            { id: 'documents', name: 'Documents', icon: FileText, component: DocumentsStep },
            { id: 'references', name: 'References', icon: Users, component: ReferencesStep },
            { id: 'agreement', name: 'Agreement', icon: FileCheck, component: AgreementStep }
        ];
    }

    const baseSteps = [
        { id: 'kyc', name: 'KYC', icon: IdCard, component: KycStep },
        { id: 'bank', name: 'Bank', icon: Landmark, component: BankStep },
        { id: 'references', name: 'References', icon: Users, component: ReferencesStep },
    ];

    if (entityType === 'proprietorship') {
        baseSteps.splice(2, 0, { id: 'documents', name: 'Documents', icon: FileText, component: DocumentsStep });
    }

    baseSteps.push({ id: 'agreement', name: 'Agreement', icon: FileCheck, component: AgreementStep });

    return baseSteps;
};

const entityColors = {
    individual: 'from-blue-500 to-indigo-600',
    proprietorship: 'from-emerald-500 to-teal-600',
    partnership: 'from-violet-500 to-purple-600',
    company: 'from-orange-500 to-rose-600'
};

export default function Onboarding() {
    const navigate = useNavigate();
    const { user, entityType, currentStep, setStep, logout } = useApplicationStore();

    const steps = getSteps(entityType);
    const activeStep = Math.min(currentStep, steps.length - 1);
    const StepComponent = steps[activeStep]?.component || KycStep;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const entityLabels = {
        individual: 'Individual',
        proprietorship: 'Sole Proprietorship',
        partnership: 'Partnership Firm',
        company: 'Pvt Ltd / LLP / OPC'
    };

    const progressPercent = ((activeStep + 1) / steps.length) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20">
            {/* Header */}
            <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo & Entity */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                                    <span className="text-white font-bold text-lg">₹</span>
                                </div>
                                <div className="hidden sm:block">
                                    <h1 className="text-base font-bold text-slate-900 dark:text-white">DSA Onboarding</h1>
                                    <p className="text-xs text-slate-500">Powered by Apna Rupee</p>
                                </div>
                            </div>

                            {/* Entity Badge */}
                            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r ${entityColors[entityType] || 'from-blue-500 to-indigo-600'} rounded-full text-xs font-medium text-white shadow-md`}>
                                <Sparkles className="w-3 h-3" />
                                {entityLabels[entityType]}
                            </div>
                        </div>

                        {/* Right Side */}
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {user?.phone || 'User'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Step {activeStep + 1} of {steps.length}
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-sm font-medium"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="pb-3">
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex gap-6">

                    {/* Sidebar - Fixed Width */}
                    <aside className="hidden lg:block w-64 flex-shrink-0">
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-5 sticky top-24 border border-slate-200/50 dark:border-slate-700/50">
                            <div className="flex items-center gap-2 mb-5">
                                <Shield className="w-4 h-4 text-blue-500" />
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Your Progress
                                </h3>
                            </div>

                            <div className="space-y-1.5">
                                {steps.map((step, index) => {
                                    const isActive = index === activeStep;
                                    const isCompleted = index < activeStep;

                                    return (
                                        <button
                                            key={step.id}
                                            onClick={() => setStep(index)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isActive
                                                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                                                    : isCompleted
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                                }`}
                                        >
                                            {/* Step Number/Check */}
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCompleted
                                                    ? 'bg-emerald-500 text-white'
                                                    : isActive
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-slate-200 dark:bg-slate-600 text-slate-500'
                                                }`}>
                                                {isCompleted ? (
                                                    <CheckCircle className="w-4 h-4" />
                                                ) : (
                                                    index + 1
                                                )}
                                            </div>

                                            {/* Step Name */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${isCompleted
                                                        ? 'text-emerald-700 dark:text-emerald-400'
                                                        : isActive
                                                            ? 'text-blue-700 dark:text-blue-400'
                                                            : 'text-slate-500 dark:text-slate-400'
                                                    }`}>
                                                    {step.name}
                                                </p>
                                                <p className={`text-xs ${isCompleted
                                                        ? 'text-emerald-600 dark:text-emerald-500'
                                                        : isActive
                                                            ? 'text-blue-600 dark:text-blue-500'
                                                            : 'text-slate-400'
                                                    }`}>
                                                    {isCompleted ? 'Completed' : isActive ? 'In Progress' : 'Pending'}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <p className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 text-center">
                                Click on any step to navigate
                            </p>
                        </div>
                    </aside>

                    {/* Main Content Area - Flexible Width */}
                    <div className="flex-1 min-w-0">
                        <motion.div
                            key={activeStep}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <StepComponent onComplete={() => setStep(Math.min(steps.length - 1, activeStep + 1))} />
                        </motion.div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setStep(Math.max(0, activeStep - 1))}
                                disabled={activeStep === 0}
                                className="flex items-center gap-1.5 px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all font-medium disabled:opacity-40 disabled:pointer-events-none"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </button>

                            {/* Step Dots */}
                            <div className="flex items-center gap-1.5">
                                {steps.map((_, index) => (
                                    <div
                                        key={index}
                                        className={`h-2 rounded-full transition-all ${index === activeStep
                                                ? 'w-6 bg-blue-500'
                                                : index < activeStep
                                                    ? 'w-2 bg-emerald-500'
                                                    : 'w-2 bg-slate-300 dark:bg-slate-600'
                                            }`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={() => setStep(Math.min(steps.length - 1, activeStep + 1))}
                                disabled={activeStep === steps.length - 1}
                                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-40 disabled:pointer-events-none"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
