import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import {
    User,
    ArrowLeft,
    Calendar,
    Phone,
    MapPin,
    Stethoscope,
    FileText,
    Pill,
    Beaker,
    Clock,
    AlertCircle,
    Loader2,
    HeartPulse,
    Shield,
    Edit
} from 'lucide-react';

interface Patient {
    id: string;
    mrn: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    phone?: string;
    email?: string;
    address_line1?: string;
    address_city?: string;
    address_state?: string;
    insurance_provider_id?: string;
    insurance_policy_number?: string;
    provider_name?: string;
    created_at: string;
}

interface Encounter {
    id: string;
    encounter_type: string;
    status: string;
    chief_complaint: string;
    created_at: string;
    provider_first?: string;
    provider_last?: string;
}

export default function PatientDetail() {
    const { id } = useParams<{ id: string }>();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'encounters' | 'labs' | 'meds'>('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [labs, setLabs] = useState<any[]>([]);
    const [meds, setMeds] = useState<any[]>([]);
    const [loadingLabs, setLoadingLabs] = useState(false);
    const [loadingMeds, setLoadingMeds] = useState(false);

    useEffect(() => {
        if (id) {
            fetchPatient();
            if (activeTab === 'labs') fetchLabs();
            if (activeTab === 'meds') fetchMeds();
        }
    }, [id, activeTab]);

    const fetchPatient = async () => {
        try {
            setLoading(true);
            const [patientRes, encounterRes] = await Promise.all([
                api.get(`/patients/${id}`),
                api.get(`/encounters/patient/${id}`).catch(() => ({ data: { encounters: [] } }))
            ]);
            setPatient(patientRes.data);
            setEncounters(encounterRes.data.encounters || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load patient');
        } finally {
            setLoading(false);
        }
    };

    const fetchLabs = async () => {
        try {
            setLoadingLabs(true);
            const res = await api.get(`/labs/orders/patient/${id}`);
            setLabs(res.data.orders || []);
        } catch (err) {
            console.error('Failed to fetch labs', err);
        } finally {
            setLoadingLabs(false);
        }
    };

    const fetchMeds = async () => {
        try {
            setLoadingMeds(true);
            const res = await api.get(`/medications/patient/${id}`);
            setMeds(res.data.medications || []);
        } catch (err) {
            console.error('Failed to fetch meds', err);
        } finally {
            setLoadingMeds(false);
        }
    };

    const getAge = (dob: string) => {
        const today = new Date();
        const birth = new Date(dob);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/10 text-emerald-500';
            case 'completed': return 'bg-blue-500/10 text-blue-500';
            case 'cancelled': return 'bg-red-500/10 text-red-500';
            default: return 'bg-slate-500/10 text-slate-500';
        }
    };

    const tabs = [
        { id: 'overview' as const, label: 'Overview', icon: User },
        { id: 'encounters' as const, label: 'Consultations', icon: Stethoscope },
        { id: 'labs' as const, label: 'Lab Results', icon: Beaker },
        { id: 'meds' as const, label: 'Medications', icon: Pill },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p>{error || 'Patient not found'}</p>
                <Link to="/patients" className="mt-4 text-brand-500 hover:underline">Back to Patients</Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Back Button */}
            <Link to="/patients" className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-500 transition-colors text-sm font-semibold">
                <ArrowLeft className="w-4 h-4" />
                Back to Patient Records
            </Link>

            {/* Patient Header Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold text-3xl">
                            {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                                {patient.first_name} {patient.last_name}
                            </h1>
                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                <span className="font-mono text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-lg text-xs">MRN: {patient.mrn}</span>
                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {getAge(patient.date_of_birth)} yrs</span>
                                <span className="capitalize">{patient.gender}</span>
                            </div>
                        </div>
                    </div>
                    <Link to={`/patients/register`} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-brand-600/20 text-sm">
                        <Edit className="w-4 h-4" />
                        Edit Record
                    </Link>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">DOB</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{new Date(patient.date_of_birth).toLocaleDateString()}</p>
                        </div>
                    </div>
                    {patient.phone && (
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.phone}</p>
                            </div>
                        </div>
                    )}
                    {patient.address_city && (
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.address_city}, {patient.address_state}</p>
                            </div>
                        </div>
                    )}
                    {patient.provider_name && (
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600">
                                <Shield className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Insurance</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.provider_name}</p>
                                <p className="text-[10px] text-slate-400">Policy: {patient.insurance_policy_number}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${activeTab === tab.id
                            ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-300">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Recent Consultations */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Stethoscope className="w-4 h-4" /> Recent Consultations
                            </h3>
                            {encounters.length > 0 ? (
                                <div className="space-y-3">
                                    {encounters.slice(0, 5).map(enc => (
                                        <div key={enc.id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{enc.chief_complaint || enc.encounter_type}</p>
                                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(enc.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${statusColor(enc.status)}`}>
                                                {enc.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 text-center py-6">No consultations recorded</p>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="space-y-4">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <HeartPulse className="w-4 h-4" /> Summary
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center">
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{encounters.length}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Total Visits</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center">
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{encounters.filter(e => e.status === 'active').length}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Active</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Record Info
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Created</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{new Date(patient.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">MRN</span>
                                        <span className="font-mono font-semibold text-slate-900 dark:text-white uppercase">{patient.mrn}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'encounters' && (
                    <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800">
                                    <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Type</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Chief Complaint</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {encounters.map(enc => (
                                    <tr key={enc.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 capitalize font-semibold text-slate-900 dark:text-white">{enc.encounter_type}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{enc.chief_complaint || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${statusColor(enc.status)}`}>{enc.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-400">{new Date(enc.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {encounters.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-12 text-slate-400">No consultations found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'labs' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        {loadingLabs ? (
                            <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
                        ) : labs.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800">
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Test</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Category</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {labs.map(lab => (
                                        <tr key={lab.id} className="border-b border-slate-100 dark:border-slate-800/50">
                                            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white uppercase">{lab.test_name}</td>
                                            <td className="px-6 py-4 text-slate-500 uppercase text-xs">{lab.test_category}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${lab.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                    {lab.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-400">{new Date(lab.ordered_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center text-slate-400">
                                <Beaker className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No lab results found for this patient.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'meds' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        {loadingMeds ? (
                            <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
                        ) : meds.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800">
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Medication</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Dosage</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {meds.map(med => (
                                        <tr key={med.id} className="border-b border-slate-100 dark:border-slate-800/50">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-900 dark:text-white uppercase">{med.medication_name}</p>
                                                <p className="text-[10px] text-slate-400 italic">"{med.instructions || 'No instructions'}"</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                {med.dosage} ({med.frequency})
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${med.prescription_status === 'dispensed' ? 'bg-brand-500/10 text-brand-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                    {med.prescription_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-400">{new Date(med.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center text-slate-400">
                                <Pill className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No medications found for this patient.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
