import React, { useEffect, useState } from 'react';
import {
    Search, Loader2, CheckCircle2, AlertCircle,
    User, Clock, Banknote, FileText, Printer, CreditCard,
    ShieldCheck, XCircle, X, Beaker, Pill, ChevronRight, Wallet
} from 'lucide-react';
import api from '../api/client';
import InvoiceModal from '../components/InvoiceModal';

interface Bill {
    id: string;
    patient_id: string;
    patient_first: string;
    patient_last: string;
    mrn: string;
    bill_number: string;
    total_amount: string;
    paid_amount: string;
    status: string;
    payment_method: string;
    generated_at: string;
    paid_at: string;
    is_walk_in?: boolean | number;
    items?: BillItem[];
}

interface BillItem {
    id: string;
    item_type: string;
    description: string;
    quantity: number;
    unit_price: string;
    total_price: string;
}

interface PendingItem {
    id: string;
    patient_first: string;
    patient_last: string;
    mrn: string;
    test_name?: string;
    test_category?: string;
    medication_name?: string;
    dosage?: string;
    priority?: string;
    ordered_at?: string;
    created_at?: string;
    provider_first?: string;
    provider_last?: string;
    billing_status: string;
    notes?: string;
}

type ActiveTab = 'orders' | 'bills';

export default function Billing() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('bills');
    // Bills state
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [isReceiptMode, setIsReceiptMode] = useState(false);
    const [loadingBill, setLoadingBill] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', payment_reference: '' });
    const [paying, setPaying] = useState(false);
    // Verification state
    const [pendingLabs, setPendingLabs] = useState<PendingItem[]>([]);
    const [pendingMeds, setPendingMeds] = useState<PendingItem[]>([]);
    const [loadingVerification, setLoadingVerification] = useState(false);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [rejectNotes, setRejectNotes] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<{ id: string; type: 'lab' | 'med' } | null>(null);

    useEffect(() => {
        if (activeTab === 'bills') fetchBills();
    }, [activeTab, filter]);

    useEffect(() => {
        if (activeTab === 'orders') fetchPendingVerification();
    }, [activeTab]);

    const fetchBills = async () => {
        try {
            setLoading(true);
            const params = filter ? `?status=${filter}` : '';
            const res = await api.get(`/billing${params}`);
            setBills(res.data.bills || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingVerification = async () => {
        try {
            setLoadingVerification(true);
            const res = await api.get('/billing/pending-verification');
            setPendingLabs(res.data.lab_orders || []);
            setPendingMeds(res.data.medications || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingVerification(false);
        }
    };

    const handleVerify = async (id: string, type: 'lab' | 'med', status: 'approved' | 'rejected', notes?: string) => {
        try {
            setVerifyingId(id);
            const url = type === 'lab' ? `/billing/verify-lab/${id}` : `/billing/verify-medication/${id}`;
            await api.post(url, { billing_status: status, notes: notes || null });
            fetchPendingVerification();
            setShowRejectModal(null);
            setRejectNotes('');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Verification failed');
        } finally {
            setVerifyingId(null);
        }
    };

    const viewBill = async (id: string) => {
        try {
            setLoadingBill(true);
            const res = await api.get(`/billing/${id}`);
            setSelectedBill(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingBill(false);
        }
    };

    const processPayment = async () => {
        if (!selectedBill) return;
        try {
            setPaying(true);
            const amount = payForm.amount || selectedBill.total_amount;
            await api.post(`/billing/${selectedBill.id}/pay`, {
                amount: parseFloat(amount),
                payment_method: payForm.payment_method,
                payment_reference: payForm.payment_reference,
            });
            setShowPayModal(false);
            setPayForm({ amount: '', payment_method: 'cash', payment_reference: '' });
            viewBill(selectedBill.id);
            fetchBills();
            // Automatically show receipt for printing
            setIsReceiptMode(true);
            setShowPrintModal(true);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Payment failed');
        } finally {
            setPaying(false);
        }
    };

    const statusColors: Record<string, string> = {
        draft: 'bg-slate-500/10 text-slate-500',
        pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        partial: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        cancelled: 'bg-rose-500/10 text-rose-500',
    };

    const formatCurrency = (amount: string | number) => {
        return '₦' + parseFloat(String(amount)).toLocaleString('en-NG', { minimumFractionDigits: 2 });
    };

    const totalPending = pendingLabs.length + pendingMeds.length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Billing & Finance</h1>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Manage invoices, payments, and service verifications</p>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex overflow-x-auto scrollbar-hidden border-b border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab('bills')}
                    className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${activeTab === 'bills'
                        ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-500/5'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <Banknote className="w-4 h-4" />
                    Archive & Invoices
                </button>
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${activeTab === 'orders'
                        ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-500/5'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <Clock className="w-4 h-4" />
                    Pending Invoicing
                    {totalPending > 0 && (
                        <span className="bg-brand-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-1 animate-pulse">
                            {totalPending}
                        </span>
                    )}
                </button>
            </div>

            {/* ════════════ UNBILLED ORDERS TAB ════════════ */}
            {activeTab === 'orders' && (
                <div className="space-y-6">
                    {loadingVerification ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
                    ) : totalPending === 0 ? (
                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                            <h3 className="font-semibold text-slate-900 dark:text-white">All Billed!</h3>
                            <p className="text-sm text-slate-500 mt-1">No orders currently awaiting invoicing.</p>
                        </div>
                    ) : (
                        <>
                            {/* Pending Lab Orders */}
                            {pendingLabs.length > 0 && (
                                <div>
                                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Beaker className="w-4 h-4" /> Lab Orders ({pendingLabs.length})
                                    </h2>
                                    <div className="space-y-2">
                                        {pendingLabs.map(order => (
                                            <div key={order.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="font-bold text-sm text-slate-900 dark:text-white uppercase truncate">{order.patient_first} {order.patient_last}</span>
                                                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{order.mrn}</span>
                                                        {order.priority === 'stat' && <span className="text-[9px] font-black px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-full uppercase tracking-tighter">STAT</span>}
                                                        {order.priority === 'urgent' && <span className="text-[9px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full uppercase tracking-tighter">URGENT</span>}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                                        <span className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-tight text-slate-500">
                                                            <Beaker className="w-3.5 h-3.5" />
                                                            {order.test_name}
                                                        </span>
                                                        {order.test_category && <span className="text-slate-400 text-[10px] bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded uppercase font-bold">{order.test_category}</span>}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                                                        By Dr. {order.provider_first || 'N/A'} {order.provider_last || ''} • {order.ordered_at ? new Date(order.ordered_at).toLocaleString() : ''}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleVerify(order.id, 'lab', 'approved')}
                                                        disabled={verifyingId === order.id}
                                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10 active:scale-95"
                                                    >
                                                        {verifyingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => setShowRejectModal({ id: order.id, type: 'lab' })}
                                                        disabled={verifyingId === order.id}
                                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 border border-rose-500/20"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pending Medications */}
                            {pendingMeds.length > 0 && (
                                <div>
                                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Pill className="w-4 h-4" /> Medications ({pendingMeds.length})
                                    </h2>
                                    <div className="space-y-2">
                                        {pendingMeds.map(med => (
                                            <div key={med.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="font-bold text-sm text-slate-900 dark:text-white uppercase truncate">{med.patient_first} {med.patient_last}</span>
                                                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{med.mrn}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                                        <span className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-tight text-slate-500">
                                                            <Pill className="w-3.5 h-3.5" />
                                                            {med.medication_name}
                                                        </span>
                                                        {med.dosage && <span className="text-slate-400 text-[10px] bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded uppercase font-bold">{med.dosage}</span>}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                                                        By Dr. {med.provider_first || 'N/A'} {med.provider_last || ''} • {med.created_at ? new Date(med.created_at).toLocaleString() : ''}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleVerify(med.id, 'med', 'approved')}
                                                        disabled={verifyingId === med.id}
                                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10 active:scale-95"
                                                    >
                                                        {verifyingId === med.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => setShowRejectModal({ id: med.id, type: 'med' })}
                                                        disabled={verifyingId === med.id}
                                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 border border-rose-500/20"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ════════════ BILLS TAB ════════════ */}
            {activeTab === 'bills' && (
                <>
                    {/* Filters */}
                    <div className="flex gap-2">
                        {[
                            { label: 'Pending', value: 'pending' },
                            { label: 'Partial', value: 'partial' },
                            { label: 'All', value: '' },
                            { label: 'Paid', value: 'paid' }
                        ].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilter(f.value)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === f.value
                                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-500/50'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Bills List */}
                        <div className="lg:col-span-1 space-y-3">
                            {loading ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
                            ) : bills.length === 0 ? (
                                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
                                    <Banknote className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">No bills found</p>
                                </div>
                            ) : (
                                bills.map(bill => (
                                    <button
                                        key={bill.id}
                                        onClick={() => viewBill(bill.id)}
                                        className={`w-full text-left bg-white dark:bg-slate-900/40 border rounded-2xl p-3.5 transition-all group active:scale-[0.98] ${selectedBill?.id === bill.id
                                            ? 'border-brand-500 shadow-lg shadow-brand-500/10'
                                            : 'border-slate-100 dark:border-slate-800 hover:border-brand-500/30'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">{bill.bill_number}</span>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${statusColors[bill.status] || ''}`}>
                                                {bill.status}
                                            </span>
                                        </div>
                                        <p className="font-bold text-xs text-slate-900 dark:text-white uppercase truncate group-hover:text-brand-600 transition-colors">{bill.patient_first} {bill.patient_last}</p>
                                        <div className="flex items-baseline justify-between mt-1">
                                            <span className="text-[10px] text-slate-400 font-medium">{new Date(bill.generated_at).toLocaleDateString()}</span>
                                            <span className="font-black text-xs text-brand-600 dark:text-brand-400">{formatCurrency(bill.total_amount)}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Bill Detail */}
                        <div className="lg:col-span-2">
                            {loadingBill ? (
                                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
                            ) : selectedBill ? (
                                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                                    {/* Bill Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-500/10 px-2 py-0.5 rounded-lg">{selectedBill.bill_number}</p>
                                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.2em] ${statusColors[selectedBill.status] || ''}`}>
                                                    {selectedBill.status}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedBill.patient_first} {selectedBill.patient_last}</h3>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: {selectedBill.mrn} • ISSUED {new Date(selectedBill.generated_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    setIsReceiptMode(selectedBill.status === 'paid');
                                                    setShowPrintModal(true);
                                                }}
                                                className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-brand-500/50 transition-all"
                                                title="Print Invoice"
                                            >
                                                <Printer className="w-4 h-4 text-slate-400" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Itemized Table */}
                                    {selectedBill.items && selectedBill.items.length > 0 && (
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                            <div className="overflow-x-auto scrollbar-slim">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 dark:bg-slate-800/50 whitespace-nowrap">
                                                        <tr>
                                                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Item</th>
                                                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                                            <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                                                            <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                                                            <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {selectedBill.items.map(item => (
                                                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                <td className="px-4 py-3 text-slate-900 dark:text-white font-medium min-w-[200px]">{item.description}</td>
                                                                <td className="px-4 py-3 text-slate-400 capitalize whitespace-nowrap">{item.item_type.replace('_', ' ')}</td>
                                                                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{item.quantity}</td>
                                                                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatCurrency(item.unit_price)}</td>
                                                                <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">{formatCurrency(item.total_price)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Totals */}
                                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Total Amount</span>
                                            <span className="font-bold text-slate-900 dark:text-white text-lg">{formatCurrency(selectedBill.total_amount)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Paid Amount</span>
                                            <span className="font-semibold text-emerald-600">{formatCurrency(selectedBill.paid_amount)}</span>
                                        </div>
                                        {parseFloat(selectedBill.total_amount) - parseFloat(selectedBill.paid_amount) > 0 && (
                                            <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-700 pt-2">
                                                <span className="text-slate-500 font-semibold">Balance Due</span>
                                                <span className="font-bold text-rose-600 text-lg">
                                                    {formatCurrency(parseFloat(selectedBill.total_amount) - parseFloat(selectedBill.paid_amount))}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {selectedBill.status !== 'paid' && selectedBill.status !== 'cancelled' && (
                                        <button
                                            onClick={() => {
                                                setPayForm({
                                                    amount: String(parseFloat(selectedBill.total_amount) - parseFloat(selectedBill.paid_amount)),
                                                    payment_method: 'cash',
                                                    payment_reference: ''
                                                });
                                                setShowPayModal(true);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            <CreditCard className="w-4 h-4" /> Process Payment
                                        </button>
                                    )}

                                    {selectedBill.status === 'paid' && selectedBill.paid_at && (
                                        <div className="bg-emerald-500/10 rounded-xl p-4 text-center">
                                            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                                            <p className="text-sm font-semibold text-emerald-600">Paid on {new Date(selectedBill.paid_at).toLocaleString()}</p>
                                            {selectedBill.payment_method && <p className="text-xs text-slate-400 mt-0.5">via {selectedBill.payment_method}</p>}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                                    <Banknote className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                    <p className="text-sm text-slate-500">Select a bill to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Payment Modal */}
            {showPayModal && selectedBill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!paying && parseFloat(payForm.amount) > 0) {
                                processPayment();
                            }
                        }}
                        className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] w-full max-w-md"
                    >
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Process Payment</h3>
                            <button type="button" onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <div className="p-8 space-y-6 overflow-y-auto scrollbar-slim modal-content-scroll">
                                <p className="text-sm text-slate-500">Bill: <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">{selectedBill.bill_number}</span> — {selectedBill.patient_first} {selectedBill.patient_last}</p>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Amount (₦)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={payForm.amount}
                                        onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Payment Method</label>
                                    <select
                                        value={payForm.payment_method}
                                        onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="transfer">Bank Transfer</option>
                                        <option value="mobile">Mobile Payment</option>
                                        {!selectedBill.is_walk_in && <option value="wallet">Patient Wallet</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Reference (optional)</label>
                                    <input
                                        type="text"
                                        value={payForm.payment_reference}
                                        onChange={e => setPayForm({ ...payForm, payment_reference: e.target.value })}
                                        placeholder="Transaction reference..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 sticky bottom-0">
                                <button type="button" onClick={() => setShowPayModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                                    Cancel
                                </button>
                                <button type="submit" disabled={paying} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                                    {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirm Payment
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (rejectNotes.trim()) {
                                handleVerify(showRejectModal.id, showRejectModal.type, 'rejected', rejectNotes);
                            }
                        }}
                        className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] w-full max-w-md"
                    >
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-rose-600 flex items-center gap-2"><XCircle className="w-6 h-6" /> Reject Order</h3>
                            <button type="button" onClick={() => { setShowRejectModal(null); setRejectNotes(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <div className="p-8 space-y-6 overflow-y-auto scrollbar-slim modal-content-scroll">
                                <p className="text-sm text-slate-500">This will prevent the order from being processed by lab/pharmacy.</p>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Reason for Rejection</label>
                                    <textarea
                                        value={rejectNotes}
                                        onChange={e => setRejectNotes(e.target.value)}
                                        placeholder="Enter reason..."
                                        rows={3}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-rose-500 text-slate-900 dark:text-white resize-none"
                                    />
                                </div>
                            </div>
                            <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 sticky bottom-0">
                                <button type="button" onClick={() => { setShowRejectModal(null); setRejectNotes(''); }} className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!rejectNotes.trim()}
                                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
                                >
                                    <XCircle className="w-4 h-4" /> Confirm Rejection
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <InvoiceModal 
                isOpen={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                bill={selectedBill}
                isReceipt={isReceiptMode}
            />
        </div>
    );
}
