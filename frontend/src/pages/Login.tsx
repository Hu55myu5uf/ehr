import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldAlert, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '../api/client';
import viisecLogo from '../assets/viisec-logo.png';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { username, password });
            const data = response.data;

            if (data.mfa_required) {
                localStorage.setItem('mfa_token', data.mfa_token);
                navigate('/mfa');
            } else {
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-lg p-8 rounded-2xl bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 shadow-2xl">
            <div className="flex flex-col items-center mb-8">
                <div className="p-3 bg-brand-500 rounded-xl mb-4 shadow-lg shadow-brand-500/20">
                    <ShieldAlert className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                    ViiSec EHR
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Secure Practitioner Portal</p>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3 animate-shake">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 ml-1">Username</label>
                    <div className="relative group">
                        <User className="absolute left-3 top-3 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                            placeholder="Practitioner ID or Email"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 ml-1">Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-12 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 group"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        'Sign In'
                    )}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/50 text-center space-y-3">
                <p className="text-sm text-slate-500 italic">
                    HIPAA Compliant Session Auditing Enabled
                </p>
                <a
                    href="https://viisec.onrender.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 hover:border-brand-500/50 hover:shadow-sm hover:shadow-brand-500/10 transition-all group"
                >
                    <img src={viisecLogo} alt="ViiSec" className="w-4 h-4 rounded-sm opacity-80 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] font-medium text-slate-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors tracking-wide">
                        Developed by ViiSec Software Solutions
                    </span>
                </a>
            </div>
        </div>
    );
}
