import React, { useState, useEffect } from 'react';
import { Pill, Plus, Check, Clock, User, AlertCircle, Loader2, X } from 'lucide-react';
import api from '../api/client';

interface TreatmentSheetProps {
    encounterId: string;
    patientId: string;
    isCompleted?: boolean;
    initialMedication?: any;
    onTranscriptionComplete?: () => void;
}

const TIME_SLOTS = [
    { label: '6:00 AM', value: '06:00:00' },
    { label: '10:00 AM', value: '10:00:00' },
    { label: '12:00 PM', value: '12:00:00' },
    { label: '2:00 PM', value: '14:00:00' },
    { label: '6:00 PM', value: '18:00:00' },
    { label: '10:00 PM', value: '22:00:00' },
    { label: '12:00 AM', value: '00:00:00' },
];

export default function TreatmentSheet({ encounterId, patientId, isCompleted, initialMedication, onTranscriptionComplete }: TreatmentSheetProps) {
    const [sheet, setSheet] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddMed, setShowAddMed] = useState(false);
    const [newMed, setNewMed] = useState({ medication_name: '', inventory_item_id: '', dose: '', route: '', frequency: '', duration: '' });
    const [submitting, setSubmitting] = useState(false);
    const [drugSearch, setDrugSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [confirmAdmin, setConfirmAdmin] = useState<{ med: any, slot: string } | null>(null);

    const COMMON_DOSES = ['500mg', '1g', '250mg', '125mg', '5ml', '10ml', '1 tab', '2 tabs'];
    const COMMON_ROUTES = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhalation'];
    const COMMON_FREQUENCIES = ['Once daily (OD)', 'Twice daily (BD)', 'Thrice daily (TDS)', 'Four times daily (QDS)', '12 hourly', '8 hourly', '6 hourly', 'S.O.S (As needed)', 'Stat'];
    const COMMON_DURATIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', 'Ongoing'];

    useEffect(() => {
        if (encounterId && patientId) {
            fetchSheet();
        }
    }, [encounterId, patientId]);

    useEffect(() => {
        if (initialMedication) {
            setShowAddMed(true);
            setDrugSearch(initialMedication.medication_name);
            handleDrugSearch(initialMedication.medication_name);
        }
    }, [initialMedication]);

    const handleDrugSearch = async (query: string) => {
        setDrugSearch(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            setSearching(true);
            const res = await api.get(`/inventory?q=${query}`);
            setSearchResults(res.data.items || []);
        } catch (err) {
            console.error('Drug search failed', err);
        } finally {
            setSearching(false);
        }
    };

    const selectDrug = (drug: any) => {
        setNewMed({
            ...newMed,
            medication_name: drug.item_name,
            inventory_item_id: drug.id
        });
        setDrugSearch(drug.item_name);
        setSearchResults([]);
    };

    const fetchSheet = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/treatment-sheets/encounter/${encounterId}?patient_id=${patientId}`);
            console.log('TreatmentSheet: Loaded sheet:', res.data);
            setSheet(res.data);
        } catch (err: any) {
            console.error('TreatmentSheet: Load failed:', err.response?.data || err.message);
            setError(err.response?.data?.error || 'Failed to initialize treatment sheet');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMedication = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sheet?.id) {
            console.error('TreatmentSheet: Cannot add medication - sheet ID missing', { sheet, encounterId, patientId });
            setError(`Treatment sheet not initialized (Sheet ID missing). Please ensure patient selection is stable and try refreshing.`);
            return;
        }
        try {
            setSubmitting(true);
            await api.post(`/treatment-sheets/${sheet.id}/medications`, newMed);
            setNewMed({ medication_name: '', inventory_item_id: '', dose: '', route: '', frequency: '', duration: '' });
            setDrugSearch('');
            setShowAddMed(false);
            if (onTranscriptionComplete) onTranscriptionComplete();
            fetchSheet();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to add medication');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAdminister = (med: any, slot: string) => {
        if (isCompleted) return;
        setConfirmAdmin({ med, slot });
    };

    const confirmAction = async () => {
        if (!confirmAdmin) return;
        const { med, slot } = confirmAdmin;
        try {
            setSubmitting(true);
            await api.post(`/treatment-sheets/medications/${med.id}/administer`, {
                scheduled_time_slot: slot,
                status: 'administered'
            });
            setConfirmAdmin(null);
            fetchSheet();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to record administration');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Pill className="w-5 h-5 text-brand-600" />
                    Medication Administration Record (MAR)
                </h3>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm font-medium">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* MAR Grid */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-100 dark:border-slate-800 w-64">Drug Details</th>
                                {TIME_SLOTS.map(slot => (
                                    <th key={slot.value} className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center min-w-[100px]">
                                        {slot.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sheet.medications?.length === 0 ? (
                                <tr>
                                    <td colSpan={TIME_SLOTS.length + 1} className="p-12 text-center text-slate-400 italic">
                                        No medications added to the treatment sheet yet.
                                    </td>
                                </tr>
                            ) : (
                                sheet.medications?.map((med: any) => (
                                    <tr key={med.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 border-r border-slate-100 dark:border-slate-800">
                                            <p className="font-bold text-slate-900 dark:text-white uppercase text-xs mb-1">{med.medication_name}</p>
                                            <div className="flex flex-wrap gap-1">
                                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold text-slate-500">{med.dose}</span>
                                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold text-slate-500">{med.route}</span>
                                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold text-slate-500">{med.frequency}</span>
                                                {med.duration && <span className="text-[10px] bg-brand-50 dark:bg-brand-500/10 px-1.5 py-0.5 rounded font-bold text-brand-600">{med.duration}</span>}
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 italic">Prescribed by {med.doctor_first} {med.doctor_last}</p>
                                        </td>
                                        {TIME_SLOTS.map(slot => {
                                            const admin = med.administrations?.find((a: any) => a.scheduled_time_slot === slot.value);
                                            return (
                                                <td key={slot.value} className="p-2 text-center">
                                                    {admin ? (
                                                        <div className="flex flex-col items-center justify-center animate-in zoom-in duration-300">
                                                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-1">
                                                                <Check className="w-5 h-5" />
                                                            </div>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{admin.nurse_first[0]}{admin.nurse_last[0]}</span>
                                                            <span className="text-[8px] text-slate-400 opacity-60 font-mono">{new Date(admin.administration_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    ) : (
                                                        !isCompleted && (
                                                            <button
                                                                onClick={() => handleAdminister(med, slot.value)}
                                                                className="w-10 h-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300 hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all group"
                                                            >
                                                                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                            </button>
                                                        )
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Medication Modal */}
            {showAddMed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300 relative">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 rounded-t-[2.5rem]">
                            <div>
                                <h4 className="text-xl font-bold dark:text-white">Add Treatment Drug</h4>
                                <p className="text-sm text-slate-500 mt-1">Prescribe for monitoring on sheet</p>
                            </div>
                            <button onClick={() => setShowAddMed(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleAddMedication} className="p-8 space-y-6">
                            <div className="relative">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Search Medication</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="text"
                                        value={drugSearch}
                                        onChange={e => handleDrugSearch(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 pl-11 outline-none focus:border-brand-500 text-slate-900 dark:text-white transition-all shadow-inner"
                                        placeholder="Type medication name..."
                                    />
                                    <Pill className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                    {searching && <Loader2 className="w-4 h-4 animate-spin text-brand-500 absolute right-4 top-1/2 -translate-y-1/2" />}
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                        {searchResults.map(drug => (
                                            <button
                                                key={drug.id}
                                                type="button"
                                                onClick={() => selectDrug(drug)}
                                                className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-left border-b border-slate-100 dark:border-slate-800 last:border-0"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0">
                                                    <Pill className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{drug.item_name}</p>
                                                    <p className="text-[10px] text-brand-600 font-bold uppercase">{drug.category}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Dose</label>
                                    <div className="relative">
                                        <input
                                            list="doses"
                                            type="text"
                                            value={newMed.dose}
                                            onChange={e => setNewMed({ ...newMed, dose: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                                            placeholder="e.g. 80mg"
                                        />
                                        <datalist id="doses">
                                            {COMMON_DOSES.map(d => <option key={d} value={d} />)}
                                        </datalist>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Route</label>
                                    <select
                                        value={newMed.route}
                                        onChange={e => setNewMed({ ...newMed, route: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                                    >
                                        <option value="">Select Route</option>
                                        {COMMON_ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Frequency</label>
                                    <div className="relative">
                                        <input
                                            list="frequencies"
                                            type="text"
                                            value={newMed.frequency}
                                            onChange={e => setNewMed({ ...newMed, frequency: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                                            placeholder="e.g. 12 hourly"
                                        />
                                        <datalist id="frequencies">
                                            {COMMON_FREQUENCIES.map(f => <option key={f} value={f} />)}
                                        </datalist>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Duration</label>
                                    <div className="relative">
                                        <input
                                            list="durations"
                                            type="text"
                                            value={newMed.duration}
                                            onChange={e => setNewMed({ ...newMed, duration: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                                            placeholder="e.g. 5 days"
                                        />
                                        <datalist id="durations">
                                            {COMMON_DURATIONS.map(d => <option key={d} value={d} />)}
                                        </datalist>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={submitting || !newMed.medication_name}
                                className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-brand-700 transition-all shadow-xl shadow-brand-600/20 disabled:opacity-50 mt-4"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                Add to Sheet
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Confirmation Modal */}
            {confirmAdmin && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300 p-8 text-center">
                        <div className="w-20 h-20 rounded-[2rem] bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center mx-auto mb-6">
                            <Check className="w-10 h-10" />
                        </div>
                        <h4 className="text-xl font-bold dark:text-white mb-2">Confirm Administration</h4>
                        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                            Are you sure you want to record the administration of <br/>
                            <strong className="text-slate-900 dark:text-white uppercase">{confirmAdmin.med.medication_name}</strong> <br/>
                            at <strong className="text-brand-600">{TIME_SLOTS.find(s => s.value === confirmAdmin.slot)?.label}</strong>?
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setConfirmAdmin(null)}
                                className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAction}
                                disabled={submitting}
                                className="py-4 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-xl shadow-brand-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
