import React, { useEffect, useState } from 'react';
import {
    Activity, User, FileText, Plus, Loader2, AlertCircle,
    Heart, Thermometer, Wind, Droplet, CheckCircle2
} from 'lucide-react';
import api from '../api/client';

interface ActivePatient {
    encounter_id: string;
    patient_id: string;
    first_name: string;
    last_name: string;
    mrn: string;
    gender: string;
    date_of_birth: string;
    status: string;
    chief_complaint: string;
    nursing_instructions: string;
    admission_decision: string;
    doctor_first: string;
    doctor_last: string;
}

interface NursingNote {
    id: string;
    note_type: string;
    content: string;
    vitals: any;
    created_at: string;
    nurse_first: string;
    nurse_last: string;
}

export default function NurseDashboard() {
    const [patients, setPatients] = useState<ActivePatient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState<ActivePatient | null>(null);
    const [notes, setNotes] = useState<NursingNote[]>([]);
    const [showVitals, setShowVitals] = useState(false);
    const [showNote, setShowNote] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [vitalsForm, setVitalsForm] = useState({
        temp: '',
        bp_sys: '',
        bp_dia: '',
        hr: '',
        rr: '',
        spo2: '',
        weight: '',
        intake_ml: '',
        output_ml: '',
        output_type: 'urine',
        notes: ''
    });
    const [noteContent, setNoteContent] = useState('');

    const COMMON_TEMPS = ['36.5', '37.0', '37.5', '38.0', '38.5', '39.0'];
    const COMMON_SYS = ['110', '120', '130', '140', '150'];
    const COMMON_DIA = ['70', '80', '90'];
    const COMMON_HR = ['60', '70', '80', '90', '100'];
    const COMMON_RR = ['16', '18', '20', '22'];
    const COMMON_SPO2 = ['95', '96', '97', '98', '99', '100'];

    useEffect(() => { fetchPatients(); }, []);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const res = await api.get('/nursing/patients');
            setPatients(res.data.patients || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const selectPatient = async (p: ActivePatient) => {
        setSelectedPatient(p);
        try {
            const res = await api.get(`/nursing/patient/${p.patient_id}/notes`);
            setNotes(res.data.notes || []);
        } catch { }
    };

    const submitVitals = async () => {
        if (!selectedPatient) return;
        try {
            setSubmitting(true);
            await api.post('/nursing/notes', {
                patient_id: selectedPatient.patient_id,
                encounter_id: selectedPatient.encounter_id,
                note_type: 'vitals',
                vitals: vitalsForm,
            });
            setShowVitals(false);
            setVitalsForm({ temp: '', bp_sys: '', bp_dia: '', hr: '', rr: '', spo2: '', weight: '', intake_ml: '', output_ml: '', output_type: 'urine', notes: '' });
            selectPatient(selectedPatient);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to save vitals');
        } finally {
            setSubmitting(false);
        }
    };

    const submitNote = async () => {
        if (!selectedPatient || !noteContent) return;
        try {
            setSubmitting(true);
            await api.post('/nursing/notes', {
                patient_id: selectedPatient.patient_id,
                encounter_id: selectedPatient.encounter_id,
                note_type: 'care_note',
                content: noteContent,
            });
            setShowNote(false);
            setNoteContent('');
            selectPatient(selectedPatient);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to save note');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Nursing Station</h1>
                <p className="text-sm text-slate-500 mt-1">Active patients and care notes</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Patient List */}
                <div className="lg:col-span-1 space-y-3">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Patients ({patients.length})</h2>
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
                    ) : patients.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
                            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No active patients</p>
                        </div>
                    ) : (
                        patients.map(p => (
                            <button
                                key={p.encounter_id}
                                onClick={() => selectPatient(p)}
                                className={`w-full text-left bg-white dark:bg-slate-900/40 border rounded-2xl p-4 transition-all ${selectedPatient?.encounter_id === p.encounter_id
                                        ? 'border-brand-500 shadow-lg shadow-brand-500/10'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-brand-500/30'
                                    }`}
                            >
                                <p className="font-semibold text-sm text-slate-900 dark:text-white">{p.first_name} {p.last_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-400 font-mono">{p.mrn}</span>
                                    {p.admission_decision === 'admit' && (
                                        <span className="text-[10px] bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full font-bold uppercase">Admitted</span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Dr. {p.doctor_first} {p.doctor_last}</p>
                            </button>
                        ))
                    )}
                </div>

                {/* Patient Detail */}
                <div className="lg:col-span-2">
                    {selectedPatient ? (
                        <div className="space-y-4">
                            {/* Patient Info */}
                            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedPatient.first_name} {selectedPatient.last_name}</h3>
                                        <p className="text-sm text-slate-500">{selectedPatient.mrn} • {selectedPatient.gender} • DOB: {selectedPatient.date_of_birth}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowVitals(true)} className="flex items-center gap-1 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 px-3 py-2 rounded-xl text-sm font-semibold transition-all">
                                            <Heart className="w-4 h-4" /> Record Vitals
                                        </button>
                                        <button onClick={() => setShowNote(true)} className="flex items-center gap-1 bg-brand-500/10 text-brand-600 hover:bg-brand-500/20 px-3 py-2 rounded-xl text-sm font-semibold transition-all">
                                            <Plus className="w-4 h-4" /> Add Note
                                        </button>
                                    </div>
                                </div>

                                {selectedPatient.chief_complaint && (
                                    <div className="mb-3">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Complaint</span>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{selectedPatient.chief_complaint}</p>
                                    </div>
                                )}

                                {selectedPatient.nursing_instructions && (
                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                                        <span className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Doctor's Nursing Instructions
                                        </span>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{selectedPatient.nursing_instructions}</p>
                                    </div>
                                )}
                            </div>

                            {/* Notes Timeline */}
                            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Care Notes & Vitals</h3>
                                {notes.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">No notes recorded yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {notes.map(n => (
                                            <div key={n.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${n.note_type === 'vitals' ? 'bg-rose-500/10 text-rose-600' : 'bg-blue-500/10 text-blue-600'
                                                        }`}>
                                                        {n.note_type.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString()} — {n.nurse_first} {n.nurse_last}</span>
                                                </div>
                                                {n.content && <p className="text-sm text-slate-700 dark:text-slate-300">{n.content}</p>}
                                                {n.vitals && (
                                                    <div>
                                                        <div className="grid grid-cols-4 gap-2 mt-2">
                                                            {n.vitals.temp && <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><p className="text-xs text-slate-400">Temp</p><p className="font-bold text-sm text-slate-900 dark:text-white">{n.vitals.temp}°C</p></div>}
                                                            {n.vitals.bp_sys && <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><p className="text-xs text-slate-400">BP</p><p className="font-bold text-sm text-slate-900 dark:text-white">{n.vitals.bp_sys}/{n.vitals.bp_dia}</p></div>}
                                                            {n.vitals.hr && <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><p className="text-xs text-slate-400">HR</p><p className="font-bold text-sm text-slate-900 dark:text-white">{n.vitals.hr}</p></div>}
                                                            {n.vitals.spo2 && <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><p className="text-xs text-slate-400">SpO₂</p><p className="font-bold text-sm text-slate-900 dark:text-white">{n.vitals.spo2}%</p></div>}
                                                        </div>
                                                        {(n.vitals.intake_ml || n.vitals.output_ml) && (
                                                            <div className="grid grid-cols-2 gap-4 mt-2">
                                                                {n.vitals.intake_ml && <div className="p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg"><p className="text-[10px] text-blue-500 font-bold uppercase">Intake</p><p className="font-black text-sm text-blue-600">{n.vitals.intake_ml} ml</p></div>}
                                                                {n.vitals.output_ml && <div className="p-2 bg-rose-500/5 border border-rose-500/10 rounded-lg"><p className="text-[10px] text-rose-500 font-bold uppercase">Output ({n.vitals.output_type})</p><p className="font-black text-sm text-rose-600">{n.vitals.output_ml} ml</p></div>}
                                                            </div>
                                                        )}
                                                        {n.vitals.notes && (
                                                            <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 text-[9px]">Observation Notes</p>
                                                                <p className="text-xs text-slate-600 dark:text-slate-400 italic font-medium">{n.vitals.notes}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {showVitals && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                                    <form 
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            submitVitals();
                                        }} 
                                        className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[90vh]"
                                    >
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Record Observation</h3>
                                            <button type="button" onClick={() => setShowVitals(false)} className="text-slate-400 hover:text-slate-600"><Plus className="w-8 h-8 rotate-45" /></button>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <h4 className="text-sm font-black text-rose-600 uppercase tracking-widest">Clinical Vitals</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temp (°C)</label>
                                                        <input list="temps" type="number" step="0.1" value={vitalsForm.temp} onChange={e => setVitalsForm({...vitalsForm, temp: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                        <datalist id="temps">{COMMON_TEMPS.map(t => <option key={t} value={t} />)}</datalist>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SpO2 (%)</label>
                                                        <input list="spo2s" type="number" value={vitalsForm.spo2} onChange={e => setVitalsForm({...vitalsForm, spo2: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                        <datalist id="spo2s">{COMMON_SPO2.map(s => <option key={s} value={s} />)}</datalist>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">BP Sys</label>
                                                        <input list="sys" type="number" value={vitalsForm.bp_sys} onChange={e => setVitalsForm({...vitalsForm, bp_sys: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                        <datalist id="sys">{COMMON_SYS.map(s => <option key={s} value={s} />)}</datalist>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">BP Dia</label>
                                                        <input list="dia" type="number" value={vitalsForm.bp_dia} onChange={e => setVitalsForm({...vitalsForm, bp_dia: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                        <datalist id="dia">{COMMON_DIA.map(d => <option key={d} value={d} />)}</datalist>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HR (bpm)</label>
                                                        <input list="hrs" type="number" value={vitalsForm.hr} onChange={e => setVitalsForm({...vitalsForm, hr: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                        <datalist id="hrs">{COMMON_HR.map(h => <option key={h} value={h} />)}</datalist>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RR</label>
                                                        <input list="rrs" type="number" value={vitalsForm.rr} onChange={e => setVitalsForm({...vitalsForm, rr: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                        <datalist id="rrs">{COMMON_RR.map(r => <option key={r} value={r} />)}</datalist>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Weight (kg)</label>
                                                        <input type="number" step="0.1" value={vitalsForm.weight} onChange={e => setVitalsForm({...vitalsForm, weight: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest">Intake & Output</h4>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fluid Intake (ml)</label>
                                                        <input type="number" value={vitalsForm.intake_ml} onChange={e => setVitalsForm({...vitalsForm, intake_ml: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Output volume (ml)</label>
                                                        <input type="number" value={vitalsForm.output_ml} onChange={e => setVitalsForm({...vitalsForm, output_ml: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Output Type</label>
                                                        <select value={vitalsForm.output_type} onChange={e => setVitalsForm({...vitalsForm, output_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold">
                                                            <option value="urine">Urine</option>
                                                            <option value="drain">Drain</option>
                                                            <option value="vomitus">Vomitus</option>
                                                            <option value="other">Other</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observation Notes</label>
                                            <textarea value={vitalsForm.notes} onChange={e => setVitalsForm({...vitalsForm, notes: e.target.value})} rows={2} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                        </div>

                                        <div className="flex justify-end gap-4 mt-10">
                                            <button type="button" onClick={() => setShowVitals(false)} className="px-6 py-3 text-sm font-black text-slate-500 uppercase tracking-widest">Cancel</button>
                                            <button 
                                                type="submit" 
                                                disabled={submitting}
                                                className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-600/20 transition-all disabled:opacity-50"
                                            >
                                                {submitting ? 'Saving...' : 'Save Observation'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Note Modal */}
                            {showNote && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                    <form 
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            submitNote();
                                        }} 
                                        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto scrollbar-slim modal-content-scroll"
                                    >
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Care Note</h3>
                                        <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={4} placeholder="Enter care note..."
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white resize-none" />
                                        <div className="flex justify-end gap-3 mt-4">
                                            <button type="button" onClick={() => setShowNote(false)} className="px-4 py-2 text-sm text-slate-500 font-semibold">Cancel</button>
                                            <button type="submit" disabled={submitting} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-xl font-semibold text-sm disabled:opacity-50">
                                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Save Note
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                            <User className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-sm text-slate-500">Select a patient to view details and nursing instructions</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
