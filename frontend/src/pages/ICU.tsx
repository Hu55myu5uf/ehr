import React, { useState, useEffect } from 'react';
import {
    HeartPulse,
    Thermometer,
    Wind,
    Droplets,
    BedDouble,
    AlertTriangle,
    Activity,
    Clock,
    User,
    Plus,
    Loader2,
    Brain,
    Syringe,
    RefreshCw
} from 'lucide-react';
import api from '../api/client';

interface ICUBed {
    id: string;
    bed_number: string;
    bed_name?: string;
    status: 'occupied' | 'available' | 'cleaning' | 'reserved';
    admission_id?: string;
    patient?: {
        name: string;
        age: number;
        diagnosis: string;
        admittedAt: string;
        acuity: 'critical' | 'serious' | 'stable';
    };
    vitals?: {
        heartRate: number;
        bloodPressure: string;
        spO2: number;
        temperature: number;
        respiratoryRate: number;
    };
    ventilator?: {
        mode: string;
        fiO2: number;
        peep: number;
    };
    drips?: { name: string; rate: string }[];
}

const acuityConfig = {
    critical: { label: 'CRITICAL', bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
    serious: { label: 'SERIOUS', bg: 'bg-amber-500/10', text: 'text-amber-500', dot: 'bg-amber-500' },
    stable: { label: 'STABLE', bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
};

const statusConfig = {
    occupied: { label: 'Occupied', bg: 'bg-brand-500/10', text: 'text-brand-500' },
    available: { label: 'Available', bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
    cleaning: { label: 'Cleaning', bg: 'bg-amber-500/10', text: 'text-amber-500' },
    reserved: { label: 'Reserved', bg: 'bg-purple-500/10', text: 'text-purple-500' },
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

export default function ICU() {
    const [beds, setBeds] = useState<ICUBed[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBed, setSelectedBed] = useState<ICUBed | null>(null);
    const [showAdmitModal, setShowAdmitModal] = useState(false);
    const [admissions, setAdmissions] = useState<any[]>([]);
    const [loadingAdmissions, setLoadingAdmissions] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [admitForm, setAdmitForm] = useState({
        patient_id: '',
        encounter_id: '',
        bed_id: '',
        acuity: 'serious' as 'critical' | 'serious' | 'stable',
        ventilator: { mode: 'AC/VC', fiO2: 40, peep: 5 },
        drips: [] as { name: string, rate: string }[]
    });

    useEffect(() => {
        fetchBeds();
        const interval = setInterval(fetchBeds, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchBeds = async () => {
        try {
            const res = await api.get('/icu');
            if (Array.isArray(res.data)) {
                setBeds(res.data);
                if (selectedBed) {
                    const updated = res.data.find((b: ICUBed) => b.id === selectedBed.id);
                    if (updated && updated.status === 'occupied') setSelectedBed(updated);
                    else setSelectedBed(null);
                }
            } else {
                console.error('Expected array from ICU API, got:', res.data);
                setBeds([]);
            }
        } catch (err) {
            console.error('Failed to fetch ICU beds:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAdmissions = async () => {
        try {
            setLoadingAdmissions(true);
            const res = await api.get('/admissions');
            setAdmissions(res.data.admissions || []);
        } catch (err) {
            console.error('Failed to fetch admissions:', err);
        } finally {
            setLoadingAdmissions(false);
        }
    };

    const handleAdmitClick = () => {
        fetchAdmissions();
        setShowAdmitModal(true);
    };

    const handleBedClick = (bed: ICUBed) => {
        if (bed.status === 'occupied') {
            setSelectedBed(bed);
        } else if (bed.status === 'available') {
            setAdmitForm({ ...admitForm, bed_id: bed.id });
            handleAdmitClick();
        }
    };

    const handleAdmitSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admitForm.patient_id || !admitForm.bed_id) return;

        try {
            setSubmitting(true);
            await api.post('/icu/admit', admitForm);
            setShowAdmitModal(false);
            fetchBeds();
            // Reset form
            setAdmitForm({
                patient_id: '',
                encounter_id: '',
                bed_id: '',
                acuity: 'serious',
                ventilator: { mode: 'AC/VC', fiO2: 40, peep: 5 },
                drips: []
            });
        } catch (err) {
            console.error('Admission failed:', err);
            alert('Failed to admit patient to ICU. Please check bed availability.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDischarge = async (admissionId: string) => {
        if (!window.confirm('Are you sure you want to discharge this patient from ICU?')) return;
        try {
            await api.post(`/icu/${admissionId}/discharge`);
            fetchBeds();
            setSelectedBed(null);
        } catch (err) {
            console.error('Discharge failed:', err);
        }
    };

    const occupiedCount = beds.filter(b => b.status === 'occupied').length;
    const availableCount = beds.filter(b => b.status === 'available').length;
    const criticalCount = beds.filter(b => b.patient?.acuity === 'critical').length;
    const ventilatedCount = beds.filter(b => b.ventilator).length;

    const icuColorMap: Record<string, { bg: string; text: string }> = {
        brand: { bg: 'bg-brand-500/10', text: 'text-brand-500' },
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
        red: { bg: 'bg-red-500/10', text: 'text-red-500' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
    };

    const summaryCards = [
        { label: 'Total Beds', value: beds.length, icon: BedDouble, color: 'brand' },
        { label: 'Occupied', value: occupiedCount, icon: User, color: 'blue' },
        { label: 'Critical', value: criticalCount, icon: AlertTriangle, color: 'red' },
        { label: 'On Ventilator', value: ventilatedCount, icon: Wind, color: 'amber' },
    ];

    if (loading && beds.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Initialising ICU Monitoring System...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Intensive Care Unit</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time bed management and patient vitals monitoring</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchBeds} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 transition-all">
                        <RefreshCw className="w-5 h-5 text-slate-500" />
                    </button>
                    <button
                        onClick={handleAdmitClick}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-brand-600/20"
                    >
                        <Plus className="w-5 h-5" />
                        Admit Patient
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((card, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-3 rounded-xl ${icuColorMap[card.color].bg} ${icuColorMap[card.color].text}`}>
                                <card.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-3xl font-bold text-slate-900 dark:text-white`}>{card.value}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Bed Grid + Detail Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Bed Grid */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <BedDouble className="w-5 h-5 text-brand-500" />
                            Bed Overview
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Available
                                <div className="ml-2 w-2 h-2 rounded-full bg-brand-500" /> Occupied
                                <div className="ml-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Critical
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {beds.map(bed => {
                            const isCritical = bed.patient?.acuity === 'critical';
                            const status = statusConfig[bed.status];
                            return (
                                <div
                                    key={bed.id}
                                    onClick={() => handleBedClick(bed)}
                                    className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md ${selectedBed?.id === bed.id
                                        ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500 shadow-md'
                                        : isCritical
                                            ? 'bg-red-50 dark:bg-red-500/5 border-red-300 dark:border-red-500/30'
                                            : bed.status === 'available'
                                                ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-300 dark:border-emerald-500/30'
                                                : bed.status === 'cleaning'
                                                    ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-300 dark:border-amber-500/30'
                                                    : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                                        }`}
                                >
                                    {isCritical && (
                                        <div className="absolute top-2 right-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                        </div>
                                    )}
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{bed.bed_name || bed.bed_number}</p>
                                    <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg ${status.bg} ${status.text}`}>
                                        {status.label}
                                    </span>
                                    {bed.patient && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{bed.patient.name}</p>
                                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{bed.patient.diagnosis}</p>
                                            {bed.vitals && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <HeartPulse className="w-3 h-3 text-red-400" />
                                                    <span className="text-[10px] font-mono text-slate-500">{bed.vitals.heartRate} bpm</span>
                                                    <span className="text-[10px] text-slate-400">|</span>
                                                    <span className="text-[10px] font-mono text-slate-500">SpO₂ {bed.vitals.spO2}%</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Detail Panel */}
                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Patient Details</h2>
                    {selectedBed && selectedBed.patient ? (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm sticky top-8 space-y-6">
                            {/* Patient Header */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{selectedBed.bed_number}</span>
                                    {selectedBed.patient.acuity && (
                                        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${acuityConfig[selectedBed.patient.acuity].bg} ${acuityConfig[selectedBed.patient.acuity].text}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${acuityConfig[selectedBed.patient.acuity].dot} ${selectedBed.patient.acuity === 'critical' ? 'animate-pulse' : ''}`} />
                                            {acuityConfig[selectedBed.patient.acuity].label}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedBed.patient.name}</h3>
                                <p className="text-sm text-slate-500 mt-1">{selectedBed.patient.diagnosis}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                    <span>Age: {selectedBed.patient.age}</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Admitted {new Date(selectedBed.patient.admittedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {/* Vitals */}
                            {selectedBed.vitals ? (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> Live Vitals
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        <VitalBadge icon={HeartPulse} label="Heart Rate" value={selectedBed.vitals.heartRate} unit="bpm" alert={selectedBed.vitals.heartRate > 110 || selectedBed.vitals.heartRate < 50} />
                                        <VitalBadge icon={Activity} label="Blood Pressure" value={selectedBed.vitals.bloodPressure} unit="mmHg" alert={parseInt(selectedBed.vitals.bloodPressure) < 90} />
                                        <VitalBadge icon={Droplets} label="SpO₂" value={selectedBed.vitals.spO2} unit="%" alert={selectedBed.vitals.spO2 < 94} />
                                        <VitalBadge icon={Thermometer} label="Temp" value={selectedBed.vitals.temperature} unit="°C" alert={selectedBed.vitals.temperature > 38.0} />
                                        <VitalBadge icon={Wind} label="Resp Rate" value={selectedBed.vitals.respiratoryRate} unit="br/min" alert={selectedBed.vitals.respiratoryRate > 24} />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-center">
                                    <p className="text-xs text-slate-400 italic">Waiting for latest vitals from nursing station...</p>
                                </div>
                            )}

                            {/* Ventilator */}
                            {selectedBed.ventilator && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Wind className="w-4 h-4" /> Ventilator Settings
                                    </h4>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Mode</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">{selectedBed.ventilator.mode}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">FiO₂</span>
                                            <span className={`font-semibold ${selectedBed.ventilator.fiO2 > 60 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{selectedBed.ventilator.fiO2}%</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">PEEP</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">{selectedBed.ventilator.peep} cmH₂O</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Active Drips */}
                            {selectedBed.drips && selectedBed.drips.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Syringe className="w-4 h-4" /> Active Infusions
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedBed.drips.map((drip, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3">
                                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{drip.name}</span>
                                                <span className="text-xs font-mono text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2 py-1 rounded-lg">{drip.rate}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-3 pt-2">
                                <button className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
                                    <Brain className="w-5 h-5" />
                                    Update Care Plan
                                </button>
                                <button
                                    onClick={() => selectedBed.admission_id && handleDischarge(selectedBed.admission_id)}
                                    className="w-full border border-red-500/30 text-red-500 hover:bg-red-500/10 py-3 rounded-2xl font-bold transition-all"
                                >
                                    Discharge from ICU
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 border-dashed rounded-3xl">
                            <BedDouble className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-sm text-slate-400 mt-2">Select an occupied bed to view details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Admission Modal */}
            {showAdmitModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">ICU Patient Admission</h2>
                                <p className="text-sm text-slate-500">Transfer an admitted patient to an ICU bed</p>
                            </div>
                            <button onClick={() => setShowAdmitModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleAdmitSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-8 space-y-6 overflow-y-auto scrollbar-slim modal-content-scroll">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Patient Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select Patient</label>
                                    <select
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-semibold focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                        value={admitForm.patient_id}
                                        onChange={(e) => {
                                            const selected = admissions.find(a => a.patient_id === e.target.value);
                                            setAdmitForm({
                                                ...admitForm,
                                                patient_id: e.target.value,
                                                encounter_id: selected?.encounter_id || ''
                                            });
                                        }}
                                    >
                                        <option value="">Choose an admitted patient...</option>
                                        {loadingAdmissions ? (
                                            <option disabled>Loading patients...</option>
                                        ) : (
                                            admissions.map(adm => (
                                                <option key={adm.patient_id} value={adm.patient_id}>
                                                    {adm.first_name} {adm.last_name} ({adm.mrn})
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                {/* Bed Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Assign Bed</label>
                                    <select
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-semibold focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                        value={admitForm.bed_id}
                                        onChange={(e) => setAdmitForm({ ...admitForm, bed_id: e.target.value })}
                                    >
                                        <option value="">Select available bed...</option>
                                        {beds.filter(b => b.status === 'available' || b.id === admitForm.bed_id).map(bed => (
                                            <option key={bed.id} value={bed.id}>{bed.bed_name || bed.bed_number}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Acuity */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Acuity Level</label>
                                    <div className="flex gap-2">
                                        {(['stable', 'serious', 'critical'] as const).map(level => (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => setAdmitForm({ ...admitForm, acuity: level })}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${admitForm.acuity === level
                                                    ? acuityConfig[level].bg + ' ' + acuityConfig[level].text + ' border-2 border-' + level
                                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-transparent'
                                                    }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Ventilator Settings */}
                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Wind className="w-5 h-5 text-amber-500" />
                                    Ventilator Settings (Optional)
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Mode</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm"
                                            value={admitForm.ventilator.mode}
                                            onChange={(e) => setAdmitForm({ ...admitForm, ventilator: { ...admitForm.ventilator, mode: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">FiO₂ (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm"
                                            value={admitForm.ventilator.fiO2}
                                            onChange={(e) => setAdmitForm({ ...admitForm, ventilator: { ...admitForm.ventilator, fiO2: parseInt(e.target.value) } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">PEEP</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm"
                                            value={admitForm.ventilator.peep}
                                            onChange={(e) => setAdmitForm({ ...admitForm, ventilator: { ...admitForm.ventilator, peep: parseInt(e.target.value) } })}
                                        />
                                    </div>
                                </div>
                            </div>

                            </div>
                            
                            <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0">
                                <button
                                    disabled={submitting}
                                    className="w-full bg-brand-600 hover:bg-brand-500 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-brand-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <HeartPulse className="w-5 h-5" />}
                                    Confirm Admission
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
