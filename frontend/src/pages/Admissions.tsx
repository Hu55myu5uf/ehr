import React, { useEffect, useState } from 'react';
import {
    HeartPulse,
    User,
    Clock,
    Activity,
    ChevronRight,
    Loader2,
    AlertCircle,
    FileText,
    Beaker,
    Pill,
    Thermometer,
    Droplets,
    Wind,
    Stethoscope
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import TreatmentSheet from '../components/TreatmentSheet';
import TreatmentCharts from '../components/TreatmentCharts';
import { 
    Heart, Pencil, Trash2, CheckCircle2, 
    ArrowRightLeft, BarChart3, Thermometer as Thermo, 
    Droplets as Drop, Plus, Settings
} from 'lucide-react';

interface Admission {
    patient_id: string;
    encounter_id: string;
    first_name: string;
    last_name: string;
    mrn: string;
    gender: string;
    date_of_birth: string;
    encounter_date: string;
    chief_complaint: string;
    admission_decision: string;
    nursing_instructions: string;
    doctor_first: string;
    doctor_last: string;
    doctor_credentials: string;
    latest_vitals: {
        temp: string;
        bp_sys: string;
        bp_dia: string;
        hr: string;
        rr: string;
        spo2: string;
        recorded_at: string;
    } | null;
}

interface ActivityItem {
    activity_type: 'nursing_note' | 'lab_result' | 'medication';
    content?: string;
    vitals?: any;
    result_name?: string;
    result_value?: string;
    result_unit?: string;
    abnormal_flag?: string;
    medication_name?: string;
    dosage?: string;
    frequency?: string;
    instructions?: string;
    created_at: string;
    provider_first: string;
    provider_last: string;
    provider_role: string;
}

export default function Admissions() {
    const navigate = useNavigate();
    const [admissions, setAdmissions] = useState<Admission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEncounter, setSelectedEncounter] = useState<string | null>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [dashboardView, setDashboardView] = useState<'activity' | 'treatment' | 'transcription' | 'monitoring'>('activity');
    const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);

    // Monitoring
    const [monitoringRecords, setMonitoringRecords] = useState<any[]>([]);
    const [loadingMonitoring, setLoadingMonitoring] = useState(false);
    const [transcribingMed, setTranscribingMed] = useState<any>(null);
    const [showMonitoringModal, setShowMonitoringModal] = useState(false);
    const [submittingMonitoring, setSubmittingMonitoring] = useState(false);
    const [monitoringForm, setMonitoringForm] = useState({
        temp: '', bp_sys: '', bp_dia: '', hr: '', rr: '', spo2: '',
        intake_ml: '', output_ml: '', output_type: 'urine', notes: ''
    });

    const COMMON_TEMPS = ['36.5', '37.0', '37.5', '38.0', '38.5', '39.0'];
    const COMMON_SYS = ['110', '120', '130', '140', '150'];
    const COMMON_DIA = ['70', '80', '90'];
    const COMMON_HR = ['60', '70', '80', '90', '100'];
    const COMMON_RR = ['16', '18', '20', '22'];
    const COMMON_SPO2 = ['95', '96', '97', '98', '99', '100'];

    useEffect(() => {
        setSelectedEncounter(null);
        setSelectedAdmission(null);
        setActivity([]);
        fetchAdmissions();
    }, [activeTab]);

    const fetchAdmissions = async () => {
        try {
            setLoading(true);
            const endpoint = activeTab === 'active' ? '/admissions' : '/admissions/history';
            const res = await api.get(endpoint);
            setAdmissions(activeTab === 'active' ? res.data.admissions : res.data.history || []);
        } catch (err) {
            console.error('Failed to fetch admissions', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivity = async (admission: Admission) => {
        try {
            setLoadingActivity(true);
            setSelectedEncounter(admission.encounter_id);
            setSelectedAdmission(admission);
            const res = await api.get(`/admissions/${admission.encounter_id}/activity`);
            setActivity(res.data.activity || []);
            fetchMonitoring(admission.encounter_id);
        } catch (err) {
            console.error('Failed to fetch activity', err);
        } finally {
            setLoadingActivity(false);
        }
    };

    const fetchMonitoring = async (encounterId: string) => {
        try {
            setLoadingMonitoring(true);
            const res = await api.get(`/monitoring/encounter/${encounterId}`);
            setMonitoringRecords(res.data || []);
        } catch (err) {
            console.error('Failed to fetch monitoring', err);
        } finally {
            setLoadingMonitoring(false);
        }
    };

    const submitMonitoring = async () => {
        if (!selectedAdmission) return;
        try {
            setSubmittingMonitoring(true);
            await api.post('/monitoring', {
                ...monitoringForm,
                encounter_id: selectedAdmission.encounter_id,
                patient_id: selectedAdmission.patient_id
            });
            setShowMonitoringModal(false);
            setMonitoringForm({
                temp: '', bp_sys: '', bp_dia: '', hr: '', rr: '', spo2: '',
                intake_ml: '', output_ml: '', output_type: 'urine', notes: ''
            });
            fetchMonitoring(selectedAdmission.encounter_id);
            fetchAdmissions(); // Refresh summary vitals
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to save record');
        } finally {
            setSubmittingMonitoring(false);
        }
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
                <p className="mt-4 text-slate-500 font-medium">Loading {activeTab === 'active' ? 'admitted' : 'discharged'} patients...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <HeartPulse className="w-8 h-8 text-brand-600" />
                        {activeTab === 'active' ? 'In-Patient Monitoring' : 'Admission History'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {activeTab === 'active' ? 'Real-time status of all admitted patients' : 'Previously discharged patients'}
                    </p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'active'
                            ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Active Patients
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'history'
                            ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Discharge History
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Patient List */}
                <div className="xl:col-span-1 space-y-4">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">
                        {activeTab === 'active' ? 'Admissions Queue' : 'Past Records'}
                    </h2>
                    {admissions.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
                            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No {activeTab === 'active' ? 'admitted' : 'discharged'} patients found.</p>
                        </div>
                    ) : (
                        admissions.map(adm => (
                            <div
                                key={adm.encounter_id}
                                onClick={() => fetchActivity(adm)}
                                className={`group p-5 rounded-[2rem] border transition-all cursor-pointer ${selectedEncounter === adm.encounter_id
                                    ? 'bg-brand-600 border-brand-600 text-white shadow-xl shadow-brand-600/20'
                                    : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-brand-500/50'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedEncounter === adm.encounter_id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                            }`}>
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight uppercase">
                                                {adm.first_name} {adm.last_name}
                                            </h3>
                                            <p className={`text-xs font-mono mt-1 ${selectedEncounter === adm.encounter_id ? 'text-brand-100' : 'text-slate-400'}`}>
                                                {adm.mrn} • {adm.gender}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 transition-transform ${selectedEncounter === adm.encounter_id ? 'translate-x-1' : 'text-slate-300'}`} />
                                </div>

                                {adm.latest_vitals && (
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        <div className={`p-2 rounded-xl text-center ${selectedEncounter === adm.encounter_id ? 'bg-white/10' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                                            <p className="text-[10px] uppercase font-bold opacity-60">Temp</p>
                                            <p className="text-xs font-bold">{adm.latest_vitals.temp}°C</p>
                                        </div>
                                        <div className={`p-2 rounded-xl text-center ${selectedEncounter === adm.encounter_id ? 'bg-white/10' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                                            <p className="text-[10px] uppercase font-bold opacity-60">BP</p>
                                            <p className="text-xs font-bold">{adm.latest_vitals.bp_sys}/{adm.latest_vitals.bp_dia}</p>
                                        </div>
                                        <div className={`p-2 rounded-xl text-center ${selectedEncounter === adm.encounter_id ? 'bg-white/10' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                                            <p className="text-[10px] uppercase font-bold opacity-60">SpO2</p>
                                            <p className="text-xs font-bold">{adm.latest_vitals.spo2}%</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Activity Monitoring */}
                <div className="xl:col-span-2 space-y-6">
                    {selectedEncounter ? (
                        <>
                            <div className="space-y-6">
                            {/* Summary Card */}
                            {admissions.find(a => a.encounter_id === selectedEncounter) && (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <HeartPulse className="w-32 h-32" />
                                    </div>

                                    {(() => {
                                        const adm = admissions.find(a => a.encounter_id === selectedEncounter);
                                        if (!adm) return null;
                                        return (
                                            <div className="relative">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-xs uppercase tracking-widest mb-4">
                                                        <Activity className="w-4 h-4" />
                                                        Current Status
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => navigate(`/consultations?id=${adm.encounter_id}`)}
                                                            className="bg-white dark:bg-slate-800 border border-brand-500/30 text-brand-600 dark:text-brand-400 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-brand-50 transition-all flex items-center gap-2"
                                                        >
                                                            <Stethoscope className="w-4 h-4" /> Consultation
                                                        </button>
                                                        <button 
                                                            onClick={() => setShowMonitoringModal(true)}
                                                            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-brand-600/20 transition-all flex items-center gap-2"
                                                        >
                                                            <Plus className="w-4 h-4" /> Record Vitals / IO
                                                        </button>
                                                    </div>
                                                </div>
                                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white uppercase">
                                                    {adm.first_name} {adm.last_name}
                                                </h2>
                                                <div className="mt-2 flex items-center gap-4 text-slate-500 font-medium">
                                                    <span>{adm.gender}</span>
                                                    <span>•</span>
                                                    <span>Adm Date: {new Date(adm.encounter_date).toLocaleDateString()}</span>
                                                </div>

                                                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 text-orange-600 flex items-center justify-center">
                                                            <Thermometer className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Temp</p>
                                                            <p className="font-bold dark:text-white">{adm.latest_vitals?.temp || '--'}°C</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 text-red-600 flex items-center justify-center">
                                                            <Droplets className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">BP</p>
                                                            <p className="font-bold dark:text-white">{adm.latest_vitals?.bp_sys || '--'}/{adm.latest_vitals?.bp_dia || '--'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                                            <Wind className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">SpO2</p>
                                                            <p className="font-bold dark:text-white">{adm.latest_vitals?.spo2 || '--'}%</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 text-purple-600 flex items-center justify-center">
                                                            <Clock className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">HR</p>
                                                            <p className="font-bold dark:text-white">{adm.latest_vitals?.hr || '--'} bpm</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Dashboard View Tabs */}
                            <div className="flex items-center gap-6 border-b border-slate-100 dark:border-slate-800 mb-6">
                                <button
                                    onClick={() => setDashboardView('activity')}
                                    className={`pb-4 text-sm font-bold transition-all relative ${dashboardView === 'activity' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Activity Stream
                                    {dashboardView === 'activity' && <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-600 rounded-t-full" />}
                                </button>
                                <button
                                    onClick={() => setDashboardView('transcription')}
                                    className={`pb-4 text-sm font-bold transition-all relative ${dashboardView === 'transcription' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Transcription
                                    {dashboardView === 'transcription' && <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-600 rounded-t-full" />}
                                </button>
                                <button
                                    onClick={() => setDashboardView('treatment')}
                                    className={`pb-4 text-sm font-bold transition-all relative ${dashboardView === 'treatment' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Treatment Sheet (MAR)
                                    {dashboardView === 'treatment' && <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-600 rounded-t-full" />}
                                </button>
                                <button
                                    onClick={() => setDashboardView('monitoring')}
                                    className={`pb-4 text-sm font-bold transition-all relative ${dashboardView === 'monitoring' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Charts (Fever/IO)
                                    {dashboardView === 'monitoring' && <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-600 rounded-t-full" />}
                                </button>
                            </div>

                            {dashboardView === 'activity' ? (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* ... existing activity list code ... */}
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">Activity Stream</h3>
                                    {loadingActivity ? (
                                        <div className="py-12 flex items-center justify-center"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
                                    ) : activity.length === 0 ? (
                                        <div className="py-12 text-center text-slate-500">No recent activity.</div>
                                    ) : (
                                        <div className="space-y-8 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                                            {activity.map((item, idx) => (
                                                <div key={idx} className="relative pl-12">
                                                    <div className={`absolute left-0 w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center z-10 ${item.activity_type === 'nursing_note' ? 'bg-brand-500 text-white' : item.activity_type === 'lab_result' ? 'bg-emerald-500 text-white' : 'bg-purple-500 text-white'}`}>
                                                        {item.activity_type === 'nursing_note' ? <FileText className="w-4 h-4" /> : item.activity_type === 'lab_result' ? <Beaker className="w-4 h-4" /> : <Pill className="w-4 h-4" />}
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/50">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{new Date(item.created_at).toLocaleString()}</span>
                                                        </div>
                                                        {item.activity_type === 'medication' ? (
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{item.medication_name}</p>
                                                                <p className="text-sm text-slate-500">{item.dosage} • {item.frequency}</p>
                                                            </div>
                                                        ) : item.activity_type === 'lab_result' ? (
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white">{item.result_name}</p>
                                                                <p className="text-lg font-black text-brand-600">{item.result_value} {item.result_unit}</p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-slate-700 dark:text-slate-300 font-medium">{item.content}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : dashboardView === 'transcription' ? (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Doctor's Prescriptions</h3>
                                    <div className="space-y-4">
                                        {activity.filter(a => a.activity_type === 'medication').length === 0 ? (
                                            <p className="text-slate-500 text-center py-8">No medication orders found from the consultation.</p>
                                        ) : (
                                            activity.filter(a => a.activity_type === 'medication').map((med, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white uppercase">{med.medication_name}</p>
                                                        <p className="text-sm text-slate-500">{med.dosage} • {med.frequency}</p>
                                                        {med.instructions && <p className="text-xs text-slate-400 mt-1 italic">"{med.instructions}"</p>}
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            setTranscribingMed(med);
                                                            setDashboardView('treatment');
                                                        }}
                                                        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                                    >
                                                        <ArrowRightLeft className="w-4 h-4" /> Transcribe to MAR
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                        <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                            <strong>Note:</strong> Transcribing a medication will move you to the Treatment Sheet (MAR) where you can select the inventory item, dose, route, and schedule for the nurse's treatment flow.
                                        </p>
                                    </div>
                                </div>
                            ) : dashboardView === 'treatment' ? (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <TreatmentSheet 
                                        encounterId={selectedEncounter} 
                                        patientId={selectedAdmission?.patient_id || ''} 
                                        isCompleted={activeTab === 'history'}
                                        initialMedication={transcribingMed}
                                        onTranscriptionComplete={() => setTranscribingMed(null)}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <TreatmentCharts records={monitoringRecords} />
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Recent Measurements</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                                        <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Time</th>
                                                        <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Temp</th>
                                                        <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">BP</th>
                                                        <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">SpO2</th>
                                                        <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Intake</th>
                                                        <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Output</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {monitoringRecords.slice().reverse().map((rec, i) => (
                                                        <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50">
                                                            <td className="py-4 text-xs font-bold text-slate-600 dark:text-slate-400">{new Date(rec.recorded_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                            <td className="py-4 text-xs font-black text-slate-900 dark:text-white text-center">{rec.temp ? `${rec.temp}°C` : '--'}</td>
                                                            <td className="py-4 text-xs font-black text-slate-900 dark:text-white text-center">{rec.bp_sys ? `${rec.bp_sys}/${rec.bp_dia}` : '--'}</td>
                                                            <td className="py-4 text-xs font-black text-slate-900 dark:text-white text-center">{rec.spo2 ? `${rec.spo2}%` : '--'}</td>
                                                            <td className="py-4 text-xs font-black text-blue-600 text-center">{rec.intake_ml ? `${rec.intake_ml} ml` : '--'}</td>
                                                            <td className="py-4 text-xs font-black text-rose-600 text-center">{rec.output_ml ? `${rec.output_ml} ml` : '--'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Monitoring Modal */}
                        {showMonitoringModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                                <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[90vh]">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Record Observation</h3>
                                        <button onClick={() => setShowMonitoringModal(false)} className="text-slate-400 hover:text-slate-600"><Plus className="w-8 h-8 rotate-45" /></button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <h4 className="text-sm font-black text-brand-600 uppercase tracking-widest">Clinical Vitals</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temp (°C)</label>
                                                    <input list="temps" type="number" step="0.1" value={monitoringForm.temp} onChange={e => setMonitoringForm({...monitoringForm, temp: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                    <datalist id="temps">{COMMON_TEMPS.map(t => <option key={t} value={t} />)}</datalist>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SpO2 (%)</label>
                                                    <input list="spo2s" type="number" value={monitoringForm.spo2} onChange={e => setMonitoringForm({...monitoringForm, spo2: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                    <datalist id="spo2s">{COMMON_SPO2.map(s => <option key={s} value={s} />)}</datalist>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">BP Sys</label>
                                                    <input list="sys" type="number" value={monitoringForm.bp_sys} onChange={e => setMonitoringForm({...monitoringForm, bp_sys: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                    <datalist id="sys">{COMMON_SYS.map(s => <option key={s} value={s} />)}</datalist>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">BP Dia</label>
                                                    <input list="dia" type="number" value={monitoringForm.bp_dia} onChange={e => setMonitoringForm({...monitoringForm, bp_dia: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                    <datalist id="dia">{COMMON_DIA.map(d => <option key={d} value={d} />)}</datalist>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HR (bpm)</label>
                                                    <input list="hrs" type="number" value={monitoringForm.hr} onChange={e => setMonitoringForm({...monitoringForm, hr: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                    <datalist id="hrs">{COMMON_HR.map(h => <option key={h} value={h} />)}</datalist>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RR</label>
                                                    <input list="rrs" type="number" value={monitoringForm.rr} onChange={e => setMonitoringForm({...monitoringForm, rr: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                    <datalist id="rrs">{COMMON_RR.map(r => <option key={r} value={r} />)}</datalist>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest">Intake & Output</h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fluid Intake (ml)</label>
                                                    <input type="number" value={monitoringForm.intake_ml} onChange={e => setMonitoringForm({...monitoringForm, intake_ml: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Output volume (ml)</label>
                                                    <input type="number" value={monitoringForm.output_ml} onChange={e => setMonitoringForm({...monitoringForm, output_ml: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Output Type</label>
                                                    <select value={monitoringForm.output_type} onChange={e => setMonitoringForm({...monitoringForm, output_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold">
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
                                        <textarea value={monitoringForm.notes} onChange={e => setMonitoringForm({...monitoringForm, notes: e.target.value})} rows={2} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 font-bold" />
                                    </div>

                                    <div className="flex justify-end gap-4 mt-10">
                                        <button onClick={() => setShowMonitoringModal(false)} className="px-6 py-3 text-sm font-black text-slate-500 uppercase tracking-widest">Cancel</button>
                                        <button 
                                            onClick={submitMonitoring} 
                                            disabled={submittingMonitoring}
                                            className="bg-brand-600 hover:bg-brand-700 text-white px-10 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-600/20 transition-all disabled:opacity-50"
                                        >
                                            {submittingMonitoring ? 'Saving...' : 'Save Observation'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                                <User className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Select a Resident</h3>
                            <p className="text-slate-500 mt-2 max-w-xs text-center">Click on a patient from the admission queue to monitor their current activity and vitals.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
