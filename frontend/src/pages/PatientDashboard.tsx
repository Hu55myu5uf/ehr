import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus, Filter, MoreHorizontal, ChevronRight, Loader2, Trash2, Microscope, X, Beaker, AlertCircle } from 'lucide-react';
import api from '../api/client';

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

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    patient_number: string;
    gender: string;
    date_of_birth: string;
    email: string;
    phone: string;
    deleted_at: string | null;
}

export default function PatientDashboard() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [orderForm, setOrderForm] = useState({
        test_name: '',
        test_category: 'other',
        priority: 'routine',
        notes: ''
    });
    const [isOrdering, setIsOrdering] = useState(false);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const res = await api.get('/patients');
            setPatients(res.data.patients || []);
        } catch (err) {
            console.error('Failed to fetch patients', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (patientId: string, patientName: string) => {
        if (!window.confirm(`Are you sure you want to permanently delete patient "${patientName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/patients/${patientId}`);
            fetchPatients();
        } catch (err) {
            console.error('Failed to delete patient', err);
            alert('Failed to delete patient record');
        }
    };

    const [lastBillId, setLastBillId] = useState<string | null>(null);

    const handleOrderLab = async (e: React.FormEvent, generateBill = false) => {
        e.preventDefault();
        if (!selectedPatient) return;

        try {
            setIsOrdering(true);

            let categoryId = 'other';
            for (const cat of LAB_TESTS) {
                if (cat.tests.includes(orderForm.test_name)) {
                    categoryId = cat.id;
                    break;
                }
            }

            // Create lab order
            await api.post('/labs/orders', {
                ...orderForm,
                test_category: categoryId,
                patient_id: selectedPatient.id,
                test_code: orderForm.test_name.toUpperCase().replace(/\s+/g, '_')
            });

            if (generateBill) {
                const billRes = await api.post('/billing/generate-direct', {
                    patient_id: selectedPatient.id
                });
                setLastBillId(billRes.data.id);
                alert('Lab order created and bill generated successfully');
            } else {
                alert('Lab order created successfully');
            }

            if (!generateBill) setIsOrderModalOpen(false);
            setOrderForm({ test_name: '', test_category: 'other', priority: 'routine', notes: '' });
        } catch (err: any) {
            console.error('Failed to create lab order', err);
            alert(err.response?.data?.error || 'Failed to create lab order');
        } finally {
            setIsOrdering(false);
        }
    };

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isSuperAdmin = user?.role === 'super_admin';

    const filteredPatients = patients.filter(p =>
        `${p.first_name} ${p.last_name} `.toLowerCase().includes(search.toLowerCase()) ||
        p.patient_number?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Patient Records</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and access patient health information</p>
                </div>
                <Link
                    to="/patients/register"
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-brand-600/20"
                >
                    <UserPlus className="w-5 h-5" />
                    Register Patient
                </Link>
            </div>

            <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by name, patient ID, or SSN..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent border-none outline-none pl-10 pr-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                    />
                </div>
                <button className="p-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all">
                    <Filter className="w-5 h-5" />
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">Patient Details</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">Gender / DOB</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">Contact</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                                        <span className="text-slate-400 font-medium">Retrieving patient records...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredPatients.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                                    No patient records found matching your search.
                                </td>
                            </tr>
                        ) : (
                            filteredPatients.map((patient) => (
                                <tr key={patient.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-brand-500">
                                                {patient.first_name[0]}{patient.last_name[0]}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors">
                                                    {patient.first_name} {patient.last_name}
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono uppercase">{patient.patient_number}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs">
                                        <div className="text-slate-700 dark:text-slate-300 capitalize">{patient.gender}</div>
                                        <div className="text-slate-500">{new Date(patient.date_of_birth).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs">
                                        <div className="text-slate-700 dark:text-slate-300">{patient.email || 'No Email'}</div>
                                        <div className="text-slate-500">{patient.phone || 'No Phone'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${patient.deleted_at ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                                            }`}>
                                            {patient.deleted_at ? 'Inactive' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 outline-none">
                                            {isSuperAdmin && (
                                                <button
                                                    onClick={() => handleDelete(patient.id, `${patient.first_name} ${patient.last_name}`)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="Delete Patient"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                            <Link to={`/patients/${patient.id}`} className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 rounded-lg transition-all">
                                                <ChevronRight className="w-5 h-5" />
                                            </Link>
                                            {(user?.role === 'receptionist' || user?.role === 'super_admin' || user?.role === 'doctor') && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedPatient(patient);
                                                        setIsOrderModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 rounded-lg transition-all"
                                                    title="Order Lab Test"
                                                >
                                                    <Microscope className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Direct Lab Order Modal */}
            {isOrderModalOpen && selectedPatient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Order Lab Test</h3>
                                <p className="text-sm text-slate-500 mt-0.5">For {selectedPatient.first_name} {selectedPatient.last_name}</p>
                            </div>
                            <button
                                onClick={() => setIsOrderModalOpen(false)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={(e) => handleOrderLab(e)} className="flex flex-col max-h-[85vh]">
                            <div className="p-8 space-y-6 overflow-y-auto scrollbar-slim modal-content-scroll">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Test Name *</label>
                                        <select
                                            required
                                            value={orderForm.test_name}
                                            onChange={e => setOrderForm({ ...orderForm, test_name: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white"
                                        >
                                            <option value="" disabled>Select Test...</option>
                                            {LAB_TESTS.map((group: any) => (
                                                <optgroup key={group.category} label={group.category}>
                                                    {group.tests.map((test: string) => (
                                                        <option key={test} value={test}>{test}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Priority</label>
                                        <select
                                            value={orderForm.priority}
                                            onChange={e => setOrderForm({ ...orderForm, priority: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white"
                                        >
                                            <option value="routine">Routine</option>
                                            <option value="urgent">Urgent</option>
                                            <option value="stat">STAT</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Notes</label>
                                    <textarea
                                        value={orderForm.notes}
                                        onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white h-24 resize-none"
                                        placeholder="Additional instructions..."
                                    />
                                </div>
                            </div>

                            <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0 flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOrderModalOpen(false);
                                            setLastBillId(null);
                                        }}
                                        className="flex-1 px-4 py-3 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isOrdering}
                                        onClick={(e) => handleOrderLab(e, true)}
                                        className="flex-[2] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-500/50 text-white px-4 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-600/20"
                                    >
                                        {isOrdering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Beaker className="w-5 h-5" />}
                                        Order & Generate Bill
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isOrdering}
                                    className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-500/50 text-white px-4 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-brand-600/20"
                                >
                                    {isOrdering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Microscope className="w-5 h-5" />}
                                    Order Only (No Bill Yet)
                                </button>

                                {lastBillId && (
                                    <Link
                                        to={`/billing/${lastBillId}`}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-3 rounded-xl font-semibold transition-all border border-slate-200 dark:border-slate-700 mt-2"
                                    >
                                        Go to Bill <ChevronRight className="w-5 h-5" />
                                    </Link>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
