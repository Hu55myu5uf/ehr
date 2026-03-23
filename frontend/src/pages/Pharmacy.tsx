import React, { useEffect, useState } from 'react';
import { Pill, Refrigerator, Search, AlertTriangle, Clock, CheckCircle2, Loader2, Package, ArrowRight, MinusCircle, X, Plus, Save, Trash2, Printer, UserPlus } from 'lucide-react';
import api from '../api/client';
import InvoiceModal from '../components/InvoiceModal';
import WalkInModal from '../components/WalkInModal';

interface Prescription {
    id: string;
    patient_id: string;
    patient_first: string;
    patient_last: string;
    mrn: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    route: string;
    refills_remaining: number;
    prescription_status: string;
    billing_status: string;
    batch_id: string | null;
    quantity: number;
    created_at: string;
}

interface BatchGroup {
    key: string;
    patient_first: string;
    patient_last: string;
    mrn: string;
    patient_id: string;
    billing_status: string;
    items: Prescription[];
    created_at: string;
}

export default function Pharmacy() {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [patientQuery, setPatientQuery] = useState('');
    const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);
    const [loadingPatientRx, setLoadingPatientRx] = useState(false);
    const [selectedPatientRx, setSelectedPatientRx] = useState<string[]>([]);
    
    // Invoice Print Modal State
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [generatedBill, setGeneratedBill] = useState<any>(null);
    const [selectedBatch, setSelectedBatch] = useState<BatchGroup | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'patients' | 'awaiting_payment' | 'inventory' | 'history'>('patients');
    const [inventory, setInventory] = useState<any[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [awaitingPaymentPrescriptions, setAwaitingPaymentPrescriptions] = useState<Prescription[]>([]);
    const [historyPrescriptions, setHistoryPrescriptions] = useState<Prescription[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
    const [newStockItem, setNewStockItem] = useState({ item_name: '', brand_name: '', category: '', quantity: 0, unit: 'Tabs', unit_price: 0 });

    const userStr = localStorage.getItem('user');
    const user = userStr && userStr !== 'undefined' ? JSON.parse(userStr) : {};
    const canDispense = user.role === 'pharmacist' || user.role === 'super_admin';
    const isAdmin = user.role === 'super_admin';

    useEffect(() => {
        if (activeTab === 'pending') fetchPrescriptions();
        if (activeTab === 'inventory') fetchInventory();
        if (activeTab === 'patients') fetchAllPendingInvoices();
        if (activeTab === 'awaiting_payment') fetchAwaitingPayment();
        if (activeTab === 'history') fetchHistory();
    }, [activeTab]);

    const fetchAwaitingPayment = async () => {
        try {
            setLoading(true);
            const res = await api.get('/pharmacy/orders/awaiting-payment');
            setAwaitingPaymentPrescriptions(res.data.prescriptions || []);
        } catch (err) {
            console.error('Failed to fetch awaiting payment prescriptions', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllPendingInvoices = async () => {
        try {
            setLoadingPatientRx(true);
            const res = await api.get('/pharmacy/invoicing/pending');
            setPatientPrescriptions(res.data.prescriptions || []);
            setSelectedPatientRx([]);
            setPatientQuery(''); // Clear search when auto-loading
        } catch (err) {
            console.error('Failed to fetch all pending invoices', err);
        } finally {
            setLoadingPatientRx(false);
        }
    };

    const fetchPrescriptions = async () => {
        try {
            setLoading(true);
            const res = await api.get('/medications/pending');
            setPrescriptions(res.data.prescriptions || []);
        } catch (err) {
            console.error('Failed to fetch prescriptions', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchInventory = async () => {
        try {
            setLoadingInventory(true);
            const res = await api.get('/inventory');
            setInventory(res.data.items || []);
        } catch (err) {
            console.error('Failed to fetch inventory', err);
        } finally {
            setLoadingInventory(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const res = await api.get('/medications/history');
            setHistoryPrescriptions(res.data.medications || []);
        } catch (err) {
            console.error('Failed to fetch medication history', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSearchPatient = async () => {
        if (!patientQuery.trim()) return;
        try {
            setLoadingPatientRx(true);
            const res = await api.get(`/medications/patient/${patientQuery}/pending`);
            setPatientPrescriptions(res.data.prescriptions || []);
            setSelectedPatientRx([]);
        } catch (err) {
            console.error('Failed to fetch patient prescriptions', err);
            alert('Patient not found or no pending prescriptions');
        } finally {
            setLoadingPatientRx(false);
        }
    };

    const handleGenerateInvoice = async () => {
        if (selectedPatientRx.length === 0) return;
        try {
            const firstSelected = patientPrescriptions.find(rx => rx.id === selectedPatientRx[0]);
            if (!firstSelected) return;

            const res = await api.post('/pharmacy/invoice', {
                patient_id: firstSelected.patient_id,
                medication_ids: selectedPatientRx
            });
            
            if (res.data.bill) {
                setGeneratedBill(res.data.bill);
                setShowInvoiceModal(true);
                setSelectedPatientRx([]);
                if (patientQuery) handleSearchPatient();
                else fetchAllPendingInvoices();
            } else {
                alert('Invoice generated and sent to billing!');
                if (patientQuery) handleSearchPatient();
                else fetchAllPendingInvoices();
            }
        } catch (err) {
            alert('Failed to generate invoice');
        }
    };

    const handleAddStock = async () => {
        try {
            await api.post('/inventory/add', newStockItem);
            setNewStockItem({ item_name: '', brand_name: '', category: '', quantity: 0, unit: 'Tabs', unit_price: 0 });
            fetchInventory();
        } catch (err) {
            alert('Failed to add stock item');
        }
    };

    const handleUpdateStock = async (id: string, qty: number) => {
        try {
            await api.post(`/inventory/${id}/update`, { quantity: qty });
            fetchInventory();
        } catch (err) {
            alert('Failed to update stock');
        }
    };

    const handleDeleteInventory = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this drug from inventory?')) return;
        try {
            await api.delete(`/inventory/${id}`);
            fetchInventory();
        } catch (err) {
            alert('Failed to delete item');
        }
    };

    const handleDispense = async (batch: BatchGroup) => {
        try {
            for (const med of batch.items) {
                await api.post(`/medications/${med.id}/dispense`);
            }
            alert(`${batch.items.length} medication(s) dispensed successfully`);
            fetchPrescriptions();
            setSelectedBatch(null);
        } catch (err) {
            alert('Failed to dispense medication');
        }
    };

    const filteredRx = prescriptions.filter(p =>
        p.patient_first.toLowerCase().includes(search.toLowerCase()) ||
        p.patient_last.toLowerCase().includes(search.toLowerCase()) ||
        p.medication_name.toLowerCase().includes(search.toLowerCase()) ||
        p.mrn.toLowerCase().includes(search.toLowerCase())
    );

    const handleWalkInSuccess = (result: any) => {
        setIsWalkInModalOpen(false);
        if (result.bill) {
            setGeneratedBill(result.bill);
            setShowInvoiceModal(true);
        }
        fetchAllPendingInvoices();
    };

    // Group prescriptions by batch_id (or individual id if no batch)
    const groupedRx: BatchGroup[] = (() => {
        const groups: Record<string, BatchGroup> = {};
        filteredRx.forEach(rx => {
            const key = rx.patient_id;
            if (!groups[key]) {
                groups[key] = {
                    key,
                    patient_first: rx.patient_first,
                    patient_last: rx.patient_last,
                    mrn: rx.mrn,
                    patient_id: rx.patient_id,
                    billing_status: rx.billing_status,
                    items: [],
                    created_at: rx.created_at,
                };
            }
            groups[key].items.push(rx);
        });
        return Object.values(groups);
    })();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pharmacy & Inventory</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Dispensing and prescription management system</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsWalkInModalOpen(true)}
                        className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-brand-600/20"
                    >
                        <UserPlus className="w-5 h-5" />
                        Walk-in Pharmacy
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto scrollbar-hidden">
                    <button
                        onClick={() => setActiveTab('patients')}
                        className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === 'patients' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500'}`}
                    >
                        Invoicing
                    </button>
                    <button
                        onClick={() => setActiveTab('awaiting_payment')}
                        className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === 'awaiting_payment' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500'}`}
                    >
                        Awaiting Payment
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === 'pending' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500'}`}
                    >
                        Paid Invoices
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === 'inventory' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500'}`}
                    >
                        Drug Inventory
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500'}`}
                    >
                        History
                    </button>
                </div>
                {activeTab !== 'patients' && (
                    <form onSubmit={(e) => e.preventDefault()} className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab === 'inventory' ? 'inventory' : 'prescriptions'}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-transparent border-none outline-none pl-10 pr-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-500"
                        />
                    </form>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'awaiting_payment' && (
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            Awaiting Payment
                        </h2>
                    )}
                    {activeTab === 'pending' && (
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Pill className="w-5 h-5 text-brand-500" />
                            Paid Invoices
                        </h2>
                    )}
                    {activeTab === 'inventory' && (
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Refrigerator className="w-5 h-5 text-brand-500" />
                            Drug Inventory
                        </h2>
                    )}
                    {activeTab === 'patients' && (
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Search className="w-5 h-5 text-brand-500" />
                            Patient Lookup (Invoicing)
                        </h2>
                    )}
                    {activeTab === 'history' && (
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-emerald-500" />
                            Dispensing History
                        </h2>
                    )}

                    {activeTab === 'pending' && (
                        loading ? (
                            <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                            </div>
                        ) : filteredRx.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 opacity-20" />
                                <p className="mt-4 text-slate-500">No pending prescriptions to dispense.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                {groupedRx.map(batch => (
                                    <div
                                        key={batch.key}
                                        onClick={() => setSelectedBatch(batch)}
                                        className={`p-5 rounded-3xl border transition-all cursor-pointer group ${selectedBatch?.key === batch.key
                                            ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500/50 shadow-md'
                                            : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-brand-500/30'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                                    <Pill className="w-6 h-6" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                                                        {batch.patient_first} {batch.patient_last}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 font-mono">{batch.mrn}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1 shrink-0">
                                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${batch.billing_status === 'paid' ? 'bg-emerald-500 text-white shadow-sm' :
                                                    batch.billing_status === 'approved' ? 'bg-indigo-100 text-indigo-600' :
                                                        batch.billing_status === 'invoiced' ? 'bg-amber-100 text-amber-600' :
                                                            'bg-slate-100 text-slate-500'}`}>
                                                    {batch.billing_status === 'paid' ? 'Paid' :
                                                        batch.billing_status === 'approved' ? 'Approved' :
                                                            batch.billing_status === 'invoiced' ? 'Invoiced' : 'Pending'}
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-400">{batch.items.length} med{batch.items.length > 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            {batch.items.map(med => (
                                                <div key={med.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">{med.medication_name}</span>
                                                    <span className="text-[10px] text-slate-400">{med.dosage} • {med.frequency} • Qty: {med.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}


                    {activeTab === 'awaiting_payment' && (
                        loading ? (
                            <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                            </div>
                        ) : awaitingPaymentPrescriptions.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                <Clock className="w-12 h-12 text-slate-200 dark:text-slate-800 opacity-20" />
                                <p className="mt-4 text-slate-500">No prescriptions awaiting payment.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                {(() => {
                                    const awaitGroups: Record<string, any[]> = {};
                                    awaitingPaymentPrescriptions.forEach(rx => {
                                        const key = rx.patient_id;
                                        if(!awaitGroups[key]) awaitGroups[key] = [];
                                        awaitGroups[key].push(rx);
                                    });
                                    return Object.entries(awaitGroups).map(([batchKey, items]) => (
                                        <div
                                            key={batchKey}
                                            className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                                        <Clock className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white uppercase truncate max-w-[140px]">{items[0].patient_first} {items[0].patient_last}</h4>
                                                        <p className="text-[10px] text-slate-500 font-mono tracking-tighter">{items[0].mrn}</p>
                                                    </div>
                                                </div>
                                                <div className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">Awaiting Payment</div>
                                            </div>
                                            <div className="space-y-1.5 mb-2">
                                                {items.map(t => (
                                                    <div key={t.id} className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 px-3 py-1.5 rounded-lg">
                                                        <span>{t.medication_name}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">{t.dosage}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <span className="text-[10px] text-slate-400 font-medium">Invoiced on {new Date(items[0].created_at).toLocaleDateString()}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{new Date(items[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        )
                    )}

                    {activeTab === 'patients' && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Patient Lookup (ID/MRN)</label>
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSearchPatient();
                                    }} 
                                    className="flex gap-3"
                                >
                                    <input
                                        type="text"
                                        placeholder="Enter Patient ID..."
                                        value={patientQuery}
                                        onChange={(e) => setPatientQuery(e.target.value)}
                                        className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-brand-600 hover:bg-brand-500 text-white px-8 rounded-2xl font-bold transition-all shadow-lg shadow-brand-600/20"
                                    >
                                        Search
                                    </button>
                                </form>
                            </div>

                            {loadingPatientRx ? (
                                <div className="py-20 flex flex-col items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                                </div>
                            ) : patientPrescriptions.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="font-bold text-slate-900 dark:text-white">
                                            {patientQuery ? `Pending Prescriptions for ${patientPrescriptions[0].patient_first}` : 'All Pending Invoices'}
                                        </h3>
                                        <button
                                            onClick={handleGenerateInvoice}
                                            disabled={selectedPatientRx.length === 0}
                                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                            Generate Invoice ({selectedPatientRx.length})
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {(() => {
                                            // Group patient prescriptions by batch_id
                                            const patientBatches: Record<string, any[]> = {};
                                            patientPrescriptions.forEach((rx: any) => {
                                                const key = rx.patient_id;
                                                if (!patientBatches[key]) patientBatches[key] = [];
                                                patientBatches[key].push(rx);
                                            });
                                            return Object.entries(patientBatches).map(([batchKey, batchItems]) => {
                                                const allIds = batchItems.map((r: any) => r.id);
                                                const allSelected = allIds.every((id: string) => selectedPatientRx.includes(id));
                                                return (
                                                    <div
                                                        key={batchKey}
                                                        onClick={() => {
                                                            const patientId = batchItems[0].patient_id;
                                                            const alreadySelectedPatientId = selectedPatientRx.length > 0 
                                                                ? patientPrescriptions.find(rx => rx.id === selectedPatientRx[0])?.patient_id 
                                                                : null;

                                                            if (alreadySelectedPatientId && alreadySelectedPatientId !== patientId) {
                                                                if (window.confirm('Selection changed to a different patient. Clear previous selection?')) {
                                                                    setSelectedPatientRx(allIds);
                                                                }
                                                                return;
                                                            }

                                                            if (allSelected) {
                                                                setSelectedPatientRx(selectedPatientRx.filter(id => !allIds.includes(id)));
                                                            } else {
                                                                setSelectedPatientRx([...new Set([...selectedPatientRx, ...allIds])]);
                                                            }
                                                        }}
                                                        className={`p-5 rounded-3xl border transition-all cursor-pointer ${allSelected
                                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/50 shadow-md'
                                                            : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-emerald-500/30'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${allSelected ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                                    <CheckCircle2 className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-900 dark:text-white uppercase">
                                                                        {batchItems[0].patient_first} {batchItems[0].patient_last}
                                                                    </p>
                                                                    <p className="text-[10px] font-mono text-slate-400">{batchItems[0].mrn}</p>
                                                                    <p className="text-xs font-bold text-brand-600 dark:text-brand-400 mt-1 uppercase">
                                                                        {batchItems.length > 1 ? `Batch (${batchItems.length} meds)` : batchItems[0].medication_name}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500">{batchItems[0].billing_status?.replace('_', ' ')}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {batchItems.map((med: any) => (
                                                                <div key={med.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">{med.medication_name}</span>
                                                                    <div className="text-right">
                                                                        <span className="text-[10px] text-slate-400">{med.dosage} • {med.frequency} • Qty: {med.quantity}</span>
                                                                        <span className="text-[10px] font-mono text-slate-500 ml-2">{med.current_inventory_price ? `₦${parseFloat(med.current_inventory_price).toLocaleString()}` : ''}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-20 text-center bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500">No pending prescriptions found.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'inventory' && (
                        <div className="space-y-6">
                            {/* Inventory content ... */}
                            <div className="bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                {/* Inventory Table UI */}
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <h3 className="font-bold text-slate-900 dark:text-white">Manage Drug Stock</h3>
                                    <button
                                        onClick={() => fetchInventory()}
                                        className="p-2 text-slate-400 hover:text-brand-500 transition-colors"
                                    >
                                        <Clock className="w-5 h-5" />
                                    </button>
                                </div>
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleAddStock();
                                    }} 
                                    className="p-6 bg-slate-50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800"
                                >
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Drug Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Paracetamol"
                                                value={newStockItem.item_name}
                                                onChange={e => setNewStockItem({ ...newStockItem, item_name: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Brand Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Panadol"
                                                value={newStockItem.brand_name}
                                                onChange={e => setNewStockItem({ ...newStockItem, brand_name: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Category</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Analgesic"
                                                value={newStockItem.category}
                                                onChange={e => setNewStockItem({ ...newStockItem, category: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Price (₦)</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={newStockItem.unit_price || ''}
                                                onChange={e => setNewStockItem({ ...newStockItem, unit_price: parseFloat(e.target.value) })}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Initial Qty</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={newStockItem.quantity || ''}
                                                onChange={e => setNewStockItem({ ...newStockItem, quantity: parseInt(e.target.value) })}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                type="submit"
                                                className="w-full bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold py-3 shadow-lg shadow-brand-600/20 transition-all"
                                            >
                                                Add Item
                                            </button>
                                        </div>
                                    </div>
                                </form>
                                <div className="overflow-x-auto scrollbar-slim">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                <th className="text-left px-6 py-4">Drug & Brand</th>
                                                <th className="text-left px-6 py-4">Category</th>
                                                <th className="text-left px-6 py-4">Price</th>
                                                <th className="text-left px-6 py-4">Stock</th>
                                                <th className="text-right px-6 py-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {loadingInventory ? (
                                                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" /></td></tr>
                                            ) : inventory.filter(i => i.item_name.toLowerCase().includes(search.toLowerCase()) || i.brand_name?.toLowerCase().includes(search.toLowerCase())).map(item => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <p className="font-bold text-slate-900 dark:text-white uppercase text-[13px]">{item.item_name}</p>
                                                        <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase">{item.brand_name || 'Generic'}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-xs">{item.category}</td>
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap text-xs">₦{parseFloat(item.unit_price).toLocaleString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${item.quantity <= (item.min_stock_level || 10) ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                            {item.quantity} {item.unit}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                                        <div className="flex justify-end gap-2">
                                                            <input
                                                                type="number"
                                                                defaultValue={item.quantity}
                                                                onBlur={e => handleUpdateStock(item.id, parseInt(e.target.value))}
                                                                className="w-16 bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-center text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-500"
                                                            />
                                                            {isAdmin && (
                                                                <button
                                                                    onClick={() => handleDeleteInventory(item.id)}
                                                                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                                    title="Delete drug"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="overflow-x-auto scrollbar-slim">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                <th className="text-left px-6 py-4">Patient</th>
                                                <th className="text-left px-6 py-4">Medication</th>
                                                <th className="text-left px-6 py-4">Dosage</th>
                                                <th className="text-left px-6 py-4">Dispensed At</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {loadingHistory ? (
                                                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" /></td></tr>
                                            ) : historyPrescriptions.length === 0 ? (
                                                <tr><td colSpan={4} className="py-20 text-center text-slate-500 font-bold uppercase text-[10px]">No dispensing history found</td></tr>
                                            ) : (
                                                historyPrescriptions.filter(p => 
                                                    p.patient_first.toLowerCase().includes(search.toLowerCase()) || 
                                                    p.patient_last.toLowerCase().includes(search.toLowerCase()) ||
                                                    p.medication_name.toLowerCase().includes(search.toLowerCase())
                                                ).map(med => (
                                                    <tr key={med.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <p className="font-bold text-slate-900 dark:text-white uppercase text-[12px]">{med.patient_first} {med.patient_last}</p>
                                                            <p className="text-[9px] text-slate-400 font-mono italic">{med.mrn}</p>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-brand-600 dark:text-brand-400 uppercase">{med.medication_name}</td>
                                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-xs">{med.dosage}</td>
                                                        <td className="px-6 py-4 text-slate-400 whitespace-nowrap text-[10px] font-mono">{new Date(med.created_at).toLocaleString()}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Dispense Medication</h2>
                    {selectedBatch ? (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm sticky top-8">
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase">{selectedBatch.patient_first} {selectedBatch.patient_last}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${selectedBatch.billing_status === 'paid' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                        {selectedBatch.billing_status === 'paid' ? 'Paid' : selectedBatch.billing_status.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono tracking-tight">{selectedBatch.mrn}</span>
                                    <span className="text-[10px] text-slate-400">{selectedBatch.items.length} medication{selectedBatch.items.length > 1 ? 's' : ''}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-8">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medications in Batch</span>
                                {selectedBatch.items.map(med => (
                                    <div key={med.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white uppercase">{med.medication_name}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                            <span>{med.dosage}</span>
                                            <span>•</span>
                                            <span>{med.frequency}</span>
                                            <span>•</span>
                                            <span>{med.route}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {canDispense && (
                                <button
                                    onClick={() => handleDispense(selectedBatch)}
                                    disabled={!selectedBatch.items.every(i => i.billing_status === 'paid')}
                                    className={`w-full py-4 rounded-3xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg group ${selectedBatch.items.every(i => i.billing_status === 'paid')
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                                        }`}
                                >
                                    <CheckCircle2 className={`w-6 h-6 ${selectedBatch.items.every(i => i.billing_status === 'paid') ? 'group-hover:scale-110' : ''} transition-transform`} />
                                    {selectedBatch.items.every(i => i.billing_status === 'paid') ? `DISPENSE ALL (${selectedBatch.items.length})` : 'AWAITING PAYMENT'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 border-dashed rounded-3xl">
                            <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-sm text-slate-400 mt-2 text-center px-6">Select a prescription batch to proceed with dispensing</p>
                        </div>
                    )}

                </div>
            </div>

            {/* Stock Control Notification removed since it is now a tab */}
            <InvoiceModal 
                isOpen={showInvoiceModal}
                onClose={() => setShowInvoiceModal(false)}
                bill={generatedBill}
            />

            <WalkInModal 
                isOpen={isWalkInModalOpen}
                onClose={() => setIsWalkInModalOpen(false)}
                onSuccess={handleWalkInSuccess}
                title="Walk-in Pharmacy Order"
                mode="pharmacy_only"
            />
        </div>
    );
}
