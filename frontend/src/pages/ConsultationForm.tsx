import React, { useEffect, useState } from 'react';
import {
    ArrowLeft, Save, CheckCircle2, Loader2, User, Stethoscope,
    FileText, Heart, Brain, AlertCircle, Plus, Trash2, Beaker, Pill,
    Paperclip, Image as ImageIcon, File as FileIcon, X, Upload, Search,
    Pencil, Eraser, PenTool, Tablets, Send, Activity, Clock, Phone, Users
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ICD10_CODES } from '../icd10_codes';
import AIConsultationAssistant from '../components/AIConsultationAssistant';


interface SectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl relative overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-tight">{title}</span>
                </div>
                <span className={`text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </button>
            {open && <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-3">{children}</div>}
        </div>
    );
}

const ROS_SYSTEMS = [
    'Cardiovascular', 'Pulmonary/Respiratory', 'Gastrointestinal', 'Neurological',
    'Musculoskeletal', 'Genitourinary', 'Dermatological', 'Endocrine',
    'Hematological', 'Psychiatric', 'ENT', 'Ophthalmological'
];

const LAB_TESTS = [
    {
        category: 'HAEMATOLOGY',
        id: 'haematology',
        tests: ['Fullblood count', 'Rbs', 'Fbs', 'Blood culture', 'Blood transfusion', 'Blood group', 'Genotype', 'Pcv']
    },
    {
        category: 'SEROLOGY',
        id: 'serology',
        tests: ['HbsAg', 'Hcv', 'Rvs']
    },
    {
        category: 'MICROBIOLOGY (Feces)',
        id: 'microbiology',
        tests: ['Fecal occult blood', 'Mcs (Feces)', 'Parasitology']
    },
    {
        category: 'MICROBIOLOGY (Urine)',
        id: 'microbiology',
        tests: ['Mcs (Urine)', 'Urinalysis', 'Urine afb']
    },
    {
        category: 'MICROBIOLOGY (Other)',
        id: 'microbiology',
        tests: ['Semen analysis']
    },
    {
        category: 'BIOCHEMISTRY',
        id: 'biochemistry',
        tests: ['Eucr', 'Bilirubin', 'Csf biochemisty', 'Urine biochemistry']
    }
];

const INVESTIGATION_CATEGORIES = [
    { id: 'laboratory', label: 'Laboratory', icon: '🔬', color: 'amber' },
    { id: 'radiology', label: 'Radiology', icon: '📡', color: 'blue' },
    { id: 'ultrasound', label: 'Ultrasound', icon: '🔊', color: 'purple' },
    { id: 'xray', label: 'X-Ray', icon: '☢️', color: 'rose' },
    { id: 'ct_scan', label: 'CT Scan', icon: '🧠', color: 'indigo' },
    { id: 'mri', label: 'MRI', icon: '🧲', color: 'teal' },
    { id: 'ecg', label: 'ECG', icon: '💓', color: 'red' },
    { id: 'endoscopy', label: 'Endoscopy', icon: '🔍', color: 'emerald' },
];

const COMMON_DOSES = ['500mg', '1g', '250mg', '125mg', '5ml', '10ml', '1 tab', '2 tabs'];
const COMMON_FREQUENCIES = ['Once daily (OD)', 'Twice daily (BD)', 'Thrice daily (TDS)', 'Four times daily (QDS)', '12 hourly', '8 hourly', '6 hourly', 'S.O.S (As needed)', 'Stat'];



interface DigitalCanvasProps {
    onSave?: (blob: Blob) => void;
    disabled?: boolean;
}

function DigitalCanvas({ onSave, disabled }: DigitalCanvasProps) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#0ea5e9'); // Brand blue
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

    const drawNotebookBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        // Draw white background first
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Horizontal lines
        ctx.beginPath();
        ctx.strokeStyle = '#e2e8f0'; // Light slate for lines
        ctx.lineWidth = 1;
        for (let y = 40; y < height; y += 30) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Vertical margin
        ctx.beginPath();
        ctx.strokeStyle = '#fecaca'; // Very light red for margin
        ctx.lineWidth = 2;
        ctx.moveTo(60, 0);
        ctx.lineTo(60, height);
        ctx.stroke();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set line properties
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = tool === 'eraser' ? 20 : 3;

        // Draw background if empty/new
        if (ctx.getImageData(0, 0, 1, 1).data[3] === 0) {
            drawNotebookBackground(ctx, canvas.width, canvas.height);
        }
    }, [tool]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (disabled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || disabled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        if (!confirm('Clear entire page?')) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawNotebookBackground(ctx, canvas.width, canvas.height);
    };

    const handleExport = () => {
        const canvas = canvasRef.current;
        if (!canvas || !onSave) return;
        canvas.toBlob((blob) => {
            if (blob) onSave(blob);
        }, 'image/png');
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setTool('pen')}
                        className={`p-2 rounded-xl transition-all ${tool === 'pen' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                        <Pencil className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setTool('eraser')}
                        className={`p-2 rounded-xl transition-all ${tool === 'eraser' ? 'bg-slate-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                        <Eraser className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                    <div className="flex gap-2">
                        {['#0f172a', '#0ea5e9', '#ef4444', '#10b981'].map(c => (
                            <button
                                key={c}
                                onClick={() => { setColor(c); setTool('pen'); }}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${color === c && tool === 'pen' ? 'border-slate-400 scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={clearCanvas} className="flex items-center gap-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all">
                        <Trash2 className="w-4 h-4" /> Clear
                    </button>
                    {!disabled && (
                        <button onClick={handleExport} className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-1.5 rounded-xl text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all">
                            Save Note
                        </button>
                    )}
                </div>
            </div>

            <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-inner cursor-crosshair touch-none">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={1000}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-auto bg-white"
                />
            </div>
            <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">Digital Scribe Note Area — Optimized for Tablet/Pen</p>
        </div>
    );
}

interface ConsultationFormProps {
    id?: string;
    embedded?: boolean;
}

export default function ConsultationForm({ id: propId, embedded = false }: ConsultationFormProps = {}) {
    const { id: paramId } = useParams<{ id: string }>();
    const id = (propId || paramId) as string;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [encounter, setEncounter] = useState<any>(null);
    const [labs, setLabs] = useState<any[]>([]);
    const [meds, setMeds] = useState<any[]>([]);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [saveMsg, setSaveMsg] = useState('');

    // Form state
    const [form, setForm] = useState({
        chief_complaint: '',
        history_of_presenting_illness: '',
        review_of_systems: {} as Record<string, string>,
        past_medical_history: '',
        drug_history: '',
        allergy_notes: '',
        family_history: '',
        social_history: '',
        primary_diagnosis: '',
        primary_icd_code: '',
        secondary_diagnoses: [] as { diagnosis: string; icd_code: string }[],
        admission_decision: 'discharge',
        nursing_instructions: '',
        additional_notes: '',
        referral_notes: '',
    });

    // New lab order
    const [newLab, setNewLab] = useState({ test_name: '', test_category: '', priority: 'routine', notes: '' });
    const [selectedInvestigations, setSelectedInvestigations] = useState<string[]>([]);
    const [batchLabs, setBatchLabs] = useState<any[]>([]);
    // New medication
    const [newMed, setNewMed] = useState({ medication_name: '', inventory_item_id: '', dosage: '', frequency: '', route: 'oral', start_date: new Date().toISOString().split('T')[0], instructions: '' });
    const [drugSearch, setDrugSearch] = useState('');
    const [drugResults, setDrugResults] = useState<any[]>([]);
    const [searchingDrugs, setSearchingDrugs] = useState(false);
    const [batchMeds, setBatchMeds] = useState<any[]>([]);
    const [submittingBatch, setSubmittingBatch] = useState(false);
    // ICD-10 search
    const [icdSearch, setIcdSearch] = useState('');
    const [icdResults, setIcdResults] = useState<typeof ICD10_CODES>([]);
    const [scribeMode, setScribeMode] = useState<'standard' | 'digital'>('standard');

    const [availableTests, setAvailableTests] = useState<any[]>([]);

    useEffect(() => { 
        if (id) {
            fetchData();
            fetchAvailableTests();
        }
    }, [id]);

    const fetchAvailableTests = async () => {
        try {
            const res = await api.get('/prices');
            const labTests = res.data.filter((p: any) => p.item_type === 'lab_test');
            
            // Group by category
            const grouped = labTests.reduce((acc: any, curr: any) => {
                const category = curr.category || 'General';
                if (!acc[category]) acc[category] = [];
                acc[category].push(curr.item_name);
                return acc;
            }, {});

            const formatted = Object.keys(grouped).map(cat => ({
                category: cat,
                tests: grouped[cat]
            }));

            setAvailableTests(formatted);
        } catch (err) {
            console.error('Failed to fetch available tests', err);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/consultations/${id}`);
            setEncounter(res.data.encounter);
            setLabs(res.data.lab_orders || []);
            setMeds(res.data.medications || []);
            setAttachments(res.data.attachments || []);

            if (res.data.details) {
                const d = res.data.details;
                setForm({
                    chief_complaint: d.chief_complaint || '',
                    history_of_presenting_illness: d.history_of_presenting_illness || '',
                    review_of_systems: d.review_of_systems || {},
                    past_medical_history: d.past_medical_history || '',
                    drug_history: d.drug_history || '',
                    allergy_notes: d.allergy_notes || '',
                    family_history: d.family_history || '',
                    social_history: d.social_history || '',
                    primary_diagnosis: d.primary_diagnosis || '',
                    primary_icd_code: d.primary_icd_code || '',
                    secondary_diagnoses: d.secondary_diagnoses || [],
                    admission_decision: d.admission_decision || 'discharge',
                    nursing_instructions: d.nursing_instructions || '',
                    additional_notes: d.additional_notes || '',
                    referral_notes: d.referral_notes || '',
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load consultation');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            // Auto-submit any pending batches before saving the note itself
            let shouldRefresh = false;
            
            if (batchMeds.length > 0) {
                try {
                    const itemsToPrescribe = batchMeds.map(({ id: _, ...rest }) => rest);
                    await api.post('/medications', { patient_id: encounter.patient_id, encounter_id: id, items: itemsToPrescribe });
                    setBatchMeds([]);
                    shouldRefresh = true;
                } catch(e) { console.error(e); }
            }
            if (batchLabs.length > 0) {
                try {
                    const itemsToOrder = batchLabs.map(({ id: _, ...rest }) => rest);
                    await api.post('/labs/orders', { patient_id: encounter.patient_id, encounter_id: id, priority: 'routine', items: itemsToOrder });
                    setBatchLabs([]);
                    shouldRefresh = true;
                } catch(e) { console.error(e); }
            }

            await api.put(`/consultations/${id}`, form);
            
            if (shouldRefresh) fetchData();

            setSaveMsg('Saved successfully');
            setTimeout(() => setSaveMsg(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async () => {
        if (!confirm('Complete this consultation? This will finalize the encounter.')) return;
        try {
            setCompleting(true);
            
            // Auto-submit any pending batches before saving the note itself
            if (batchMeds.length > 0) {
                try {
                    const itemsToPrescribe = batchMeds.map(({ id: _, ...rest }) => rest);
                    await api.post('/medications', { patient_id: encounter.patient_id, encounter_id: id, items: itemsToPrescribe });
                } catch(e) { console.error(e); }
            }
            if (batchLabs.length > 0) {
                try {
                    const itemsToOrder = batchLabs.map(({ id: _, ...rest }) => rest);
                    await api.post('/labs/orders', { patient_id: encounter.patient_id, encounter_id: id, priority: 'routine', items: itemsToOrder });
                } catch(e) { console.error(e); }
            }

            await api.post(`/consultations/${id}/complete`, form);
            // Auto-generate bill
            try {
                await api.post('/billing/generate', { encounter_id: id });
            } catch { }
            navigate('/consultations');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to complete');
        } finally {
            setCompleting(false);
        }
    };

    const addLabToBatch = () => {
        if (!newLab.test_name) return;

        let categoryId = newLab.test_category || 'other';
        if (categoryId === 'other' || categoryId === 'laboratory') {
            for (const cat of LAB_TESTS) {
                if (cat.tests.includes(newLab.test_name)) {
                    categoryId = cat.id;
                    break;
                }
            }
        }

        setBatchLabs([...batchLabs, {
            id: Math.random().toString(36).substr(2, 9),
            test_name: newLab.test_name,
            test_category: categoryId,
            priority: newLab.priority,
            notes: newLab.notes,
        }]);
        setNewLab({ test_name: '', test_category: '', priority: 'routine', notes: '' });
    };

    const removeLabFromBatch = (id: string) => {
        setBatchLabs(batchLabs.filter(l => l.id !== id));
    };

    const finalizeLabBatch = async () => {
        if (batchLabs.length === 0) return;
        try {
            await api.post('/labs/orders', {
                patient_id: encounter.patient_id,
                encounter_id: id,
                items: batchLabs.map(({ id: _, ...rest }) => rest),
            });
            setBatchLabs([]);
            fetchData();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || 'Failed to order investigations');
        }
    };

    const toggleInvestigation = (catId: string) => {
        if (isCompleted) return;
        setSelectedInvestigations(prev =>
            prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
        );
    };

    const searchICD10 = (query: string) => {
        setIcdSearch(query);
        if (query.length < 1) {
            setIcdResults([]);
            return;
        }
        const q = query.toLowerCase();
        const matches = ICD10_CODES.filter(
            c => c.code.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
        ).slice(0, 10);
        setIcdResults(matches);
    };

    const selectICD10 = (item: typeof ICD10_CODES[0]) => {
        setForm(prev => {
            const alreadySelected = prev.secondary_diagnoses.find(d => d.icd_code === item.code);
            if (alreadySelected) return prev;
            return {
                ...prev,
                primary_icd_code: prev.primary_icd_code || item.code,
                secondary_diagnoses: [...prev.secondary_diagnoses, { diagnosis: item.desc, icd_code: item.code }]
            };
        });
        setIcdSearch('');
        setIcdResults([]);
    };

    const removeICD = (code: string) => {
        setForm(prev => {
            const newList = prev.secondary_diagnoses.filter(d => d.icd_code !== code);
            return {
                ...prev,
                secondary_diagnoses: newList,
                primary_icd_code: prev.primary_icd_code === code
                    ? (newList.length > 0 ? newList[0].icd_code : '')
                    : prev.primary_icd_code
            };
        });
    };


    const searchHospitalDrugs = async (query: string) => {
        setDrugSearch(query);
        if (query.length < 2) {
            setDrugResults([]);
            return;
        }

        try {
            setSearchingDrugs(true);
            const res = await api.get(`/inventory?q=${query}`);
            setDrugResults(res.data.items || []);
        } catch (err) {
            console.error('Drug search failed', err);
        } finally {
            setSearchingDrugs(false);
        }
    };

    const selectInventoryDrug = (drug: any) => {
        setNewMed({
            ...newMed,
            medication_name: drug.item_name,
            inventory_item_id: drug.id,
            instructions: drug.brand_name ? `Brand: ${drug.brand_name}` : ''
        });
        setDrugSearch(drug.item_name);
        setDrugResults([]);
    };

    const addToBatch = () => {
        if (!newMed.medication_name || !newMed.dosage || !newMed.frequency) return;
        setBatchMeds([...batchMeds, { ...newMed, id: Math.random().toString(36).substr(2, 9) }]);
        setNewMed({ medication_name: '', inventory_item_id: '', dosage: '', frequency: '', route: 'oral', start_date: new Date().toISOString().split('T')[0], instructions: '' });
        setDrugSearch('');
    };

    const removeFromBatch = (batchId: string) => {
        setBatchMeds(batchMeds.filter(m => m.id !== batchId));
    };

    const prescribeMed = async () => {
        if (batchMeds.length === 0 && (!newMed.medication_name || !newMed.dosage || !newMed.frequency)) return;

        try {
            setSubmittingBatch(true);
            const payload = batchMeds.length > 0
                ? {
                    patient_id: encounter.patient_id,
                    encounter_id: id,
                    items: batchMeds
                }
                : {
                    patient_id: encounter.patient_id,
                    encounter_id: id,
                    ...newMed
                };

            await api.post('/medications', payload);
            setBatchMeds([]);
            setNewMed({ medication_name: '', inventory_item_id: '', dosage: '', frequency: '', route: 'oral', start_date: new Date().toISOString().split('T')[0], instructions: '' });
            setDrugSearch('');
            fetchData();
            setSaveMsg('Prescriptions sent successfully');
            setTimeout(() => setSaveMsg(''), 3000);
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || 'Failed to prescribe medication');
            setError(err.response?.data?.error || 'Failed to prescribe medication');
        } finally {
            setSubmittingBatch(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('encounter_id', id);

            await api.post('/attachments', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Refresh attachments
            const res = await api.get(`/consultations/${id}`);
            setAttachments(res.data.attachments || []);
            setSaveMsg('File uploaded successfully');
            setTimeout(() => setSaveMsg(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to upload file');
        } finally {
            setUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const deleteAttachment = async (attachId: string) => {
        if (!confirm('Are you sure you want to delete this attachment?')) return;
        try {
            await api.delete(`/attachments/${attachId}`);
            setAttachments(attachments.filter(a => a.id !== attachId));
            setSaveMsg('File deleted');
            setTimeout(() => setSaveMsg(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete attachment');
        }
    };

    const handleScribeSave = async (blob: Blob) => {
        if (!id) return;
        try {
            setSaving(true);
            const formData = new FormData();
            const file = new File([blob], `digital_scribe_${Date.now()}.png`, { type: 'image/png' });
            formData.append('file', file);
            formData.append('encounter_id', id);

            await api.post('/attachments', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Refresh attachments
            const res = await api.get(`/consultations/${id}`);
            setAttachments(res.data.attachments || []);
            setSaveMsg('Handwritten note saved as attachment');
            setTimeout(() => setSaveMsg(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save handwriting');
        } finally {
            setSaving(false);
        }
    };

    const toggleROS = (system: string) => {
        if (isCompleted) return;
        const current = form.review_of_systems[system];
        setForm({
            ...form,
            review_of_systems: {
                ...form.review_of_systems,
                [system]: current !== undefined ? undefined : '' // Toggle: undefined (off) or empty string (on)
            } as any
        });
    };

    const handleApplyAIDiagnosis = (diag: { diagnosis: string, icd_code: string }) => {
        setForm(prev => {
            const alreadySelected = prev.secondary_diagnoses.find(d => d.icd_code === diag.icd_code);
            if (alreadySelected) return prev;
            return {
                ...prev,
                primary_icd_code: prev.primary_icd_code || diag.icd_code,
                secondary_diagnoses: [...prev.secondary_diagnoses, { diagnosis: diag.diagnosis, icd_code: diag.icd_code }]
            };
        });
        setSaveMsg(`Applied Diagnosis: ${diag.diagnosis}`);
        setTimeout(() => setSaveMsg(''), 3000);
    };

    const handleApplyAILab = (testName: string) => {
        setBatchLabs(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            test_name: testName,
            test_category: 'laboratory',
            priority: 'routine',
            notes: 'Suggested by AI Assistant',
        }]);
        setSaveMsg(`Added to Batch: ${testName}`);
        setTimeout(() => setSaveMsg(''), 3000);
    };

    const handleApplyAIMed = (med: { medication: string, dosage: string, frequency: string }) => {
        setBatchMeds(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            medication_name: med.medication,
            dosage: med.dosage,
            frequency: med.frequency,
            route: 'oral',
            start_date: new Date().toISOString().split('T')[0],
            instructions: 'Suggested by AI Assistant'
        }]);
        setSaveMsg(`Added to Prescriptions: ${med.medication}`);
        setTimeout(() => setSaveMsg(''), 3000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (error && !encounter) {
        return (
            <div className="bg-rose-500/10 text-rose-600 p-6 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                {error}
            </div>
        );
    }

    const isCompleted = encounter?.status === 'completed';

    return (
        <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 ${!embedded ? 'max-w-4xl mx-auto' : ''}`}>
            {/* Hidden trigger buttons for embedded mode — used by parent workspace header */}
            {embedded && !isCompleted && (
                <>
                    <button id="embedded-save-btn" onClick={handleSave} className="hidden" />
                    <button id="embedded-complete-btn" onClick={handleComplete} className="hidden" />
                </>
            )}
            {/* Header */}
            {!embedded && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/consultations')} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Consultation</h1>
                            <p className="text-xs text-slate-500">
                                {encounter?.first_name} {encounter?.last_name} — <span className="font-mono">{encounter?.mrn}</span>
                            </p>
                        </div>
                    </div>
                    {!isCompleted && (
                        <div className="flex gap-3">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-300 hover:border-brand-500/50 transition-all"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </button>
                            <button
                                onClick={handleComplete}
                                disabled={completing}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
                            >
                                {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Complete
                            </button>
                        </div>
                    )}
                    {isCompleted && (
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wider">
                            Completed
                        </span>
                    )}
                </div>
            )}

            {saveMsg && (
                <div className="bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {saveMsg}
                </div>
            )}
            {error && (
                <div className="bg-rose-500/10 text-rose-600 px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            {/* Biodata (read-only) */}
            <Section title="Patient Biodata" icon={<User className="w-4 h-4 text-brand-500" />} defaultOpen={true}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 text-sm">
                    <div className="space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider font-black block">Basic Info</span>
                        <p className="font-bold text-slate-900 dark:text-white uppercase truncate">{encounter?.first_name} {encounter?.last_name}</p>
                        <p className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit">{encounter?.mrn}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider font-black block">Demographics</span>
                        <p className="text-slate-800 dark:text-slate-200 font-bold">{encounter?.gender} • {encounter?.date_of_birth}</p>
                        <p className="text-slate-500 text-[11px] font-medium italic">Age: {encounter?.date_of_birth ? Math.floor((new Date().getTime() - new Date(encounter.date_of_birth).getTime()) / 31536000000) : 'N/A'} Yrs</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider font-black block">Contact Info</span>
                        <p className="text-slate-800 dark:text-slate-200 font-bold">{encounter?.phone || 'No Phone'}</p>
                        <p className="text-slate-500 text-[11px] font-medium truncate">{encounter?.email || 'No Email'}</p>
                    </div>
                    <div className="space-y-1 col-span-2">
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider font-black block">Next of Kin</span>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="font-bold text-brand-600 dark:text-brand-400 uppercase text-xs">
                                {encounter?.next_of_kin_name || 'Not Provided'}
                            </p>
                            {encounter?.next_of_kin_name && (
                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 font-medium text-[10px] text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3" /> {encounter?.next_of_kin_relationship || 'Relation N/A'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> {encounter?.next_of_kin_phone || 'No Phone'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Section>

            {/* Mode Toggle */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit mx-auto shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                <button
                    onClick={() => setScribeMode('standard')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${scribeMode === 'standard' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <FileText className="w-4 h-4" />
                    Standard Form
                </button>
                <button
                    onClick={() => setScribeMode('digital')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${scribeMode === 'digital' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Tablets className="w-4 h-4" />
                    Digital Scribe
                </button>
            </div>

            {scribeMode === 'digital' ? (
                <Section title="Digital Handwriting Note" icon={<PenTool className="w-5 h-5 text-brand-500" />} defaultOpen={true}>
                    <DigitalCanvas onSave={handleScribeSave} disabled={isCompleted} />
                </Section>
            ) : (
                <>
                    {/* Section 1 — Clinical Complaint & AI Assistant */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <Section title="Clinical Complaint" icon={<FileText className="w-4 h-4 text-amber-500" />} defaultOpen={true}>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Chief Complaint & History</label>
                                    <textarea
                                        value={form.chief_complaint}
                                        onChange={e => setForm({ ...form, chief_complaint: e.target.value })}
                                        rows={8}
                                        disabled={isCompleted}
                                        placeholder="Record clinical complaint..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white resize-none disabled:opacity-60 transition-all"
                                    />
                                </div>
                            </div>
                        </Section>

                        {!isCompleted && (
                            <AIConsultationAssistant 
                                clinicalNotes={form.chief_complaint}
                                onApplyDiagnosis={handleApplyAIDiagnosis}
                                onApplyLab={handleApplyAILab}
                                onApplyMed={handleApplyAIMed}
                            />
                        )}
                    </div>





                    {/* Attachments Section */}
                    <Section title={`Attachments (${attachments.length})`} icon={<Paperclip className="w-4 h-4 text-slate-500" />}>
                        <div className="space-y-3">
                            {!isCompleted && (
                                <div className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-900/10">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                        <Upload className="w-4 h-4 text-brand-500" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-slate-800 dark:text-white">Upload clinical documents</p>
                                        <p className="text-[10px] text-slate-400">Images or PDFs (Max 10MB)</p>
                                    </div>
                                    <label className="bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all disabled:opacity-50">
                                        {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
                                        {uploading ? 'Uploading...' : 'Upload'}
                                        <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf" disabled={uploading} />
                                    </label>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {attachments.map((file) => {
                                    const isImage = file.file_type.startsWith('image/');
                                    return (
                                        <div key={file.id} className="group relative flex items-center gap-3 p-3 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-brand-500/30 transition-all">
                                            <div className={`p-2 rounded-lg ${isImage ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500'}`}>
                                                {isImage ? <ImageIcon className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.file_name}</p>
                                                <p className="text-[10px] text-slate-500">{file.uploaded_by_name} • {new Date(file.uploaded_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a
                                                    href={`/${file.file_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-brand-500 transition-colors"
                                                    title="View / Download"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </a>
                                                {!isCompleted && (
                                                    <button
                                                        onClick={() => deleteAttachment(file.id)}
                                                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {attachments.length === 0 && (
                                <p className="text-center py-4 text-sm text-slate-400 italic">No attachments uploaded yet.</p>
                            )}
                        </div>
                    </Section>



                    {/* Section 2 — Investigation */}
                    <Section title={`Investigation (${labs.length}${batchLabs.length > 0 ? ` + ${batchLabs.length}` : ''})`} icon={<Beaker className="w-5 h-5 text-amber-500" />} defaultOpen={true}>
                        <div className="space-y-4">
                            {/* Investigation category selector */}
                            {!isCompleted && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Select Investigation Type</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {INVESTIGATION_CATEGORIES.map(cat => {
                                            const isActive = selectedInvestigations.includes(cat.id);
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => toggleInvestigation(cat.id)}
                                                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium
                                                ${isActive
                                                            ? 'border-brand-500 bg-brand-500/5 text-brand-600 dark:text-brand-400 shadow-sm'
                                                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <span className="text-lg">{cat.icon}</span>
                                                    {cat.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Lab test selector (shown when Laboratory is selected) */}
                            {!isCompleted && selectedInvestigations.includes('laboratory') && (
                                <div className="animate-in slide-in-from-top-2 duration-200 bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4">
                                    <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2 block">Laboratory Tests</label>
                                    <form 
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            addLabToBatch();
                                        }}
                                        className="flex gap-2"
                                    >
                                        <select value={newLab.test_name} onChange={e => setNewLab({ ...newLab, test_name: e.target.value, test_category: 'laboratory' })}
                                            className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white">
                                            <option value="" disabled>Select Test...</option>
                                            {(availableTests.length > 0 ? availableTests : LAB_TESTS).map(group => (
                                                <optgroup key={group.category} label={group.category}>
                                                    {group.tests.map((test: string) => (
                                                        <option key={test} value={test}>{test}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        <select value={newLab.priority} onChange={e => setNewLab({ ...newLab, priority: e.target.value })}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none text-slate-900 dark:text-white">
                                            <option value="routine">Routine</option>
                                            <option value="urgent">Urgent</option>
                                            <option value="stat">STAT</option>
                                        </select>
                                        <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> Add
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Non-lab investigation ordering */}
                            {!isCompleted && selectedInvestigations.filter(s => s !== 'laboratory').length > 0 && (
                                <div className="animate-in slide-in-from-top-2 duration-200 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-900/30 rounded-xl p-4 space-y-3">
                                    <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 block">Add Investigation to Batch</label>
                                    {selectedInvestigations.filter(s => s !== 'laboratory').map(catId => {
                                        const cat = INVESTIGATION_CATEGORIES.find(c => c.id === catId);
                                        return (
                                            <form 
                                                key={catId} 
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    const input = document.getElementById(`inv-${catId}`) as HTMLInputElement;
                                                    const priSelect = document.getElementById(`inv-pri-${catId}`) as HTMLSelectElement;
                                                    if (input?.value.trim()) {
                                                        setBatchLabs([...batchLabs, {
                                                            id: Math.random().toString(36).substr(2, 9),
                                                            test_name: input.value.trim(),
                                                            test_category: catId,
                                                            priority: priSelect?.value || 'routine',
                                                            notes: '',
                                                        }]);
                                                        input.value = '';
                                                    }
                                                }}
                                                className="flex gap-2 items-center"
                                            >
                                                <span className="text-lg w-8">{cat?.icon}</span>
                                                <input
                                                    type="text"
                                                    id={`inv-${catId}`}
                                                    placeholder={`${cat?.label} details...`}
                                                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                                                />
                                                <select className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none text-slate-900 dark:text-white" id={`inv-pri-${catId}`}>
                                                    <option value="routine">Routine</option>
                                                    <option value="urgent">Urgent</option>
                                                    <option value="stat">STAT</option>
                                                </select>
                                                <button
                                                    type="submit"
                                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1"
                                                >
                                                    <Plus className="w-3 h-3" /> Add
                                                </button>
                                            </form>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Pending Investigation Batch */}
                            {!isCompleted && batchLabs.length > 0 && (
                                <div className="animate-in slide-in-from-top-2 duration-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/5 dark:to-orange-500/5 border border-amber-300 dark:border-amber-800/50 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                                            Pending Batch ({batchLabs.length} investigation{batchLabs.length > 1 ? 's' : ''})
                                        </label>
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        {batchLabs.map(lab => {
                                            const catInfo = INVESTIGATION_CATEGORIES.find(c => c.id === lab.test_category);
                                            return (
                                                <div key={lab.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900/60 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">{catInfo?.icon || '🔬'}</span>
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{lab.test_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${lab.priority === 'stat' ? 'bg-rose-100 text-rose-600' : lab.priority === 'urgent' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                                            {lab.priority}
                                                        </span>
                                                        <button onClick={() => removeLabFromBatch(lab.id)} className="text-rose-400 hover:text-rose-600 transition-colors">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={finalizeLabBatch}
                                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                                    >
                                        <Send className="w-4 h-4" />
                                        Finalize & Send to Lab ({batchLabs.length})
                                    </button>
                                </div>
                            )}

                            {/* Ordered investigations list */}
                            {labs.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Ordered Investigations</label>
                                    {labs.map((lab: any, idx: number) => (
                                        <div key={`${lab.id}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                            <div>
                                                <p className="font-semibold text-sm text-slate-900 dark:text-white">{lab.test_name}</p>
                                                <p className="text-xs text-slate-400">{lab.test_category || 'laboratory'} • {lab.status} • {lab.priority}</p>
                                            </div>
                                            {lab.result_value && (
                                                <span className={`text-sm font-mono font-semibold ${lab.abnormal_flag === 'normal' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {lab.result_value} {lab.result_unit}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* Section 3 — Diagnosis */}
                    <Section title="Diagnosis" icon={<Brain className="w-5 h-5 text-red-500" />} defaultOpen={true}>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Clinical Impressions</label>
                                <textarea
                                    value={form.primary_diagnosis}
                                    onChange={e => setForm({ ...form, primary_diagnosis: e.target.value })}
                                    disabled={isCompleted}
                                    rows={3}
                                    placeholder="Enter clinical findings..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white resize-none disabled:opacity-60 transition-all"
                                />
                            </div>

                            {/* ICD-10 Search */}
                            {!isCompleted && (
                                <div className="relative">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Search ICD-10 Codes</label>
                                    <form 
                                        onSubmit={(e) => e.preventDefault()}
                                        className="relative"
                                    >
                                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={icdSearch}
                                            onChange={(e) => searchICD10(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && icdResults.length > 0) {
                                                    selectICD10(icdResults[0]);
                                                }
                                            }}
                                            placeholder="Search by code or disease name..."
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                                        />
                                    </form>

                                    {icdResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-64 overflow-y-auto">
                                            {icdResults.map(item => (
                                                <button
                                                    key={item.code}
                                                    type="button"
                                                    onClick={() => selectICD10(item)}
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0"
                                                >
                                                    <p className="text-sm text-slate-900 dark:text-white">{item.desc}</p>
                                                    <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2 py-1 rounded-lg ml-3 whitespace-nowrap">
                                                        {item.code}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Confirmed ICD-10 area */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block font-mono">Confirmed ICD-10 Diagnoses</label>
                                <div className="space-y-2">
                                    {form.secondary_diagnoses.map((d) => (
                                        <div key={d.icd_code} className="flex items-center justify-between p-3 bg-brand-50/30 dark:bg-brand-500/5 border border-brand-100 dark:border-brand-900/30 rounded-xl group transition-all hover:bg-brand-50/50">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded font-mono italic">{d.icd_code}</span>
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{d.diagnosis}</span>
                                            </div>
                                            {!isCompleted && (
                                                <button type="button" onClick={() => removeICD(d.icd_code)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                <textarea
                                    readOnly
                                    value={form.secondary_diagnoses.length > 0 
                                        ? form.secondary_diagnoses.map(d => `[${d.icd_code}] ${d.diagnosis}`).join('\n')
                                        : 'No ICD-10 codes selected.'
                                    }
                                    rows={Math.max(2, form.secondary_diagnoses.length)}
                                    className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400 font-mono resize-none focus:ring-0 leading-relaxed"
                                    placeholder="Codes will appear here after selection..."
                                />
                            </div>

                        </div>
                    </Section>

                    <Section title="Drug History & Allergies" icon={<Pill className="w-4 h-4 text-orange-500" />}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Current Medications</label>
                                <textarea value={form.drug_history} onChange={e => setForm({ ...form, drug_history: e.target.value })} rows={2} disabled={isCompleted}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white resize-none disabled:opacity-60 transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Known Allergies</label>
                                <textarea value={form.allergy_notes} onChange={e => setForm({ ...form, allergy_notes: e.target.value })} rows={2} disabled={isCompleted}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white resize-none disabled:opacity-60 transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 outline-none" />
                            </div>
                        </div>
                    </Section>

                    {/* Section 4 — Prescription / Drugs */}
                    <Section title={`Prescription / Drugs (${meds.length}${batchMeds.length > 0 ? ` + ${batchMeds.length}` : ''})`} icon={<Pill className="w-4 h-4 text-indigo-500" />} defaultOpen={true}>
                        {meds.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                                {meds.map((med: any, idx: number) => (
                                    <div key={`${med.id}-${idx}`} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                                        <div>
                                            <p className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight">{med.medication_name}</p>
                                            <p className="text-[10px] text-slate-500 font-medium">{med.dosage} • {med.frequency} • {med.route}</p>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${med.prescription_status === 'dispensed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                            {med.prescription_status || 'pending'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!isCompleted && (
                            <div className="space-y-3">
                                <div className="relative">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Search Hospital Pharma Inventory</label>
                                    <form 
                                        onSubmit={(e) => e.preventDefault()}
                                        className="relative"
                                    >
                                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={drugSearch}
                                            onChange={(e) => searchHospitalDrugs(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && drugResults.length > 0) {
                                                    selectInventoryDrug(drugResults[0]);
                                                }
                                            }}
                                            placeholder="Search drug by name or brand..."
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                                        />
                                        {searchingDrugs && <Loader2 className="absolute right-3 top-3 w-4 h-4 text-brand-500 animate-spin" />}
                                    </form>

                                    {drugResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-64 overflow-y-auto custom-scrollbar">
                                            {drugResults.map(drug => (
                                                <button
                                                    key={drug.id}
                                                    onClick={() => selectInventoryDrug(drug)}
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0"
                                                >
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900 dark:text-white uppercase">{drug.item_name}</p>
                                                        <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase">{drug.brand_name || 'Generic'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">₦{parseFloat(drug.unit_price).toLocaleString()}</p>
                                                        <p className="text-[10px] text-slate-400">{drug.quantity} in stock</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        addToBatch();
                                    }}
                                    className="space-y-3"
                                >
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                            <input list="doses" type="text" value={newMed.dosage} onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
                                                placeholder="Dosage (e.g. 500mg)" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white" />
                                            <datalist id="doses">
                                                {COMMON_DOSES.map(d => <option key={d} value={d} />)}
                                            </datalist>
                                        </div>
                                        <div className="relative">
                                            <input list="frequencies" type="text" value={newMed.frequency} onChange={e => setNewMed({ ...newMed, frequency: e.target.value })}
                                                placeholder="Frequency (e.g. TDS)" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white" />
                                            <datalist id="frequencies">
                                                {COMMON_FREQUENCIES.map(f => <option key={f} value={f} />)}
                                            </datalist>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <select value={newMed.route} onChange={e => setNewMed({ ...newMed, route: e.target.value })}
                                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none text-slate-900 dark:text-white">
                                            <option value="oral">Oral</option>
                                            <option value="iv">IV</option>
                                            <option value="im">IM</option>
                                            <option value="topical">Topical</option>
                                            <option value="inhalation">Inhalation</option>
                                        </select>
                                        <input type="text" value={newMed.instructions} onChange={e => setNewMed({ ...newMed, instructions: e.target.value })}
                                            placeholder="Instructions..." className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white" />
                                        <button
                                            type="submit"
                                            disabled={!newMed.inventory_item_id || !newMed.dosage}
                                            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 whitespace-nowrap transition-all"
                                        >
                                            <Plus className="w-3 h-3" /> Add to Batch
                                        </button>
                                    </div>
                                </form>

                                {/* Pending Batch List */}
                                {batchMeds.length > 0 && (
                                    <div className="mt-4 p-4 bg-brand-500/5 border border-brand-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">Pending Batch</h4>
                                            <span className="text-[10px] font-mono text-slate-400">{batchMeds.length} item(s)</span>
                                        </div>
                                        <div className="space-y-2">
                                            {batchMeds.map(m => (
                                                <div key={m.id} className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{m.medication_name}</p>
                                                        <p className="text-[10px] text-slate-500">{m.dosage} • {m.frequency} • {m.route}</p>
                                                    </div>
                                                    <button onClick={() => removeFromBatch(m.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={prescribeMed}
                                            disabled={submittingBatch}
                                            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
                                        >
                                            {submittingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            Finalize & Send to Pharmacy
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </Section>

                </>
            )}

            {/* Treatment Plan */}
            <Section title="Treatment & Disposition" icon={<Stethoscope className="w-4 h-4 text-emerald-500" />} defaultOpen={true}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Disposition / Plan</label>
                        <select value={form.admission_decision} onChange={e => setForm({ ...form, admission_decision: e.target.value })} disabled={isCompleted}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-60 focus:border-brand-500 outline-none appearance-none cursor-pointer">
                            <option value="discharge">Discharge Patient</option>
                            <option value="admit">Admit to Ward</option>
                            <option value="refer">Refer Outward</option>
                            <option value="observe">Clinical Observation</option>
                        </select>
                    </div>
                    <div className="lg:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Nursing Directives</label>
                        <textarea value={form.nursing_instructions} onChange={e => setForm({ ...form, nursing_instructions: e.target.value })} rows={1} disabled={isCompleted}
                            placeholder="Clinical care notes..."
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white resize-none disabled:opacity-60 focus:border-brand-500 outline-none transition-all" />
                    </div>
                    <div className="lg:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Plan & Folow-up</label>
                        <textarea value={form.additional_notes} onChange={e => setForm({ ...form, additional_notes: e.target.value })} rows={1} disabled={isCompleted}
                            placeholder="Follow-up instructions..."
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white resize-none disabled:opacity-60 focus:border-brand-500 outline-none transition-all" />
                    </div>
                </div>
            </Section>
        </div >
    );
}

