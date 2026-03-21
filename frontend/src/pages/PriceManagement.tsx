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
    const [activeCategory, setActiveCategory] = useState<string>('all');

    useEffect(() => {
        fetchPrices();
    }, []);

    const fetchPrices = async () => {
        try {
            setLoading(true);
            const res = await api.get('/prices');
            const data = (res.data && Array.isArray(res.data.prices)) ? res.data.prices : (Array.isArray(res.data) ? res.data : []);
            setPrices(data);
            if (data.length === 0) setError("No prices found.");
        } catch (err: any) {
            setError('Failed to load price list');
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
                id: item.id,
                price: item.price
            });

            setSuccess(`Updated successfully!`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(`Failed to update`);
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

    const categories = ['all', 'Service', 'Haematology', 'Serology', 'Microbiology', 'Biochemistry'];
    const filteredPrices = activeCategory === 'all' ? prices : prices.filter(p => (p as any).category === activeCategory);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Banknote className="w-8 h-8 text-emerald-500" />
                        Billing & Prices
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Configure granular fees for all hospital services and tests.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-500/20 rounded-2xl text-xs font-bold uppercase tracking-widest w-fit">
                    <ShieldCheck className="w-4 h-4" />
                    Admin Access Only
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeCategory === cat ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-md translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        {cat === 'all' ? 'All Items' : cat}
                    </button>
                ))}
            </div>

            {/* Notifications */}
            <div className="fixed bottom-8 right-8 z-50 space-y-2 pointer-events-none">
                {error && (
                    <div className="bg-red-600 text-white p-4 rounded-2xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-right-full pointer-events-auto">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="bg-emerald-600 text-white p-4 rounded-2xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-right-full pointer-events-auto">
                        <CheckCircle2 className="w-5 h-5" />
                        <p className="text-sm font-bold">{success}</p>
                    </div>
                )}
            </div>

            {/* Price Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Name</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Price (₦)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredPrices.map((item) => (
                                <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                                                item.item_type === 'consultation' ? 'bg-blue-100 text-blue-600' :
                                                item.item_type === 'lab_test' ? 'bg-purple-100 text-purple-600' :
                                                'bg-orange-100 text-orange-600'
                                            }`}>
                                                {item.item_type === 'consultation' ? 'C' : item.item_type === 'lab_test' ? 'L' : 'P'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{item.item_name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium tracking-tight">ID: {item.id.substring(0,8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                            {(item as any).category || 'General'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="relative w-32">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₦</span>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-7 pr-3 text-sm font-bold text-slate-900 dark:text-white focus:border-brand-500 outline-none transition-all"
                                                value={item.price}
                                                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleSave(item)}
                                            disabled={saving === item.id}
                                            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
                                        >
                                            {saving === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                            Update
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredPrices.length === 0 && (
                    <div className="p-20 text-center">
                        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No items found in this category.</p>
                    </div>
                )}
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
