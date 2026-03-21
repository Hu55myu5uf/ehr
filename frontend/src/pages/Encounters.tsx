import React, { useEffect, useState } from 'react';
import { ClipboardList, Plus, Calendar, User, ArrowRight, X, Loader2, Search } from 'lucide-react';
import api from '../api/client';

interface Encounter {
    id: string;
    status: string;
    created_at: string;
    patient_name: string;
    chief_complaint?: string;
    encounter_type?: string;
}

interface PatientOption {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
}

export default function Encounters() {
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Modal form state
    const [patients, setPatients] = useState<PatientOption[]>([]);
    const [patientSearch, setPatientSearch] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [formData, setFormData] = useState({
        patient_id: '',
        encounter_type: 'outpatient',
        chief_complaint: '',
        priority: 'routine'
    });
    const [selectedPatientName, setSelectedPatientName] = useState('');

    useEffect(() => {
        fetchEncounters();
    }, []);

    const fetchEncounters = async () => {
        try {
            const res = await api.get('/encounters');
            setEncounters(res.data.encounters || []);
        } catch (err) {
            console.error('Failed to fetch encounters', err);
        } finally {
            setLoading(false);
        }
    };

    const loadPatients = async () => {
        try {
            setSearchLoading(true);
            const res = await api.get('/patients?limit=200');
            setPatients(res.data.patients || []);
        } catch (err) {
            console.error('Failed to load patients', err);
        } finally {
            setSearchLoading(false);
        }
    };

    const selectPatient = (patient: PatientOption) => {
        setFormData({ ...formData, patient_id: patient.id });
        setSelectedPatientName(`${patient.first_name} ${patient.last_name} (${patient.mrn})`);
        setPatients([]);
        setPatientSearch('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.patient_id) {
            setError('Please select a patient');
            return;
        }
        if (!formData.chief_complaint.trim()) {
            setError('Please enter a chief complaint');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await api.post('/encounters', formData);
            setShowModal(false);
            setFormData({ patient_id: '', encounter_type: 'outpatient', chief_complaint: '', priority: 'routine' });
            setSelectedPatientName('');
            fetchEncounters();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create consultation');
        } finally {
            setSubmitting(false);
        }
    };

    const openModal = () => {
        setShowModal(true);
        setError('');
        setFormData({ patient_id: '', encounter_type: 'outpatient', chief_complaint: '', priority: 'routine' });
        setSelectedPatientName('');
        setPatientSearch('');
        loadPatients();
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Consultations</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Track and manage patient consultations</p>
                </div>
                <button
                    onClick={openModal}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-brand-600/20"
                >
                    <Plus className="w-5 h-5" />
                    Start Consultation
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 h-48 animate-pulse" />
                    ))
                ) : encounters.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-slate-100 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
                        <ClipboardList className="w-12 h-12 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500">No active consultations found.</p>
                        <button onClick={openModal} className="mt-4 text-brand-500 hover:text-brand-600 font-semibold text-sm">
                            Start your first consultation →
                        </button>
                    </div>
                ) : (
                    encounters.map((encounter) => (
                        <div key={encounter.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:border-brand-500/50 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${encounter.status === 'open' || encounter.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                                    }`}>
                                    {encounter.status}
                                </span>
                                <span className="text-xs text-slate-500 font-mono italic">
                                    {new Date(encounter.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 text-brand-500" />
                                    <span className="font-semibold text-slate-900 dark:text-white truncate">{encounter.patient_name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm text-slate-500 dark:text-slate-400">{encounter.chief_complaint || encounter.encounter_type || 'Consultation'}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <button className="text-xs font-bold text-brand-500 flex items-center gap-1 hover:gap-2 transition-all">
                                    VIEW DETAILS <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Start Consultation Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg mx-4 p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto scrollbar-slim modal-content-scroll">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Start New Consultation</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Patient Search */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Patient *</label>
                                {selectedPatientName ? (
                                    <div className="flex items-center justify-between bg-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-2.5">
                                        <span className="text-sm font-semibold text-brand-700 dark:text-brand-400">{selectedPatientName}</span>
                                        <button type="button" onClick={() => { setSelectedPatientName(''); setFormData({ ...formData, patient_id: '' }); }} className="text-brand-500 hover:text-red-500">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={patientSearch}
                                            onChange={(e) => setPatientSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const filtered = patients.filter(p => {
                                                        const q = patientSearch.toLowerCase();
                                                        return p.first_name.toLowerCase().includes(q) || p.last_name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q);
                                                    });
                                                    if (filtered.length > 0) selectPatient(filtered[0]);
                                                }
                                            }}
                                            placeholder="Filter patients by name..."
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white text-sm"
                                        />
                                        {searchLoading && <Loader2 className="absolute right-3 top-3 w-4 h-4 text-slate-400 animate-spin" />}
                                        <div className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                                            {patients
                                                .filter(p => {
                                                    if (!patientSearch) return true;
                                                    const q = patientSearch.toLowerCase();
                                                    return p.first_name.toLowerCase().includes(q) || p.last_name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q);
                                                })
                                                .map(p => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => selectPatient(p)}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm transition-colors flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0"
                                                    >
                                                        <span className="font-semibold text-slate-900 dark:text-white">{p.first_name} {p.last_name}</span>
                                                        <span className="text-xs text-slate-400 font-mono">{p.mrn}</span>
                                                    </button>
                                                ))}
                                            {!searchLoading && patients.length === 0 && (
                                                <p className="text-center text-sm text-slate-400 py-4">No patients found. Register a patient first.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Type */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Consultation Type</label>
                                <select
                                    value={formData.encounter_type}
                                    onChange={(e) => setFormData({ ...formData, encounter_type: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white text-sm appearance-none"
                                >
                                    <option value="outpatient">Outpatient</option>
                                    <option value="inpatient">Inpatient</option>
                                    <option value="emergency">Emergency</option>
                                    <option value="telehealth">Telehealth</option>
                                </select>
                            </div>

                            {/* Priority */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Priority</label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white text-sm appearance-none"
                                >
                                    <option value="routine">Routine</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="stat">STAT</option>
                                </select>
                            </div>

                            {/* Chief Complaint */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Chief Complaint *</label>
                                <textarea
                                    value={formData.chief_complaint}
                                    onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                                    placeholder="Describe the reason for visit..."
                                    rows={3}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white text-sm resize-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg shadow-brand-600/20 flex items-center gap-2 transition-all text-sm"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Start Consultation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
