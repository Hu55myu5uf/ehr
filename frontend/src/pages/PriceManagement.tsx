import React, { useState, useEffect } from 'react';
import {
    Banknote,
    Save,
    Loader2,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    ShieldCheck
} from 'lucide-react';
import api from '../api/client';

interface PriceItem {
    id: string;
    item_type: string;
    item_name: string;
    price: number;
    updated_at: string;
}

export default function PriceManagement() {
    const [prices, setPrices] = useState<PriceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchPrices();
    }, []);

    const fetchPrices = async () => {
        try {
            setLoading(true);
            const res = await api.get('/prices');
            if (res.data && Array.isArray(res.data.prices)) {
                setPrices(res.data.prices);
                if (res.data.prices.length === 0) setError("API returned an empty price list array.");
            } else if (Array.isArray(res.data)) {
                setPrices(res.data);
                if (res.data.length === 0) setError("API returned an empty array directly.");
            } else {
                setError('Unexpected format: ' + JSON.stringify(res.data));
                setPrices([]);
            }
        } catch (err: any) {
            setError('Failed to load price list: ' + err.message + (err.response?.data ? ' - ' + JSON.stringify(err.response.data) : ''));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePriceChange = (id: string, value: string) => {
        setPrices(prev => prev.map(p =>
            p.id === id ? { ...p, price: parseFloat(value) || 0 } : p
        ));
    };

    const handleSave = async (item: PriceItem) => {
        try {
            setSaving(item.id);
            setError(null);
            setSuccess(null);

            await api.post('/prices/update', {
                item_type: item.item_type,
                price: item.price
            });

            setSuccess(`Updated ${item.item_name} successfully!`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(`Failed to update ${item.item_name}`);
            console.error(err);
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
                <p className="mt-4 text-slate-500 font-medium">Loading price configuration...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Banknote className="w-8 h-8 text-emerald-500" />
                        Billing Policy & Prices
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage global service fees for consultations, labs, and medications.
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-500/20 rounded-2xl text-xs font-bold uppercase tracking-widest">
                    <ShieldCheck className="w-4 h-4" />
                    Admin Access Only
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
                </div>
            )}
            {success && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 text-emerald-600 animate-in slide-in-from-top-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="text-sm font-bold uppercase tracking-tight">{success}</p>
                </div>
            )}

            {/* Price Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {prices.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm group hover:border-brand-500/50 transition-all duration-300">
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.item_type === 'consultation' ? 'bg-blue-100 text-blue-600' :
                                        item.item_type === 'lab_test' ? 'bg-purple-100 text-purple-600' :
                                            'bg-orange-100 text-orange-600'
                                    }`}>
                                    {item.item_type === 'consultation' ? <TrendingUp className="w-6 h-6" /> :
                                        item.item_type === 'lab_test' ? <Banknote className="w-6 h-6" /> :
                                            <Banknote className="w-6 h-6" />}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                    Base Rate
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase mb-1">
                                {item.item_name}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium mb-8">
                                Last updated: {new Date(item.updated_at).toLocaleDateString()}
                            </p>

                            <div className="mt-auto space-y-4">
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 font-bold">
                                        ₦
                                    </div>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-10 pr-4 text-xl font-black text-slate-900 dark:text-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                                        value={item.price}
                                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={() => handleSave(item)}
                                    disabled={saving === item.id}
                                    className="w-full bg-brand-600 hover:bg-brand-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-brand-500/20 disabled:opacity-50"
                                >
                                    {saving === item.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Update Fee
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Section */}
            <div className="bg-slate-900 text-white rounded-[3rem] p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <Banknote className="w-40 h-40" />
                </div>
                <div className="relative flex flex-col md:flex-row items-center gap-10">
                    <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-2xl shadow-emerald-500/40">
                        <AlertCircle className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h4 className="text-2xl font-bold mb-2 uppercase tracking-tight">Billing Impact Notice</h4>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-2xl font-medium">
                            Changes to these prices will take effect <strong>immediately</strong> for all new bills generated.
                            Existing bills and pending payments will retain the prices active at the time of their creation.
                            Please ensure clinical staff are notified of significant fee adjustments.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
