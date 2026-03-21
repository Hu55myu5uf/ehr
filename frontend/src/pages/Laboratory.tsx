import React, { useEffect, useState } from 'react';
import { Beaker, FlaskConical, Search, Clock, FileText, CheckCircle2, AlertCircle, Loader2, Plus, ArrowRight, XCircle, Printer, UserPlus } from 'lucide-react';
import api from '../api/client';
import InvoiceModal from '../components/InvoiceModal';
import WalkInModal from '../components/WalkInModal';

interface LabOrder {
    id: string;
    patient_id: string;
    patient_first: string;
    patient_last: string;
    mrn: string;
    test_name: string;
    test_category: string;
    batch_id: string | null;
    priority: 'routine' | 'urgent' | 'stat';
    status: 'ordered' | 'collected' | 'in_progress' | 'completed' | 'cancelled';
    billing_status: 'pending_invoice' | 'invoiced' | 'approved' | 'paid' | 'rejected';
    ordered_at: string;
    [key: string]: any;
}

interface LabBatchGroup {
    key: string;
    patient_first: string;
    patient_last: string;
    mrn: string;
    patient_id: string;
    billing_status: string;
    items: LabOrder[];
}

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

export default function Laboratory() {
    const [pendingOrders, setPendingOrders] = useState<LabOrder[]>([]);
    const [completedOrders, setCompletedOrders] = useState<LabOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
    const [showResultForm, setShowResultForm] = useState(false);
    const [resultData, setResultData] = useState({
        result_name: '',
        result_value: '',
        result_unit: '',
        reference_range: '',
        abnormal_flag: 'normal',
        notes: '',
        complete: false
    });

    // New Lab Order States
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [patients, setPatients] = useState<any[]>([]);
    const [patientSearch, setPatientSearch] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const [isOrdering, setIsOrdering] = useState(false);
    const [newOrderForm, setNewOrderForm] = useState({
        test_name: '',
        test_category: 'other',
        priority: 'routine',
        notes: ''
    });

    const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);

    const [activeTab, setActiveTab] = useState<'pending' | 'invoicing' | 'completed'>('invoicing');

    // Track selected batch key for the detail panel
    const [selectedBatchKey, setSelectedBatchKey] = useState<string | null>(null);

    // Invoicing states
    const [patientQuery, setPatientQuery] = useState('');
    const [patientOrders, setPatientOrders] = useState<any[]>([]);
    const [loadingPatientOrders, setLoadingPatientOrders] = useState(false);
    const [selectedPatientOrders, setSelectedPatientOrders] = useState<string[]>([]);
    
    // Invoice Print Modal State
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [generatedBill, setGeneratedBill] = useState<any>(null);

    const userStr = localStorage.getItem('user');
    const user = userStr && userStr !== 'undefined' ? JSON.parse(userStr) : {};
    const canManage = ['super_admin', 'lab_attendant', 'doctor', 'nurse'].includes(user.role);

    useEffect(() => {
        fetchOrders();
        if (activeTab === 'invoicing') {
            fetchAllPendingInvoices();
        }
    }, [activeTab]);

    const fetchAllPendingInvoices = async () => {
        try {
            setLoadingPatientOrders(true);
            const res = await api.get('/labs/invoicing/pending');
            setPatientOrders(res.data.orders || []);
            setSelectedPatientOrders([]);
            setPatientQuery(''); // Clear search when auto-loading
        } catch (err) {
            console.error('Failed to fetch all pending invoices', err);
        } finally {
            setLoadingPatientOrders(false);
        }
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const [pendingRes, completedRes] = await Promise.all([
                api.get('/labs/orders/pending'),
                api.get('/labs/orders/completed')
            ]);
            setPendingOrders(pendingRes.data.orders || []);
            setCompletedOrders(completedRes.data.orders || []);
        } catch (err: any) {
            console.error('Failed to fetch orders', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPatients = async () => {
        try {
            const res = await api.get('/patients');
            setPatients(res.data.patients || []);
        } catch (err) {
            console.error('Failed to fetch patients', err);
        }
    };

    useEffect(() => {
        if (isOrderModalOpen) {
            fetchPatients();
        }
    }, [isOrderModalOpen]);

    const handleNewOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) {
            alert('Please select a patient first');
            return;
        }

        try {
            setIsOrdering(true);

            let categoryId = 'other';
            for (const cat of LAB_TESTS) {
                if (cat.tests.includes(newOrderForm.test_name)) {
                    categoryId = cat.id;
                    break;
                }
            }

            await api.post('/labs/orders', {
                ...newOrderForm,
                test_category: categoryId,
                patient_id: selectedPatient.id,
                test_code: newOrderForm.test_name.toUpperCase().replace(/\s+/g, '_')
            });

            alert('Lab order created successfully');
            setIsOrderModalOpen(false);
            setNewOrderForm({ test_name: '', test_category: 'other', priority: 'routine', notes: '' });
            setSelectedPatient(null);
            fetchOrders();
        } catch (err: any) {
            console.error('Failed to create lab order', err);
            alert(err.response?.data?.error || 'Failed to create lab order');
        } finally {
            setIsOrdering(false);
        }
    };

    const handleWalkInSuccess = async (patientData: any) => {
        try {
            setIsOrdering(true);
            const res = await api.post('/api/patients/walk-in', patientData);
            setSelectedPatient(res.data);
            setIsWalkInModalOpen(false);
            setIsOrderModalOpen(true);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to register walk-in patient');
        } finally {
            setIsOrdering(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await api.patch(`/labs/orders/${id}/status`, { status });
            fetchOrders();
            // Don't clear selection, it will auto-update through derived state
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleSearchPatient = async () => {
        if (!patientQuery.trim()) return;
        try {
            setLoadingPatientOrders(true);
            const res = await api.get(`/labs/patient/${patientQuery}/invoicing`);
            setPatientOrders(res.data.orders || []);
            setSelectedPatientOrders([]);
        } catch (err) {
            console.error('Failed to fetch patient orders', err);
            alert('Patient not found or no pending test orders');
        } finally {
            setLoadingPatientOrders(false);
        }
    };

    const handleGenerateInvoice = async () => {
        if (selectedPatientOrders.length === 0) return;
        try {
            const firstSelected = patientOrders.find(o => o.id === selectedPatientOrders[0]);
            if (!firstSelected) return;

            const res = await api.post('/labs/invoice', {
                patient_id: firstSelected.patient_id,
                order_ids: selectedPatientOrders
            });

            if (res.data.bill) {
                setGeneratedBill(res.data.bill);
                setShowInvoiceModal(true);
                setSelectedPatientOrders([]);
                handleSearchPatient();
            } else {
                alert('Invoice generated and sent to billing!');
                handleSearchPatient();
            }
        } catch (err) {
            alert('Failed to generate invoice');
        }
    };

    const submitResult = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;
        try {
            await api.post('/labs/results', {
                ...resultData,
                lab_order_id: selectedOrder.id
            });
            alert('Result added successfully');
            setShowResultForm(false);
            // Don't clear selection, it will auto-update
            fetchOrders();
        } catch (err) {
            alert('Failed to add result');
        }
    };

    const filterOrders = (list: LabOrder[]) => list.filter(o =>
        (o.patient_first?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (o.patient_last?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (o.test_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (o.mrn?.toLowerCase() || '').includes(search.toLowerCase())
    );

    // Group orders by batch_id
    const groupOrders = (orders: LabOrder[]): LabBatchGroup[] => {
        const groups: Record<string, LabBatchGroup> = {};
        orders.forEach(o => {
            const key = o.batch_id || o.id;
            if (!groups[key]) {
                groups[key] = {
                    key,
                    patient_first: o.patient_first,
                    patient_last: o.patient_last,
                    mrn: o.mrn,
                    patient_id: o.patient_id,
                    billing_status: o.billing_status,
                    items: [],
                };
            }
            groups[key].items.push(o);
        });
        return Object.values(groups);
    };

    const groupedPending = groupOrders(filterOrders(pendingOrders));
    const groupedCompleted = groupOrders(filterOrders(completedOrders));

    // Derive selected batch from current state
    const selectedBatch = [...groupedPending, ...groupedCompleted].find(b => b.key === selectedBatchKey) || null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Laboratory Services</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage specimens, tests, and clinical results</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchOrders}
                        className="p-2.5 text-slate-500 hover:text-brand-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                        <Clock className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsOrderModalOpen(true)}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 px-4 py-2.5 rounded-xl font-semibold text-white transition-all shadow-lg shadow-brand-600/20"
                    >
                        <Plus className="w-5 h-5" />
                        New Test Order
                    </button>
                    <button
                        onClick={() => setIsWalkInModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl font-semibold text-white transition-all shadow-lg"
                    >
                        <UserPlus className="w-4 h-4 text-brand-500" />
                        Walk-in
                    </button>
                </div>
            </div>


            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit overflow-x-auto scrollbar-hidden">
                <button
                    onClick={() => setActiveTab('invoicing')}
                    className={`px-6 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === 'invoicing'
                        ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Invoicing
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-6 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === 'pending'
                        ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Laboratory Queue
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`px-6 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === 'completed'
                        ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'}`}
                >
                    History
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {activeTab === 'invoicing' && (
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Patient Lookup (ID/MRN)</label>
                        <form onSubmit={(e) => { e.preventDefault(); handleSearchPatient(); }} className="flex gap-3">
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

                        {loadingPatientOrders ? (
                            <div className="py-20 flex flex-col items-center justify-center">
                                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                            </div>
                        ) : patientOrders.length > 0 ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="font-bold text-slate-900 dark:text-white">
                                        {patientQuery ? `Ordered Tests for ${patientOrders[0].patient_first} ${patientOrders[0].patient_last}` : 'All Pending Invoices'}
                                    </h3>
                                    <button
                                        onClick={handleGenerateInvoice}
                                        disabled={selectedPatientOrders.length === 0}
                                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                        Generate Invoice ({selectedPatientOrders.length})
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {(() => {
                                        const patBatches: Record<string, any[]> = {};
                                        patientOrders.forEach((o: any) => {
                                            const k = o.batch_id || o.id;
                                            if (!patBatches[k]) patBatches[k] = [];
                                            patBatches[k].push(o);
                                        });
                                        return Object.entries(patBatches).map(([batchKey, batchItems]) => {
                                            const allIds = batchItems.map((r: any) => r.id);
                                            const allSelected = allIds.every((id: string) => selectedPatientOrders.includes(id));
                                            return (
                                                <div
                                                    key={batchKey}
                                                    onClick={() => {
                                                        const patientId = batchItems[0].patient_id;
                                                        const alreadySelectedPatientId = selectedPatientOrders.length > 0 
                                                            ? patientOrders.find(o => o.id === selectedPatientOrders[0])?.patient_id 
                                                            : null;

                                                        if (alreadySelectedPatientId && alreadySelectedPatientId !== patientId) {
                                                            if (window.confirm('Selection changed to a different patient. Clear previous selection?')) {
                                                                setSelectedPatientOrders(allIds);
                                                            }
                                                            return;
                                                        }

                                                        if (allSelected) {
                                                            setSelectedPatientOrders(selectedPatientOrders.filter(id => !allIds.includes(id)));
                                                        } else {
                                                            setSelectedPatientOrders([...new Set([...selectedPatientOrders, ...allIds])]);
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
                                                                    {batchItems.length > 1 ? `Batch (${batchItems.length} tests)` : batchItems[0].test_name}
                                                                </p>
                                                                <p className="text-xs text-slate-500">{batchItems[0].priority} priority</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {batchItems.map((t: any) => (
                                                            <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">{t.test_name}</span>
                                                                <span className="text-[10px] text-slate-400">{t.test_category}</span>
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
                                <p className="text-slate-500">No pending test orders found.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'pending' && (
                    <>
                        <div className="lg:col-span-2 space-y-4">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <FlaskConical className="w-5 h-5 text-brand-500" />
                                Laboratory Queue
                            </h2>
                            {loading ? (
                                <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                                </div>
                            ) : filterOrders(pendingOrders).length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500 opacity-20" />
                                    <p className="mt-4 text-slate-500">Queue is clear.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {groupedPending.map(batch => (
                                        <div
                                            key={batch.key}
                                            onClick={() => {
                                                setSelectedBatchKey(batch.key);
                                                setSelectedOrder(batch.items[0]);
                                            }}
                                            className={`p-5 rounded-3xl border transition-all cursor-pointer group ${selectedBatch?.key === batch.key
                                                ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500/50 shadow-md'
                                                : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-brand-500/30'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${batch.items.some(i => i.priority === 'stat') ? 'bg-red-100 dark:bg-red-500/10 text-red-500' :
                                                        batch.items.some(i => i.priority === 'urgent') ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-500' :
                                                            'bg-brand-100 dark:bg-brand-500/10 text-brand-500'
                                                        }`}>
                                                        <Beaker className="w-6 h-6" />
                                                    </div>
                                                    <div>
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
                                                                'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {batch.billing_status === 'paid' ? 'Paid' :
                                                            batch.billing_status === 'approved' ? 'Approved' :
                                                                batch.billing_status === 'invoiced' ? 'Invoiced' : 'Pending'}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-400">{batch.items.length} test{batch.items.length > 1 ? 's' : ''}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                {batch.items.map(t => (
                                                    <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">{t.test_name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${t.status === 'ordered' ? 'bg-blue-100 text-blue-500' :
                                                                t.status === 'collected' ? 'bg-amber-100 text-amber-500' : 'bg-emerald-100 text-emerald-500'
                                                                }`}>{t.status}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Order Details</h2>
                            {selectedBatch ? (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm sticky top-8 animate-in slide-in-from-right-4 duration-300">
                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase">{selectedBatch.patient_first} {selectedBatch.patient_last}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${selectedBatch.billing_status === 'paid' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-indigo-500/10 text-indigo-500'
                                                }`}>
                                                {selectedBatch.billing_status === 'paid' ? 'Paid' : selectedBatch.billing_status.replace('_', ' ')}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-mono tracking-tight">{selectedBatch.mrn}</span>
                                            <span className="text-[10px] text-slate-400">{selectedBatch.items.length} test{selectedBatch.items.length > 1 ? 's' : ''}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-4">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tests in Batch</span>
                                        {selectedBatch.items.map(test => (
                                            <div key={test.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white uppercase">{test.test_name}</span>
                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${test.status === 'ordered' ? 'bg-blue-100 text-blue-500' :
                                                            test.status === 'collected' ? 'bg-amber-100 text-amber-500' :
                                                                test.status === 'in_progress' ? 'bg-indigo-100 text-indigo-500' : 'bg-emerald-100 text-emerald-500'
                                                        }`}>{test.status}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 mb-2">{test.test_category || 'General'} • {test.priority} priority</p>

                                                {canManage && (
                                                    <div className="flex gap-2 mt-2">
                                                        {test.status === 'ordered' && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleStatusUpdate(test.id, 'collected'); }}
                                                                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl text-xs font-bold transition-all"
                                                                >
                                                                    Collect Specimen
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleStatusUpdate(test.id, 'cancelled'); }}
                                                                    className="border border-red-500/30 text-red-500 hover:bg-red-500/10 py-2 px-3 rounded-xl text-xs font-bold transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        )}
                                                        {(test.status === 'collected' || test.status === 'in_progress') && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedOrder(test);
                                                                    setShowResultForm(true);
                                                                    setResultData({ ...resultData, result_name: test.test_name });
                                                                }}
                                                                disabled={test.billing_status === 'pending_invoice' || test.billing_status === 'invoiced'}
                                                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${test.billing_status === 'pending_invoice' || test.billing_status === 'invoiced'
                                                                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                                                        : 'bg-brand-600 hover:bg-brand-500 text-white shadow-sm'
                                                                    }`}
                                                            >
                                                                <FileText className="w-3.5 h-3.5" />
                                                                {test.billing_status === 'pending_invoice' || test.billing_status === 'invoiced'
                                                                    ? 'Awaiting Payment'
                                                                    : 'Enter Results'
                                                                }
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 border-dashed rounded-3xl">
                                    <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                                    <p className="text-sm text-slate-400 mt-2">Select a batch to view details</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'completed' && (
                    <>
                        <div className="lg:col-span-2 space-y-4">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                Order History
                            </h2>
                            {loading ? (
                                <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                                </div>
                            ) : filterOrders(completedOrders).length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500">No completed tests.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {filterOrders(completedOrders).map(order => (
                                        <div
                                            key={order.id}
                                            onClick={() => setSelectedOrder(order)}
                                            className={`p-5 rounded-3xl border transition-all cursor-pointer group ${selectedOrder?.id === order.id
                                                ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500/50 shadow-md'
                                                : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-brand-500/30'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white uppercase line-clamp-1">
                                                            {order.test_name}
                                                        </h3>
                                                        <p className="text-sm text-slate-500">
                                                            {order.patient_first} {order.patient_last}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Test Results</h2>
                            {selectedOrder ? (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm sticky top-8 animate-in slide-in-from-right-4 duration-300">
                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase">{selectedOrder.test_name}</h3>
                                        <p className="text-slate-500 text-sm mt-1">Completed on {new Date(selectedOrder.completed_at || '').toLocaleDateString()}</p>
                                    </div>

                                    {selectedOrder.results && selectedOrder.results.length > 0 ? (
                                        <div className="space-y-4">
                                            {selectedOrder.results.map((r: any, idx: number) => (
                                                <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{r.result_name}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.abnormal_flag === 'normal' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                            {r.abnormal_flag}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2 items-baseline">
                                                        <span className="text-2xl font-black text-slate-900 dark:text-white">{r.result_value}</span>
                                                        <span className="text-slate-500 text-sm">{r.result_unit}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-10 text-center text-slate-400 italic">No detailed results found.</div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 border-dashed rounded-3xl">
                                    <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                                    <p className="text-sm text-slate-400 mt-2">Select a completed order to view results</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>


            {showResultForm && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white line-clamp-1">Enter Lab Results</h2>
                                <p className="text-slate-500 mt-1">Order Ref: <span className="font-mono text-brand-600 dark:text-brand-400 font-bold uppercase">{selectedOrder.id.split('-')[0]}</span></p>
                            </div>
                            <button onClick={() => setShowResultForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={submitResult} className="flex flex-col overflow-hidden">
                            <div className="p-8 space-y-6 overflow-y-auto scrollbar-slim modal-content-scroll">
                                <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metric Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={resultData.result_name}
                                        onChange={e => setResultData({ ...resultData, result_name: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Value</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 14.5"
                                        value={resultData.result_value}
                                        onChange={e => setResultData({ ...resultData, result_value: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. g/dL"
                                        value={resultData.result_unit}
                                        onChange={e => setResultData({ ...resultData, result_unit: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Abnormal Flag</label>
                                    <select
                                        value={resultData.abnormal_flag}
                                        onChange={e => setResultData({ ...resultData, abnormal_flag: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all font-medium"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="low">Low (L)</option>
                                        <option value="high">High (H)</option>
                                        <option value="critical">Critical (!!)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reference Range</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 13.5 - 17.5"
                                    value={resultData.reference_range}
                                    onChange={e => setResultData({ ...resultData, reference_range: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all font-medium"
                                />
                            </div>

                            <div className="flex items-center gap-2 px-1 py-2">
                                <input
                                    type="checkbox"
                                    id="finalize_results"
                                    checked={resultData.complete}
                                    onChange={e => setResultData({ ...resultData, complete: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                />
                                <label htmlFor="finalize_results" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                    Finalize Results (Mark as Completed)
                                </label>
                            </div>
                            </div>
                            <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-900 sticky bottom-0">
                                <button
                                    type="button"
                                    onClick={() => setShowResultForm(false)}
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold py-3 rounded-2xl transition-all dark:text-white border border-slate-200 dark:border-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-brand-600/20"
                                >
                                    Save Results
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* New Test Order Modal */}
            {isOrderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">New Lab Order</h3>
                                <p className="text-sm text-slate-500 mt-0.5">Create a direct test order for a patient</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsOrderModalOpen(false);
                                    setSelectedPatient(null);
                                }}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                <XCircle className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto scrollbar-slim modal-content-scroll">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-full">
                                {/* Patient Selection Column */}
                                <div className="p-8 border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 block">1. Select Patient</label>
                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or ID..."
                                            value={patientSearch}
                                            onChange={e => setPatientSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const filtered = patients.filter(p => 
                                                        `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearch.toLowerCase()) || 
                                                        p.patient_number?.toLowerCase().includes(patientSearch.toLowerCase())
                                                    );
                                                    if (filtered.length > 0) setSelectedPatient(filtered[0]);
                                                }
                                            }}
                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-2 max-h-[300px] md:max-h-none overflow-y-auto pr-2 custom-scrollbar">
                                        {patients
                                            .filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearch.toLowerCase()) || p.patient_number?.toLowerCase().includes(patientSearch.toLowerCase()))
                                            .slice(0, 10)
                                            .map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => setSelectedPatient(p)}
                                                    className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedPatient?.id === p.id
                                                        ? 'bg-brand-600 border-brand-600 text-white shadow-lg'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-500'}`}
                                                >
                                                    <div className="font-bold text-sm truncate">{p.first_name} {p.last_name}</div>
                                                    <div className={`text-[10px] uppercase font-mono mt-0.5 opacity-80 ${selectedPatient?.id === p.id ? 'text-brand-100' : 'text-slate-400'}`}>{p.patient_number}</div>
                                                </button>
                                            ))}
                                    </div>
                                    {selectedPatient && (
                                        <div className="mt-6 p-5 rounded-2xl bg-brand-600/10 border border-brand-500/20 animate-in fade-in zoom-in-95">
                                            <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase mb-1">Target Patient</p>
                                            <p className="font-bold text-slate-900 dark:text-white uppercase">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Order Details Column */}
                                <div className="p-8">
                                    <form id="lab-order-form" onSubmit={handleNewOrder} className="space-y-5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0 block">2. Order Details</label>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Test Name *</label>
                                                <select
                                                    required
                                                    value={newOrderForm.test_name}
                                                    onChange={e => setNewOrderForm({ ...newOrderForm, test_name: e.target.value })}
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white"
                                                >
                                                    <option value="" disabled>Select Test...</option>
                                                    {LAB_TESTS.map(group => (
                                                        <optgroup key={group.category} label={group.category}>
                                                            {group.tests.map(test => (
                                                                <option key={test} value={test}>{test}</option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Priority</label>
                                                <select
                                                    value={newOrderForm.priority}
                                                    onChange={e => setNewOrderForm({ ...newOrderForm, priority: e.target.value as any })}
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white"
                                                >
                                                    <option value="routine">Routine</option>
                                                    <option value="urgent">Urgent</option>
                                                    <option value="stat">STAT</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Notes</label>
                                                <textarea
                                                    value={newOrderForm.notes}
                                                    onChange={e => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
                                                    placeholder="Clinical indications, special instructions..."
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white h-32 resize-none"
                                                />
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 sticky bottom-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOrderModalOpen(false);
                                    setSelectedPatient(null);
                                }}
                                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors border border-slate-200 dark:border-slate-700 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="lab-order-form"
                                disabled={isOrdering || !selectedPatient}
                                className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-400 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-brand-600/20"
                            >
                                {isOrdering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                Create Lab Order
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showInvoiceModal && generatedBill && (
                <InvoiceModal
                    isOpen={showInvoiceModal}
                    bill={generatedBill}
                    onClose={() => setShowInvoiceModal(false)}
                />
            )}

            <WalkInModal 
                isOpen={isWalkInModalOpen}
                onClose={() => setIsWalkInModalOpen(false)}
                onSuccess={handleWalkInSuccess}
                title="Walk-in Lab Order"
            />
        </div>
    );
}

// Add X icon for the modal
const X = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);
