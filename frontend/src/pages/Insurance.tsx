import React, { useEffect, useState } from 'react';
import { 
    Shield, 
    Plus, 
    Search, 
    Building2, 
    FileText, 
    ChevronRight, 
    Activity,
    CreditCard,
    CheckCircle2,
    Clock,
    XCircle,
    Download,
    Printer,
    Edit3,
    History,
    AlertCircle,
    Loader2
} from 'lucide-react';
import api from '../api/client';

interface Provider {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    status: 'active' | 'inactive';
}

interface Claim {
    id: string;
    claim_number: string;
    bill_number: string;
    first_name: string;
    last_name: string;
    provider_name: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'paid';
    created_at: string;
}

export default function Insurance() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'dashboard' | 'providers' | 'claims'>('dashboard');
    const [providerSearch, setProviderSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [currentProvider, setCurrentProvider] = useState<Partial<Provider>>({ status: 'active' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [pRes, cRes] = await Promise.all([
                api.get('/insurance/providers'),
                api.get('/insurance/claims-report')
            ]);
            setProviders(Array.isArray(pRes.data) ? pRes.data : []);
            setClaims(Array.isArray(cRes.data) ? cRes.data : []);
        } catch (err) {
            console.error('Failed to fetch insurance data', err);
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (claims.length === 0) return;
        
        const headers = ["Claim Number", "Bill Number", "Patient", "Provider", "Amount", "Status", "Date"];
        const rows = claims.map(c => [
            c.claim_number,
            c.bill_number,
            `${c.first_name} ${c.last_name}`,
            c.provider_name,
            c.amount,
            c.status,
            new Date(c.created_at).toLocaleDateString()
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(e => e.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `insurance_claims_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSaveProvider = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (currentProvider.id) {
                await api.put(`/insurance/providers/${currentProvider.id}`, currentProvider);
            } else {
                await api.post('/insurance/providers', currentProvider);
            }
            setShowModal(false);
            setCurrentProvider({ status: 'active' });
            fetchData();
        } catch (err) {
            console.error('Failed to save provider', err);
        }
    };

    if (loading) return (
        <div className="h-[80vh] flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium tracking-wide">Initializing Insurance Portal...</p>
        </div>
    );

    const stats = {
        totalProviders: providers.length,
        activeProviders: providers.filter(p => p.status === 'active').length,
        pendingClaims: claims.filter(c => c.status === 'pending').length,
        totalClaimed: claims.reduce((acc, curr) => acc + Number(curr.amount), 0),
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Insurance Portal</h1>
                    <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        Provider management and claims processing center
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex">
                        <button 
                            onClick={() => setView('dashboard')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${view === 'dashboard' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600' : 'text-slate-500'}`}
                        >
                            Overview
                        </button>
                        <button 
                            onClick={() => setView('providers')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${view === 'providers' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600' : 'text-slate-500'}`}
                        >
                            Providers
                        </button>
                        <button 
                            onClick={() => setView('claims')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${view === 'claims' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600' : 'text-slate-500'}`}
                        >
                            Claims
                        </button>
                    </div>
                </div>
            </div>

            {view === 'dashboard' && (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard title="Active Providers" value={stats.activeProviders} icon={Building2} color="brand" />
                        <MetricCard title="Pending Claims" value={stats.pendingClaims} icon={Clock} color="amber" />
                        <MetricCard title="Total Claims Value" value={`₦${stats.totalClaimed.toLocaleString()}`} icon={CreditCard} color="emerald" />
                        <MetricCard title="Payout Rate" value="94.2%" icon={Activity} color="indigo" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Top Providers */}
                        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-6">Linked Providers</h2>
                            <div className="space-y-4">
                                {providers.slice(0, 5).map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:scale-[1.02] transition-transform cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm">
                                                <Building2 className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{p.name}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">{p.status}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300" />
                                    </div>
                                ))}
                                {providers.length > 5 && (
                                    <button onClick={() => setView('providers')} className="w-full py-3 text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 hover:underline">View All Providers</button>
                                )}
                            </div>
                        </div>

                        {/* Recent Claims */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Recent Claims</h2>
                                <button onClick={() => setView('claims')} className="text-xs font-bold text-brand-600 uppercase tracking-widest">History</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                            <th className="pb-4">CLAIM</th>
                                            <th className="pb-4">PATIENT</th>
                                            <th className="pb-4">PROVIDER</th>
                                            <th className="pb-4 text-right">AMOUNT</th>
                                            <th className="pb-4 text-center">STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {claims.slice(0, 5).map(c => (
                                            <tr key={c.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all">
                                                <td className="py-4 font-mono text-xs text-brand-600">{c.claim_number}</td>
                                                <td className="py-4">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{c.first_name} {c.last_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">#{c.bill_number}</p>
                                                </td>
                                                <td className="py-4 text-sm text-slate-600 dark:text-slate-400 font-medium">{c.provider_name}</td>
                                                <td className="py-4 text-right font-black text-slate-900 dark:text-white">₦{Number(c.amount).toLocaleString()}</td>
                                                <td className="py-4">
                                                    <div className="flex justify-center">
                                                        <StatusBadge status={c.status} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {view === 'providers' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-8">
                     <div className="flex items-center justify-between">
                         <form 
                            onSubmit={(e) => e.preventDefault()} 
                            className="relative w-72"
                        >
                            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search providers..."
                                value={providerSearch}
                                onChange={e => setProviderSearch(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand-500/20 transition-all"
                            />
                        </form>
                        <button 
                            onClick={() => {
                                setCurrentProvider({ status: 'active' });
                                setShowModal(true);
                            }}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-brand-600/20 transition-all hover:-translate-y-1"
                        >
                            <Plus className="w-5 h-5" />
                            Add Provider
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {providers.filter(p => 
                            p.name.toLowerCase().includes(providerSearch.toLowerCase()) ||
                            (p.email && p.email.toLowerCase().includes(providerSearch.toLowerCase())) ||
                            (p.phone && p.phone.includes(providerSearch))
                        ).map(p => (
                            <div key={p.id} className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => {
                                            setCurrentProvider(p);
                                            setShowModal(true);
                                        }}
                                        className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-sm hover:text-brand-600"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-md">
                                            <Building2 className="w-6 h-6 text-brand-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{p.name}</h3>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {p.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-500 font-medium truncate">{p.email || 'No email'}</p>
                                        <p className="text-xs text-slate-500 font-medium">{p.phone || 'No phone'}</p>
                                    </div>
                                    <div className="h-px bg-slate-200 dark:bg-slate-700 w-full" />
                                    <button className="w-full py-2 bg-white dark:bg-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 transition-all">
                                        View Price List
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'claims' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Claims Repository</h2>
                            <p className="text-sm text-slate-500 font-medium">Filter and report on insurance claims</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={exportToCSV}
                                className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-all"
                            >
                                <Download className="w-5 h-5 text-slate-600" />
                            </button>
                            <button 
                                onClick={handlePrint}
                                className="p-3 bg-brand-600 text-white rounded-2xl shadow-lg shadow-brand-600/20 hover:scale-105 transition-all"
                            >
                                <Printer className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                    <th className="pb-4 pl-4">REFERENCE</th>
                                    <th className="pb-4">DATE</th>
                                    <th className="pb-4">PATIENT</th>
                                    <th className="pb-4">PROVIDER</th>
                                    <th className="pb-4 text-right">CLAIMED</th>
                                    <th className="pb-4 text-center">STATUS</th>
                                    <th className="pb-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {claims.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all group">
                                        <td className="py-5 pl-4">
                                            <p className="font-mono text-sm text-brand-600 font-bold">{c.claim_number}</p>
                                            <p className="text-[10px] text-slate-400 font-medium italic">#{c.bill_number}</p>
                                        </td>
                                        <td className="py-5 text-sm text-slate-500 font-medium">
                                            {new Date(c.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="py-5">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{c.first_name} {c.last_name}</p>
                                        </td>
                                        <td className="py-5">
                                            <span className="text-xs font-black text-slate-500 uppercase">{c.provider_name}</span>
                                        </td>
                                        <td className="py-5 text-right font-black text-slate-900 dark:text-white">
                                            ₦{Number(c.amount).toLocaleString()}
                                        </td>
                                        <td className="py-5">
                                            <div className="flex justify-center">
                                                <StatusBadge status={c.status} />
                                            </div>
                                        </td>
                                        <td className="py-5 text-right pr-4">
                                            <button className="p-2 opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-brand-600">
                                                <FileText className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Provider Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-500 max-h-[85vh] overflow-y-auto scrollbar-slim modal-content-scroll">
                        <button 
                            onClick={() => setShowModal(false)}
                            className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"
                        >
                            <AlertCircle className="w-6 h-6" />
                        </button>

                        <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-8">
                            {currentProvider.id ? 'Edit Provider' : 'New Insurance Partner'}
                        </h3>

                        <form onSubmit={handleSaveProvider} className="space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Provider Name</label>
                                    <input 
                                        type="text"
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                                        value={currentProvider.name || ''}
                                        onChange={e => setCurrentProvider({...currentProvider, name: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Email</label>
                                        <input 
                                            type="email"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                                            value={currentProvider.email || ''}
                                            onChange={e => setCurrentProvider({...currentProvider, email: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Phone</label>
                                        <input 
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                                            value={currentProvider.phone || ''}
                                            onChange={e => setCurrentProvider({...currentProvider, phone: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Address</label>
                                    <textarea 
                                        rows={2}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                                        value={currentProvider.address || ''}
                                        onChange={e => setCurrentProvider({...currentProvider, address: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Account Status</label>
                                    <select 
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                                        value={currentProvider.status}
                                        onChange={e => setCurrentProvider({...currentProvider, status: e.target.value as any})}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl text-sm font-black uppercase text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 bg-brand-600 text-white px-6 py-4 rounded-2xl text-sm font-black uppercase shadow-lg shadow-brand-600/20 hover:scale-[1.02] transition-all"
                                >
                                    Save Partner
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .bg-white, .bg-slate-50 { background: white !important; border: none !important; }
                    .shadow-sm, .shadow-lg, .shadow-2xl { shadow: none !important; }
                    button, .fixed, .no-print { display: none !important; }
                    .max-w-7xl { max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                    table { width: 100% !important; border-collapse: collapse !important; }
                    th, td { border-bottom: 1px solid #e2e8f0 !important; padding: 12px 8px !important; }
                    .text-brand-600 { color: black !important; }
                }
            `}</style>
        </div>
    );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
    const colors: any = {
        brand: 'bg-brand-600 text-white shadow-brand-600/20',
        amber: 'bg-amber-500 text-white shadow-amber-500/20',
        emerald: 'bg-emerald-500 text-white shadow-emerald-500/20',
        indigo: 'bg-indigo-600 text-white shadow-indigo-600/20'
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className={`p-4 rounded-2xl w-fit mb-6 ${colors[color]} shadow-lg transition-transform group-hover:scale-110 duration-500`}>
                <Icon className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{value}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const configs: any = {
        pending: { icon: Clock, class: 'bg-amber-50 text-amber-600' },
        approved: { icon: CheckCircle2, class: 'bg-emerald-50 text-emerald-600' },
        rejected: { icon: XCircle, class: 'bg-red-50 text-red-600' },
        paid: { icon: CheckCircle2, class: 'bg-indigo-50 text-indigo-600' },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${config.class}`}>
            <Icon className="w-3 h-3" />
            {status}
        </div>
    );
}
