import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CalendarCheck, Search, Plus, Clock, CheckCircle2, XCircle, Loader2,
    User, Phone, ArrowRight, AlertCircle, ChevronDown
} from 'lucide-react';
import api from '../api/client';

interface Appointment {
    id: string;
    patient_id: string;
    patient_first: string;
    patient_last: string;
    mrn: string;
    patient_phone: string;
    doctor_first: string;
    doctor_last: string;
    provider_id: string;
    appointment_date: string;
    appointment_time: string;
    appointment_type: string;
    status: string;
    reason: string;
}

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
    phone: string;
}

interface Provider {
    id: string;
    first_name: string;
    last_name: string;
    credentials: string;
}

export default function Appointments() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    // Get user info for role-based UI
    const userStr = localStorage.getItem('user');
    const user = userStr && userStr !== 'undefined' ? JSON.parse(userStr) : null;
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [patientSearch, setPatientSearch] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        patient_id: '',
        provider_id: '',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '',
        appointment_type: 'new_visit',
        reason: '',
    });

    useEffect(() => { fetchAppointments(); }, [filterDate]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/appointments?date=${filterDate}`);
            setAppointments(res.data.appointments || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = async () => {
        setShowModal(true);
        setError('');
        setSelectedPatient(null);
        setPatientSearch('');
        setForm({ ...form, patient_id: '', provider_id: '', reason: '' });

        try {
            const [pRes, prRes] = await Promise.all([
                api.get('/patients?limit=200'),
                api.get('/providers')
            ]);
            setPatients(pRes.data.patients || []);
            setProviders(prRes.data.providers || []);
            console.log('Fetched providers:', prRes.data.providers);
        } catch (err) {
            console.error('Failed to fetch data for appointment modal:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.patient_id) { setError('Please select a patient'); return; }
        if (!form.appointment_date) { setError('Please select a date'); return; }

        try {
            setSubmitting(true);
            await api.post('/appointments', form);
            setShowModal(false);
            fetchAppointments();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to book appointment');
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await api.patch(`/appointments/${id}/status`, { status });
            console.log('Update Status Response:', res.data);
            if (status === 'in_progress' && res.data.encounter_id) {
                navigate(`/consultations/${res.data.encounter_id}`);
            } else {
                fetchAppointments();
            }
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || 'Failed to update status');
        }
    };

    const statusColors: Record<string, string> = {
        scheduled: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        checked_in: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        in_progress: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
        completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        cancelled: 'bg-slate-500/10 text-slate-500',
        no_show: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    };

    const typeLabels: Record<string, string> = {
        new_visit: 'New Visit',
        follow_up: 'Follow Up',
        emergency: 'Emergency',
        referral: 'Referral',
    };

    const filteredPatients = patients.filter(p => {
        if (!patientSearch) return true;
        const q = patientSearch.toLowerCase();
        return p.first_name.toLowerCase().includes(q) || p.last_name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q);
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Appointments</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage patient appointments and queue</p>
                </div>
                {(user?.role === 'receptionist' || user?.role === 'super_admin') && (
                    <button
                        onClick={openModal}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-brand-500/20"
                    >
                        <Plus className="w-4 h-4" /> Book Appointment
                    </button>
                )}
            </div>

            {/* Date Filter & Search */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500"
                    />
                    <button
                        onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
                        className="text-sm text-brand-600 hover:text-brand-700 font-semibold"
                    >
                        Today
                    </button>
                </div>
                <div className="h-4 w-px bg-slate-200 dark:border-slate-800 hidden md:block" />
                <span className="text-sm text-slate-500 font-medium">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''} scheduled</span>
            </div>

            {/* Appointments List */}
            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                </div>
            ) : appointments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
                    <CalendarCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No appointments</h3>
                    <p className="text-sm text-slate-500 mb-4">No appointments found for this date.</p>
                    <button onClick={openModal} className="text-brand-600 hover:text-brand-700 font-semibold text-sm">
                        Book an appointment →
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {appointments.map(apt => (
                        <div key={apt.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between group hover:border-brand-500/30 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                                    <User className="w-5 h-5 text-brand-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                        {apt.patient_first} {apt.patient_last}
                                        <span className="text-xs text-slate-400 font-mono ml-2">{apt.mrn}</span>
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                        {apt.appointment_time && (
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{apt.appointment_time}</span>
                                        )}
                                        <span>{typeLabels[apt.appointment_type] || apt.appointment_type}</span>
                                        {apt.doctor_first && <span>Dr. {apt.doctor_first} {apt.doctor_last}</span>}
                                    </div>
                                    {apt.reason && <p className="text-xs text-slate-400 mt-1 italic">{apt.reason}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${statusColors[apt.status] || ''}`}>
                                    {apt.status.replace('_', ' ')}
                                </span>
                                {apt.status === 'scheduled' && (
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => updateStatus(apt.id, 'checked_in')}
                                            className="text-xs bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg font-semibold transition-all"
                                        >
                                            Check In
                                        </button>
                                        <button
                                            onClick={() => updateStatus(apt.id, 'cancelled')}
                                            className="text-xs bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg font-semibold transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                                {apt.status === 'checked_in' && (
                                    <button
                                        onClick={() => updateStatus(apt.id, 'in_progress')}
                                        className="text-xs bg-brand-500/10 text-brand-600 hover:bg-brand-500/20 px-3 py-1.5 rounded-lg font-semibold transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        Start
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Booking Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Book Appointment</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        {error && (
                            <div className="mx-8 mt-6 bg-rose-500/10 text-rose-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-8 space-y-6 overflow-y-auto scrollbar-slim modal-content-scroll">
                            {/* Patient Selection */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Patient *</label>
                                {selectedPatient ? (
                                    <div className="flex items-center justify-between bg-brand-500/10 px-4 py-3 rounded-xl">
                                        <span className="font-semibold text-brand-600 dark:text-brand-400">
                                            {selectedPatient.first_name} {selectedPatient.last_name}
                                            <span className="text-xs font-mono ml-2 text-slate-400">{selectedPatient.mrn}</span>
                                        </span>
                                        <button type="button" onClick={() => { setSelectedPatient(null); setForm({ ...form, patient_id: '' }); }} className="text-xs text-slate-400 hover:text-rose-500">Change</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={patientSearch}
                                                onChange={e => setPatientSearch(e.target.value)}
                                                placeholder="Search patients..."
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div className="mt-1 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                                            {filteredPatients.slice(0, 10).map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => { setSelectedPatient(p); setForm({ ...form, patient_id: p.id }); setPatientSearch(''); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm flex justify-between border-b border-slate-100 dark:border-slate-800 last:border-0"
                                                >
                                                    <span className="font-semibold text-slate-900 dark:text-white">{p.first_name} {p.last_name}</span>
                                                    <span className="text-xs text-slate-400 font-mono">{p.mrn}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Doctor (Optional)</label>
                                    <select
                                        value={form.provider_id}
                                        onChange={e => setForm({ ...form, provider_id: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white"
                                    >
                                        <option value="">Select Doctor</option>
                                        {providers.map(p => (
                                            <option key={p.id} value={p.id}>
                                                Dr. {p.first_name} {p.last_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Date *</label>
                                    <input
                                        type="date"
                                        value={form.appointment_date}
                                        onChange={e => setForm({ ...form, appointment_date: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Time</label>
                                <input
                                    type="time"
                                    value={form.appointment_time}
                                    onChange={e => setForm({ ...form, appointment_time: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Type</label>
                                <select
                                    value={form.appointment_type}
                                    onChange={e => setForm({ ...form, appointment_type: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white"
                                >
                                    <option value="new_visit">New Visit</option>
                                    <option value="follow_up">Follow Up</option>
                                    <option value="emergency">Emergency</option>
                                    <option value="referral">Referral</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Reason</label>
                                <textarea
                                    value={form.reason}
                                    onChange={e => setForm({ ...form, reason: e.target.value })}
                                    placeholder="Reason for visit..."
                                    rows={2}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white resize-none"
                                />
                            </div>

                                </div>
                            <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 sticky bottom-0">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
                                    Book Appointment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
