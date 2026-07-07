import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Monitor, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        const result = await login(username, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center relative overflow-hidden">
            {/* Ambient gradient orbs */}
            <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-accent/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-violet-500/15 rounded-full blur-[120px]" />
            <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] bg-device-kit/10 rounded-full blur-[100px]" />

            <div className="glass w-full max-w-md p-10 relative z-10 rounded-3xl shadow-soft-xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent to-violet-600 mb-4 shadow-soft-md">
                        <Monitor className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">IT Inventory</h1>
                    <p className="text-muted mt-2 text-sm">Enterprise Asset Management</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-danger/10 border border-danger/20 rounded-xl p-3.5 flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-danger mt-0.5" />
                            <p className="text-sm text-danger">{error}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200 ml-1">Username</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-muted" />
                            </div>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full pl-11 pr-3.5 py-3 bg-white/50 dark:bg-white/5 border border-slate-300/50 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-muted focus-ring transition-all duration-200"
                                placeholder="Enter your username"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200 ml-1">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-muted" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-11 pr-10 py-3 bg-white/50 dark:bg-white/5 border border-slate-300/50 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-muted focus-ring transition-all duration-200"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-accent transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-violet-600 hover:from-violet-600 hover:to-accent text-white font-semibold py-3.5 rounded-xl shadow-soft-md transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Signing in...
                            </span>
                        ) : (
                            <>
                                Sign In <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-muted">
                        Restricted Access • Authorized Personnel Only
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
