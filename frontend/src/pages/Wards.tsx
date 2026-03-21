import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    BedDouble, 
    Users, 
    CheckCircle2, 
    Clock, 
    ChevronRight, 
    Loader2, 
    TrendingUp,
    ShieldAlert,
    Bed,
    Building2,
    HeartPulse,
    Activity
} from 'lucide-react';
import api from '../api/client';

interface Ward {
    id: string;
    name: string;
    type: 'GENERAL' | 'ICU' | 'MATERNITY' | 'SURGICAL' | 'EMERGENCY' | 'PEDIATRIC' | 'AMENITY';
    capacity: number;
    total_beds: number;
    occupied_beds: number;
    available_beds: number;
}

export default function Wards() {
    const navigate = useNavigate();
    const [wards, setWards] = useState<Ward[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchWards();
    }, []);

    const fetchWards = async () => {
        try {
            setLoading(true);
            const res = await api.get('/wards');
            setWards(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load wards data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'ICU': return 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400';
            case 'EMERGENCY': return 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400';
            case 'MATERNITY': return 'bg-pink-100 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400';
            default: return 'bg-brand-100 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400';
        }
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
                <p className="mt-4 text-slate-500 font-medium tracking-tight">Loading hospital wards...</p>
            </div>
        );
    }

    const totalBeds = wards.reduce((acc, w) => acc + w.total_beds, 0);
    const totalOccupied = wards.reduce((acc, w) => acc + w.occupied_beds, 0);
    const occupancyRate = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 uppercase tracking-tight">
                        <Building2 className="w-8 h-8 text-brand-600" />
                        In-Patient Wards
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Comprehensive bed management and occupancy tracking.
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 border-4 border-slate-50 dark:border-slate-900 flex items-center justify-center text-white text-[10px] font-black">
                            {wards.reduce((acc, w) => acc + w.available_beds, 0)}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-rose-500 border-4 border-slate-50 dark:border-slate-900 flex items-center justify-center text-white text-[10px] font-black">
                            {totalOccupied}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900/40 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center">
                            <BedDouble className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Capacity</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalBeds}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900/40 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">In-Patients</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalOccupied}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900/40 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vacant Beds</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{wards.reduce((acc, w) => acc + w.available_beds, 0)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900/40 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-500/10 text-orange-600 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Occupancy</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{occupancyRate}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ward Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                {wards.map((ward) => (
                    <div 
                        key={ward.id}
                        onClick={() => navigate(`/wards/${ward.id}`)}
                        className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm hover:border-brand-500 transition-all cursor-pointer relative overflow-hidden"
                    >
                        {/* Status bar */}
                        <div className="absolute bottom-0 left-0 h-1 bg-brand-500 transition-all duration-500" style={{ width: `${(ward.occupied_beds / ward.total_beds) * 100}%` }} />
                        
                        <div className="flex items-start justify-between mb-6">
                            <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${getTypeColor(ward.type)}`}>
                                {ward.type}
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-xs font-bold">{Math.round((ward.occupied_beds / ward.total_beds) * 100)}% Full</span>
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2 group-hover:text-brand-600 transition-colors">
                            {ward.name}
                        </h3>
                        
                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Beds</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{ward.total_beds}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Available</p>
                                <p className={`text-xl font-black ${ward.available_beds > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {ward.available_beds}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-between text-brand-600 font-bold text-sm">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
                            <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
