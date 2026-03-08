import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    BedDouble, 
    ArrowLeft, 
    Loader2, 
    User, 
    AlertTriangle, 
    CheckCircle2, 
    Activity, 
    Clock, 
    HeartPulse,
    Droplets,
    Thermometer,
    Wind,
    Plus,
    RefreshCw,
    Syringe,
    Brain,
    ShieldAlert
} from 'lucide-react';
import api from '../api/client';

interface Bed {
    id: string;
    bed_number: string;
    status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
    patient_id?: string;
    patient?: {
        name: string;
        mrn: string;
        gender: string;
        diagnosis: string;
        admittedAt: string;
        acuity: 'stable' | 'serious' | 'critical';
    };
    vitals?: any;
    admission_id?: string;
}

const acuityConfig = {
    critical: { label: 'CRITICAL', bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
    serious: { label: 'SERIOUS', bg: 'bg-amber-500/10', text: 'text-amber-500', dot: 'bg-amber-500' },
    stable: { label: 'STABLE', bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
};

function VitalBadge({ icon: Icon, label, value, unit, alert }: { icon: any; label: string; value: string | number; unit: string; alert?: boolean }) {
    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${alert
            ? 'bg-red-500/5 border-red-500/20 dark:bg-red-500/10 dark:border-red-500/30'
            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'
            }`}>
            <div className={`p-2 rounded-xl ${alert ? 'bg-red-500/10 text-red-500' : 'bg-brand-500/10 text-brand-500'}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                <p className={`text-lg font-bold ${alert ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                    {value} <span className="text-xs font-normal text-slate-400">{unit}</span>
                </p>
            </div>
            {alert && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
        </div>
    );
}

export default function WardDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [beds, setBeds] = useState<Bed[]>([]);
    const [wardName, setWardName] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
    const [showAdmitModal, setShowAdmitModal] = useState(false);
    const [pendingAdmissions, setPendingAdmissions] = useState<any[]>([]);
    const [loadingAdmissions, setLoadingAdmissions] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [admitForm, setAdmitForm] = useState({
        patient_id: '',
        encounter_id: '',
        bed_id: '',
        acuity: 'stable' as 'stable' | 'serious' | 'critical',
        notes: ''
    });

    useEffect(() => {
        fetchBeds();
    }, [id]);

    const fetchBeds = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/wards/${id}/beds`);
            setBeds(res.data);
            // In a real app, ward info might come from another endpoint or be included
            // For now, derive something or just use "Ward"
            setWardName("Ward Overview");
        } catch (err) {
            console.error('Failed to fetch beds:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAdmissions = async () => {
        try {
            setLoadingAdmissions(true);
            const res = await api.get('/admissions');
            setPendingAdmissions(res.data.admissions || []);
        } catch (err) {
            console.error('Failed to fetch admissions:', err);
        } finally {
            setLoadingAdmissions(false);
        }
    };

    const handleAdmitClick = (bedId?: string) => {
        if (bedId) setAdmitForm({ ...admitForm, bed_id: bedId });
        fetchAdmissions();
        setShowAdmitModal(true);
    };

    const handleAdmitSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await api.post('/wards/admit', admitForm);
            setShowAdmitModal(false);
            fetchBeds();
        } catch (err) {
            alert('Admission failed. Please check bed availability.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDischarge = async (admissionId: string) => {
        if (!window.confirm('Confirm patient discharge?')) return;
        try {
            await api.post(`/wards/discharge/${admissionId}`);
            fetchBeds();
            setSelectedBed(null);
        } catch (err) {
            console.error('Discharge failed:', err);
        }
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
                <p className="mt-4 text-slate-500 font-medium tracking-tight">Loading bed grid...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/wards')}
                        className="p-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-900 rounded-xl transition-all"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Ward Bed Grid</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage and monitor bed status in real-time.</p>
                    </div>
                </div>
                <button 
                  onClick={() => fetchBeds()} 
                  className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                >
                    <RefreshCw className="w-5 h-5 text-slate-500" />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
                {/* Bed Grid */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {beds.map(bed => (
                                <div
                                    key={bed.id}
                                    onClick={() => bed.status === 'occupied' ? setSelectedBed(bed) : handleAdmitClick(bed.id)}
                                    className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-lg active:scale-95 ${
                                        selectedBed?.id === bed.id
                                            ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500 shadow-md'
                                            : bed.status === 'available'
                                                ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-300 dark:border-emerald-500/30'
                                                : bed.status === 'cleaning'
                                                    ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-300 dark:border-amber-500/30'
                                                    : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                                    }`}
                                >
                                    <div className="flex flex-col items-center text-center">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                                            bed.status === 'occupied' ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                        }`}>
                                            <BedDouble className="w-5 h-5" />
                                        </div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">{bed.bed_number}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-70">
                                            {bed.status}
                                        </p>
                                        {bed.patient && (
                                            <div className="mt-2 w-full">
                                                <div className="h-0.5 w-full bg-slate-200 dark:bg-slate-700/50 mb-2 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${acuityConfig[bed.patient.acuity]?.dot || 'bg-brand-500'}`} 
                                                        style={{ width: '100%' }} 
                                                    />
                                                </div>
                                                <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate tracking-tight">{bed.patient.name.split(' ')[0]}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Patient Sidebar */}
                <div className="space-y-6">
                    {selectedBed && selectedBed.patient ? (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-8 shadow-sm flex flex-col h-full animate-in slide-in-from-right-4 duration-500">
                             <div className="flex items-center justify-between mb-8">
                                <span className="text-xs font-black text-brand-600 uppercase tracking-[0.2em]">{selectedBed.bed_number}</span>
                                <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${acuityConfig[selectedBed.patient.acuity].bg} ${acuityConfig[selectedBed.patient.acuity].text}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${acuityConfig[selectedBed.patient.acuity].dot} ${selectedBed.patient.acuity === 'critical' ? 'animate-pulse' : ''}`} />
                                    {acuityConfig[selectedBed.patient.acuity].label}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-tight">{selectedBed.patient.name}</h3>
                                <p className="text-sm font-bold text-slate-500">{selectedBed.patient.mrn} • {selectedBed.patient.gender}</p>
                            </div>

                            <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-800/50">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Diagnosis</h4>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedBed.patient.diagnosis}</p>
                                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-medium">
                                    <Clock className="w-4 h-4" />
                                    Admitted {new Date(selectedBed.patient.admittedAt).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="mt-auto pt-8 space-y-3">
                                <button
                                    onClick={() => navigate(`/admissions`)} // Navigate to monitoring view
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <Activity className="w-4 h-4 text-emerald-500" />
                                    Open Monitoring
                                </button>
                                <button
                                    onClick={() => selectedBed.admission_id && handleDischarge(selectedBed.admission_id)}
                                    className="w-full border-2 border-slate-200 dark:border-slate-800 hover:border-rose-500 hover:text-rose-500 text-slate-500 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
                                >
                                    Discharge Patient
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 text-center">
                            <BedDouble className="w-16 h-16 text-slate-300 mb-6" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase">Bed Details</h3>
                            <p className="text-sm text-slate-400 mt-2 font-medium">Select an occupied bed to view patient information and monitoring history.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Admission Modal */}
            {showAdmitModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Assign Bed</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Select a patient for admission</p>
                            </div>
                            <button onClick={() => setShowAdmitModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <Plus className="w-8 h-8 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleAdmitSubmit} className="p-10 space-y-8">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Patient Queue</label>
                                    <select
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                        value={admitForm.patient_id}
                                        onChange={(e) => {
                                            const selected = pendingAdmissions.find(a => a.patient_id === e.target.value);
                                            setAdmitForm({
                                                ...admitForm,
                                                patient_id: e.target.value,
                                                encounter_id: selected?.encounter_id || ''
                                            });
                                        }}
                                    >
                                        <option value="">Select admitted patient...</option>
                                        {pendingAdmissions.map(adm => (
                                            <option key={adm.patient_id} value={adm.patient_id}>
                                                {adm.first_name} {adm.last_name} ({adm.mrn})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Acuity Level</label>
                                        <select
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                            value={admitForm.acuity}
                                            onChange={(e) => setAdmitForm({ ...admitForm, acuity: e.target.value as any })}
                                        >
                                            <option value="stable">Stable</option>
                                            <option value="serious">Serious</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bed Assigned</label>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-black text-slate-400">
                                            {beds.find(b => b.id === admitForm.bed_id)?.bed_number || 'Select from Grid'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled={submitting || !admitForm.patient_id || !admitForm.bed_id}
                                className="w-full bg-brand-600 hover:bg-brand-500 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl shadow-brand-600/20 disabled:opacity-50 active:scale-95"
                            >
                                {submitting ? 'Processing...' : 'Complete Admission'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
