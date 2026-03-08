import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import api from '../api/client';

export default function Mfa() {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const mfaToken = localStorage.getItem('mfa_token');
        if (!mfaToken) {
            navigate('/login');
            return;
        }

        try {
            const response = await api.post('/auth/verify-mfa', {
                mfa_token: mfaToken,
                code
            });

            const data = response.data;
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.removeItem('mfa_token');
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid verification code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 rounded-2xl bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
            <div className="flex flex-col items-center mb-8">
                <div className="p-3 bg-brand-500 rounded-xl mb-4 shadow-lg shadow-brand-500/20">
                    <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Verification Required</h1>
                <p className="text-slate-400 mt-2 text-center">
                    Enter the 6-digit security code from your authenticator app
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1 text-center">Security Code</label>
                    <div className="relative group">
                        <KeyRound className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type="text"
                            required
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-white text-center text-2xl tracking-[0.5em] placeholder-slate-800 font-mono"
                            placeholder="000000"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || code.length !== 6}
                    className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Verify & Sign In <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full text-sm text-slate-500 hover:text-slate-400 transition-colors"
                >
                    Return to Login
                </button>
            </form>
        </div>
    );
}
