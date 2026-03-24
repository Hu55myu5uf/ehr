import React, { useState, useEffect } from 'react';
import { X, User, Calendar, UserPlus, Loader2, Stethoscope, FlaskConical, Search, Check, Plus, Minus, Receipt, Pill, Package, ArrowRight, ChevronDown } from 'lucide-react';
import api from '../api/client';

interface WalkInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (result: any) => void;
    title?: string;
    mode?: 'consultation' | 'lab_only' | 'pharmacy_only' | 'select';
    existingPatientId?: string;
}

interface CatalogItem {
    name: string;
    price: number;
    category: string;
    brand?: string;
    available_qty?: number;
    inventory_item_id?: number | string;
}

export default function WalkInModal({ isOpen, onClose, onSuccess, title = "Walk-in Registration", mode = 'select', existingPatientId }: WalkInModalProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'service' | 'details' | 'items' | 'summary'>('service');
    const [serviceType, setServiceType] = useState<'consultation' | 'lab_only' | 'pharmacy_only'>('consultation');
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        gender: 'male',
        age: '',
        chief_complaint: '',
        provider_id: ''
    });
    const [providers, setProviders] = useState<any[]>([]);

    // Catalog items (labs or meds)
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [consultationFee, setConsultationFee] = useState(0);
    const [selectedItems, setSelectedItems] = useState<CatalogItem[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (mode !== 'select') {
                setServiceType(mode as any);
                setStep(existingPatientId ? 'items' : 'details');
                if (mode === 'consultation') fetchProviders();
            } else {
                setServiceType('consultation');
                setStep('service');
                fetchProviders();
            }
        }
    }, [isOpen, mode, existingPatientId]);

    useEffect(() => {
        if (isOpen && (serviceType === 'lab_only' || serviceType === 'pharmacy_only' || step === 'items')) {
            fetchCatalog();
        }
    }, [isOpen, serviceType, step]);

    const fetchCatalog = async () => {
        setCatalogLoading(true);
        try {
            const endpoint = serviceType === 'lab_only' ? '/walk-in/lab-catalog' : '/walk-in/med-catalog';
            const res = await api.get(endpoint);
            setCatalog(res.data.catalog || []);
            if (serviceType === 'lab_only') {
                setConsultationFee(res.data.consultation_fee || 0);
            }
        } catch (err) {
            console.error('Failed to load catalog:', err);
        } finally {
            setCatalogLoading(false);
        }
    };

    const fetchProviders = async () => {
        try {
            const res = await api.get('/providers');
            setProviders(res.data.providers || []);
        } catch (err) {
            console.error('Failed to fetch providers:', err);
        }
    };

    if (!isOpen) return null;

    const resetForm = () => {
        setFormData({ first_name: '', last_name: '', gender: 'male', age: '', chief_complaint: '', provider_id: '' });
        setSelectedItems([]);
        setStep(mode === 'select' ? 'service' : 'details');
        setCatalogSearch('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const toggleItem = (item: CatalogItem) => {
        setSelectedItems(prev => {
            const exists = prev.find(t => t.name === item.name);
            if (exists) {
                return prev.filter(t => t.name !== item.name);
            }
            return [...prev, item];
        });
    };

    const totalAmount = () => {
        const itemTotal = selectedItems.reduce((sum, t) => sum + t.price, 0);
        if (serviceType === 'consultation') {
            return itemTotal + consultationFee;
        }
        return itemTotal;
    };

    const handleServiceSelect = (type: 'consultation' | 'lab_only' | 'pharmacy_only') => {
        setServiceType(type);
        if (existingPatientId && (type === 'lab_only' || type === 'pharmacy_only')) {
            setStep('items');
        } else {
            setStep('details');
        }
    };

    const handleDetailsNext = () => {
        if (serviceType === 'lab_only' || serviceType === 'pharmacy_only') {
            setStep('items');
        } else {
            setStep('summary');
        }
    };

    const handleItemsNext = () => {
        if (selectedItems.length === 0) return;
        setStep('summary');
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const age = parseInt(formData.age);
            const dob = new Date();
            dob.setFullYear(dob.getFullYear() - age);
            const dobString = `${dob.getFullYear()}-01-01`;

            if (serviceType === 'consultation') {
                onSuccess({
                    ...formData,
                    date_of_birth: dobString,
                    service_type: 'consultation'
                });
            } else if (serviceType === 'lab_only') {
                const tests = selectedItems.map(t => ({
                    test_name: t.name,
                    test_category: t.category,
                }));

                let result;
                if (existingPatientId) {
                    result = await api.post('/walk-in/lab-tests/existing', {
                        patient_id: existingPatientId,
                        tests,
                    });
                } else {
                    result = await api.post('/walk-in/lab-tests', {
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        gender: formData.gender,
                        date_of_birth: dobString,
                        tests,
                    });
                }

                onSuccess({
                    ...result.data,
                    service_type: 'lab_only'
                });
            } else if (serviceType === 'pharmacy_only') {
                const medications = selectedItems.map((m: any) => ({
                    medication_name: m.name,
                    inventory_item_id: m.inventory_item_id,
                    dosage: '1 Unit',
                    quantity: 1, // Default for walk-in, can be enhanced with a selector
                    frequency: 'once',
                    route: 'oral',
                }));

                let result;
                if (existingPatientId) {
                    result = await api.post('/walk-in/pharmacy/existing', {
                        patient_id: existingPatientId,
                        medications,
                    });
                } else {
                    result = await api.post('/walk-in/pharmacy', {
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        gender: formData.gender,
                        date_of_birth: dobString,
                        medications,
                    });
                }

                onSuccess({
                    ...result.data,
                    service_type: 'pharmacy_only'
                });
            }

            handleClose();
        } catch (err: any) {
            console.error('Walk-in error:', err);
            alert(err?.response?.data?.error || 'Failed to process walk-in');
        } finally {
            setLoading(false);
        }
    };

    const filteredCatalog = catalog.filter(t =>
        t.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (t.brand && t.brand.toLowerCase().includes(catalogSearch.toLowerCase())) ||
        t.category.toLowerCase().includes(catalogSearch.toLowerCase())
    );

    const groupedCatalog = filteredCatalog.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, CatalogItem[]>);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(price);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                            <div className="p-2 bg-brand-500/10 rounded-xl">
                                {serviceType === 'lab_only' ? <FlaskConical className="w-5 h-5 text-brand-500" /> : 
                                 serviceType === 'pharmacy_only' ? <Pill className="w-5 h-5 text-brand-500" /> :
                                 <UserPlus className="w-5 h-5 text-brand-500" />}
                            </div>
                            {serviceType === 'lab_only' ? 'Walk-in Lab Test' : 
                             serviceType === 'pharmacy_only' ? 'Walk-in Pharmacy' : title}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 font-medium tracking-wide">
                            {step === 'service' && 'Select the service needed'}
                            {step === 'details' && 'Enter patient details'}
                            {step === 'items' && (serviceType === 'lab_only' ? 'Select lab tests' : 'Select medications')}
                            {step === 'summary' && 'Review and confirm'}
                        </p>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className="px-6 pt-4 flex gap-2 shrink-0">
                    {['service', 'details', ...((serviceType === 'lab_only' || serviceType === 'pharmacy_only') ? ['items'] : []), 'summary'].map((s, i) => (
                        <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${
                            (['service', 'details', 'items', 'summary'].filter(step_key => {
                                if (step_key === 'items' && serviceType === 'consultation') return false;
                                return true;
                            }).indexOf(step) >= i)
                                ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'
                        }`} />
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Service Selection */}
                    {step === 'service' && (
                        <div className="space-y-4">
                            <button
                                onClick={() => handleServiceSelect('consultation')}
                                className="w-full p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 transition-all text-left group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/20 transition-colors">
                                        <Stethoscope className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Consultation</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">See a doctor for medical advice</p>
                                        <p className="text-xs text-brand-500 font-semibold mt-1">Fee: {formatPrice(consultationFee || 5000)}</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 transition-colors" />
                                </div>
                            </button>

                            <button
                                onClick={() => handleServiceSelect('lab_only')}
                                className="w-full p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 transition-all text-left group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-violet-500/10 rounded-2xl group-hover:bg-violet-500/20 transition-colors">
                                        <FlaskConical className="w-6 h-6 text-violet-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Lab Tests Only</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Order tests without consultation</p>
                                        <p className="text-xs text-violet-500 font-semibold mt-1">No consultation fee</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 transition-colors" />
                                </div>
                            </button>

                            <button
                                onClick={() => handleServiceSelect('pharmacy_only')}
                                className="w-full p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 transition-all text-left group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-colors">
                                        <Pill className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Pharmacy Only</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Buy medications directly</p>
                                        <p className="text-xs text-blue-500 font-semibold mt-1">No consultation fee</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 transition-colors" />
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Step 2: Patient Details */}
                    {step === 'details' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">First Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="text" required value={formData.first_name}
                                            onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none"
                                            placeholder="First Name" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Last Name</label>
                                    <input type="text" required value={formData.last_name}
                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none"
                                        placeholder="Last Name" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gender</label>
                                    <div className="relative">
                                        <select value={formData.gender}
                                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none appearance-none">
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ArrowRight className="w-4 h-4 rotate-90" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Age (Years)</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="number" required min="0" max="120" value={formData.age}
                                            onChange={e => setFormData({ ...formData, age: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none"
                                            placeholder="25" />
                                    </div>
                                </div>
                            </div>

                            {serviceType === 'consultation' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Chief Complaint (optional)</label>
                                        <textarea value={formData.chief_complaint}
                                            onChange={e => setFormData({ ...formData, chief_complaint: e.target.value })}
                                            rows={2}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none resize-none"
                                            placeholder="Why is the patient visiting?" />
                                    </div>
                                    <div className="space-y-2 mt-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                            <Stethoscope className="w-3 h-3 text-brand-500" /> Select Doctor (Optional)
                                        </label>
                                        <div className="relative">
                                            <select 
                                                value={formData.provider_id}
                                                onChange={e => setFormData({ ...formData, provider_id: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none appearance-none"
                                            >
                                                <option value="">Auto-Assign / Any Doctor</option>
                                                {providers.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        Dr. {p.first_name} {p.last_name === 'Provider' ? '' : p.last_name} ({p.specialty || 'General Practice'})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <ChevronDown className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 3: Catalog Selection */}
                    {step === 'items' && (
                        <div className="space-y-4 h-full flex flex-col">
                            {/* Search */}
                            <div className="relative shrink-0">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" value={catalogSearch}
                                    onChange={e => setCatalogSearch(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none"
                                    placeholder={serviceType === 'lab_only' ? "Search lab tests..." : "Search medications..."} />
                            </div>

                            {/* Selected items summary */}
                            {selectedItems.length > 0 && (
                                <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-2xl p-3 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                                            {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                                        </span>
                                        <span className="text-sm font-black text-brand-600">
                                            {formatPrice(selectedItems.reduce((s, t) => s + t.price, 0))}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Catalog */}
                            {catalogLoading ? (
                                <div className="flex-1 flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                                    {Object.entries(groupedCatalog).length === 0 ? (
                                        <div className="text-center py-10">
                                            <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                            <p className="text-sm text-slate-500">No items found</p>
                                        </div>
                                    ) : (
                                        Object.entries(groupedCatalog).map(([category, items]) => (
                                            <div key={category}>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{category}</h4>
                                                <div className="space-y-1">
                                                    {items.map(item => {
                                                        const isSelected = selectedItems.some(t => t.name === item.name);
                                                        return (
                                                            <button key={item.name}
                                                                onClick={() => toggleItem(item)}
                                                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left group ${
                                                                    isSelected
                                                                        ? 'bg-brand-50 dark:bg-brand-900/30 border-2 border-brand-500 dark:border-brand-500'
                                                                        : 'bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                                                                        isSelected ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300'
                                                                    }`}>
                                                                        {isSelected ? <Check className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-sm font-bold ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                            {item.name}
                                                                        </span>
                                                                        {item.brand && (
                                                                            <span className="text-[10px] text-slate-500 italic uppercase leading-none">
                                                                                Brand: {item.brand}
                                                                            </span>
                                                                        )}
                                                                        {item.available_qty !== undefined && (
                                                                            <span className={`text-[10px] font-bold mt-1 ${item.available_qty > 10 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                                                In Stock: {item.available_qty}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className={`text-sm font-bold ${isSelected ? 'text-brand-600' : 'text-slate-500'}`}>{formatPrice(item.price)}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Summary */}
                    {step === 'summary' && (
                        <div className="space-y-5">
                            {/* Patient info */}
                            {!existingPatientId && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-2 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 bg-brand-500/5 rounded-full -mr-4 -mt-4 group-hover:bg-brand-500/10 transition-colors" />
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</h4>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white relative z-10">
                                        {formData.first_name} {formData.last_name}
                                    </p>
                                    <p className="text-xs text-slate-500 relative z-10">
                                        {formData.gender}, {formData.age} years old
                                    </p>
                                </div>
                            )}

                            {/* Bill breakdown */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Receipt className="w-3.5 h-3.5" /> Bill Summary
                                </h4>

                                {serviceType === 'consultation' && (
                                    <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Walk-in Consultation Fee</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatPrice(consultationFee || 5000)}</span>
                                    </div>
                                )}

                                {selectedItems.map(item => (
                                    <div key={item.name} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 group">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleItem(item)} className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="text-sm text-slate-700 dark:text-slate-300">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatPrice(item.price)}</span>
                                    </div>
                                ))}

                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Total Amount Due</span>
                                    <span className="text-xl font-black text-brand-600 tracking-tighter">{formatPrice(totalAmount())}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0">
                    {step !== 'service' && (
                        <button type="button"
                            onClick={() => {
                                if (step === 'details') setStep(mode === 'select' ? 'service' : 'details');
                                else if (step === 'items') setStep(existingPatientId ? 'service' : 'details');
                                else if (step === 'summary') setStep((serviceType === 'lab_only' || serviceType === 'pharmacy_only') ? 'items' : 'details');
                            }}
                            disabled={step === 'details' && mode !== 'select'}
                            className="flex-1 px-6 py-4 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                            Back
                        </button>
                    )}

                    {step === 'service' && (
                        <button type="button" onClick={handleClose}
                            className="flex-1 px-6 py-4 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                            Cancel
                        </button>
                    )}

                    {step === 'details' && (
                        <button type="button"
                            onClick={handleDetailsNext}
                            disabled={!formData.first_name || !formData.last_name || !formData.age}
                            className="flex-[2] bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:hover:bg-brand-600 text-white px-6 py-4 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-brand-600/20">
                            {(serviceType === 'lab_only' || serviceType === 'pharmacy_only') ? 'Select Items →' : 'Review →'}
                        </button>
                    )}

                    {step === 'items' && (
                        <button type="button"
                            onClick={handleItemsNext}
                            disabled={selectedItems.length === 0}
                            className="flex-[2] bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:hover:bg-brand-600 text-white px-6 py-4 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-brand-600/20">
                            Review ({selectedItems.length} items) →
                        </button>
                    )}

                    {step === 'summary' && (
                        <button type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2">
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Confirm & Generate Bill
                                    <Receipt className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
