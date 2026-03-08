import React, { useState } from 'react';
import { 
    Sparkles, Brain, Beaker, Pill, Activity, 
    CheckCircle2, AlertCircle, Loader2, ArrowRight,
    Plus, ChevronRight
} from 'lucide-react';
import api from '../api/client';

interface AIConsultationAssistantProps {
    clinicalNotes: string;
    onApplyDiagnosis: (diag: { diagnosis: string, icd_code: string }) => void;
    onApplyLab: (test: string) => void;
    onApplyMed: (med: { medication: string, dosage: string, frequency: string }) => void;
}

export default function AIConsultationAssistant({ 
    clinicalNotes, 
    onApplyDiagnosis, 
    onApplyLab, 
    onApplyMed 
}: AIConsultationAssistantProps) {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<any>(null);
    const [error, setError] = useState('');

    const getAISuggestions = async () => {
        if (!clinicalNotes || clinicalNotes.length < 10) {
            setError('Please enter more clinical notes before asking AI for analysis.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const res = await api.post('/ai/analyze', { notes: clinicalNotes });
            setSuggestions(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to get AI suggestions. Ensure Gemini API key is configured.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-500 rounded-xl shadow-lg shadow-brand-500/20">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Clinical Assistant</h3>
                        <p className="text-xs text-slate-500">Intelligent documentation support</p>
                    </div>
                </div>
                {!suggestions && !loading && (
                    <button 
                        onClick={getAISuggestions}
                        className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2"
                    >
                        <Brain className="w-4 h-4" /> Analyze Notes
                    </button>
                )}
                {suggestions && (
                    <button 
                        onClick={getAISuggestions}
                        className="text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 px-3 py-1.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                    >
                        <Activity className="w-4 h-4" /> Re-analyze
                    </button>
                )}
            </div>

            <div className="p-6 space-y-8">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white">Gemini is analyzing...</p>
                            <p className="text-sm text-slate-500">Processing clinical context and suggests medications</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-rose-600 font-medium">{error}</p>
                    </div>
                )}

                {!suggestions && !loading && !error && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Brain className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-sm max-w-[240px] mx-auto">
                            Enter the patient's symptoms and click "Analyze Notes" to receive smart clinical suggestions.
                        </p>
                    </div>
                )}

                {suggestions && (
                    <>
                        {/* Clinical Advice */}
                        <div className="bg-brand-500/5 border border-brand-500/20 p-4 rounded-2xl">
                            <h4 className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Sparkles className="w-3 h-3" /> Clinical Insight
                            </h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                                "{suggestions.clinical_advice}"
                            </p>
                        </div>

                        {/* Likely Diagnoses */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-3 h-3" /> Likely Diagnoses
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {suggestions.likely_diagnoses?.map((d: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-500/30 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">{d.icd_code}</span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{d.diagnosis}</span>
                                        </div>
                                        <button 
                                            onClick={() => onApplyDiagnosis({ diagnosis: d.diagnosis, icd_code: d.icd_code })}
                                            className="p-1.5 opacity-0 group-hover:opacity-100 bg-brand-500 text-white rounded-lg transition-all"
                                            title="Apply to Form"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommended Investigations */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Beaker className="w-3 h-3" /> Recommended Labs
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {suggestions.recommended_labs?.map((lab: string, i: number) => (
                                    <button 
                                        key={i} 
                                        onClick={() => onApplyLab(lab)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-full text-xs font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                                    >
                                        {lab} <Plus className="w-3 h-3" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Recommended Medications */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Pill className="w-3 h-3" /> Potential Pharmacotherapy
                            </h4>
                            <div className="space-y-2">
                                {suggestions.recommended_meds?.map((m: any, i: number) => (
                                    <div key={i} className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between group">
                                        <div>
                                            <p className="text-sm font-black text-emerald-600">{m.medication}</p>
                                            <p className="text-[10px] text-slate-500 font-bold">{m.dosage} • {m.frequency}</p>
                                        </div>
                                        <button 
                                            onClick={() => onApplyMed({ medication: m.medication, dosage: m.dosage, frequency: m.frequency })}
                                            className="p-2 bg-emerald-600 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
