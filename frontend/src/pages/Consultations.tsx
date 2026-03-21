import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
    Stethoscope, Clock, Loader2, User, ChevronRight, LayoutPanelLeft, Filter, Activity,
    ExternalLink
} from 'lucide-react';
import api from '../api/client';
import ConsultationForm from './ConsultationForm';

interface Consultation {
    id: string;
    patient_id: string;
    patient_first: string;
    patient_last: string;
    mrn: string;
    encounter_type: string;
    status: string;
    chief_complaint: string;
    encounter_date: string;
    provider_first: string;
    provider_last: string;
}

export default function Consultations() {
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('in_progress');
    const [showAll, setShowAll] = useState(false);
    const [selectedRx, setSelectedRx] = useState<Consultation | null>(null);

    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const targetId = searchParams.get('id');

    useEffect(() => {
        if (targetId) {
            setShowAll(true);
        }
    }, [targetId]);

    useEffect(() => { 
        fetchConsultations(); 
    }, [filter, showAll]);

    useEffect(() => {
        if (targetId && consultations.length > 0) {
            const found = consultations.find(c => c.id === targetId);
            if (found) {
                setSelectedRx(found);
            }
        }
    }, [targetId, consultations]);

    const fetchConsultations = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filter) params.append('status', filter);
            if (showAll) params.append('all', 'true');

            const res = await api.get(`/consultations?${params.toString()}`);
            const list = res.data.consultations || [];
            setConsultations(list);

            // Auto-select first if nothing selected
            if (list.length > 0 && !selectedRx) {
                // setSelectedRx(list[0]); // Optional: auto-select
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };



    const statusColors: Record<string, string> = {
        scheduled: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        in_progress: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        cancelled: 'bg-slate-500/10 text-slate-500',
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Stethoscope className="w-8 h-8 text-brand-500" />
                        Clinical Workspace
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Manage patient consultations and clinical notes</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        {[{ label: 'Active', value: 'in_progress' }, { label: 'Queue', value: 'scheduled' }, { label: 'History', value: 'completed' }].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilter(f.value)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f.value
                                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showAll
                            ? 'bg-brand-600/10 border-brand-500 text-brand-600 dark:text-brand-400'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        {showAll ? 'Global View' : 'My Patients'}
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Consultation List */}
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col min-h-0 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <LayoutPanelLeft className="w-4 h-4" />
                            Patient Queue
                        </h2>
                        <span className="bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {consultations.length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar space-y-3">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                                <p className="text-xs text-slate-400 font-medium">Updating queue...</p>
                            </div>
                        ) : consultations.length === 0 ? (
                            <div className="text-center py-20 px-6">
                                <Activity className="w-10 h-10 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
                                <p className="text-sm font-semibold text-slate-400">Queue empty</p>
                                <p className="text-xs text-slate-500 mt-1">No patients found for this filter.</p>
                            </div>
                        ) : (
                            consultations.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => setSelectedRx(c)}
                                    className={`group p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${selectedRx?.id === c.id
                                        ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500/50 shadow-md ring-1 ring-brand-500/20'
                                        : 'bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/50 hover:border-brand-500/30'
                                        }`}
                                >
                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-tight line-clamp-1">
                                                    {c.patient_first} {c.patient_last}
                                                </h3>
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">{c.mrn}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${statusColors[c.status] || ''}`}>
                                                        {c.status?.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                                        <Clock className="w-3 h-3 text-slate-300" />
                                                        {new Date(c.encounter_date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 transition-all ${selectedRx?.id === c.id ? 'text-brand-500 translate-x-1' : 'text-slate-300 group-hover:translate-x-1'}`} />
                                    </div>
                                    {selectedRx?.id === c.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 shadow-[0_0_10px_rgba(var(--brand-500),0.5)]"></div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Embedded Workspace */}
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm relative">
                    {selectedRx ? (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                        {selectedRx.patient_first} {selectedRx.patient_last}
                                    </h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded tracking-widest">{selectedRx.mrn}</span>
                                        <span className="text-xs text-slate-400 font-medium">{selectedRx.encounter_type?.replace('_', ' ')}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span className="text-xs text-slate-400 font-medium">Dr. {selectedRx.provider_last}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const saveBtn = document.getElementById('embedded-save-btn');
                                            if (saveBtn) saveBtn.click();
                                        }}
                                        className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-300 hover:border-brand-500/50 transition-all"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            const completeBtn = document.getElementById('embedded-complete-btn');
                                            if (completeBtn) completeBtn.click();
                                        }}
                                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-sm"
                                    >
                                        Complete
                                    </button>
                                    <button
                                        onClick={() => setSelectedRx(null)}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all text-xs"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            <div className="animate-in fade-in zoom-in-95 duration-300">
                                <ConsultationForm id={selectedRx.id} embedded={true} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 shadow-inner border border-slate-100 dark:border-slate-700">
                                <Stethoscope className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Select a Patient</h3>
                            <p className="max-w-xs mx-auto text-sm text-slate-500 mt-2 font-medium">
                                Choose a patient from the consultation queue to start clinical entry or review patient records.
                            </p>

                            <div className="mt-10 grid grid-cols-2 gap-4 w-full max-w-lg">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-left">
                                    <Activity className="w-5 h-5 text-brand-500 mb-2" />
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase mb-1">Queue Management</h4>
                                    <p className="text-[10px] text-slate-500 leading-relaxed italic">Click on any patient card on the left to activate their clinical session.</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-left">
                                    <Clock className="w-5 h-5 text-amber-500 mb-2" />
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase mb-1">Status Tracking</h4>
                                    <p className="text-[10px] text-slate-500 leading-relaxed italic">Switch between Active, Queue, and History tabs to manage your day.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
