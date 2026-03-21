import React, { useState, useEffect } from 'react';
import { 
    Wallet, 
    Plus, 
    History, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Loader2, 
    AlertCircle, 
    CheckCircle2,
    X,
    Eye,
    EyeOff
} from 'lucide-react';
import api from '../api/client';

interface WalletTransaction {
    id: string;
    amount: string;
    type: 'deposit' | 'payment' | 'refund';
    method: string;
    description: string;
    created_at: string;
}

interface PatientWalletProps {
    patientId: string;
}

export default function PatientWallet({ patientId }: PatientWalletProps) {
    const [balance, setBalance] = useState<number>(0);
    const [history, setHistory] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [depositForm, setDepositForm] = useState({ amount: '', method: 'cash', description: '' });
    const [depositing, setDepositing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showBalance, setShowBalance] = useState(false);

    useEffect(() => {
        fetchWalletData();
    }, [patientId]);

    const fetchWalletData = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/wallet/history/${patientId}`);
            setBalance(parseFloat(res.data.balance));
            setHistory(res.data.history || []);
        } catch (err) {
            console.error('Failed to fetch wallet data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setDepositing(true);
            setMessage(null);
            await api.post('/wallet/deposit', {
                patient_id: patientId,
                amount: parseFloat(depositForm.amount),
                payment_method: depositForm.method,
                description: depositForm.description || 'Wallet Deposit'
            });
            
            setMessage({ type: 'success', text: 'Deposit successful!' });
            setDepositForm({ amount: '', method: 'cash', description: '' });
            setShowDepositModal(false);
            fetchWalletData();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Deposit failed' });
        } finally {
            setDepositing(false);
        }
    };

    const formatCurrency = (amount: string | number) => {
        return '₦' + Math.abs(parseFloat(String(amount))).toLocaleString('en-NG', { minimumFractionDigits: 2 });
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Wallet Balance Card */}
            <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-3xl p-8 text-white shadow-xl shadow-brand-600/20 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2 opacity-80">
                        <Wallet className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Available Balance</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <h2 className="text-4xl font-black transition-all duration-300">
                            {showBalance ? formatCurrency(balance) : '₦•••••••'}
                        </h2>
                        <button 
                            onClick={() => setShowBalance(!showBalance)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            title={showBalance ? "Hide Balance" : "Show Balance"}
                        >
                            {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    <button 
                        onClick={() => setShowDepositModal(true)}
                        className="mt-6 flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-2.5 rounded-2xl font-bold text-sm transition-all"
                    >
                        <Plus className="w-4 h-4" /> Deposit Funds
                    </button>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-400/20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
            </div>

            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                    message.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <p className="text-sm font-semibold">{message.text}</p>
                    <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Transaction History */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <History className="w-4 h-4" /> Transaction History
                    </h3>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {history.length > 0 ? history.map(tx => (
                        <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 
                                    tx.type === 'payment' ? 'bg-brand-500/10 text-brand-500' : 'bg-rose-500/10 text-rose-500'
                                }`}>
                                    {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{tx.description}</p>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                        {new Date(tx.created_at).toLocaleString()} • <span className="capitalize">{tx.method}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-black ${
                                    tx.type === 'deposit' ? 'text-emerald-500' : 
                                    tx.type === 'payment' ? 'text-brand-600 dark:text-brand-400' : 'text-rose-500'
                                }`}>
                                    {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{tx.type}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="p-12 text-center text-slate-400">
                            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No transactions yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Deposit Modal */}
            {showDepositModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Deposit Funds</h3>
                            <button onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleDeposit} className="p-8 space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Amount (₦)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={depositForm.amount}
                                    onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Payment Method</label>
                                <select
                                    value={depositForm.method}
                                    onChange={e => setDepositForm({ ...depositForm, method: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="transfer">Bank Transfer</option>
                                    <option value="mobile">Mobile Payment</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Notes (optional)</label>
                                <textarea
                                    value={depositForm.description}
                                    onChange={e => setDepositForm({ ...depositForm, description: e.target.value })}
                                    placeholder="Add a reason or reference..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white resize-none"
                                    rows={2}
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={depositing}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                            >
                                {depositing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Confirm Deposit
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
