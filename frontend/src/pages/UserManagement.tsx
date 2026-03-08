import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
    Users,
    Shield,
    Plus,
    Search,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    Loader2,
    X,
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react';

interface UserRecord {
    id: string;
    username: string;
    full_name?: string;
    email: string;
    role: string;
    specialty?: string;
    is_active: boolean;
    profile_picture?: string;
    created_at: string;
    last_login?: string;
}

const roleColors: Record<string, string> = {
    super_admin: 'bg-purple-500/10 text-purple-500',
    doctor: 'bg-brand-500/10 text-brand-500',
    nurse: 'bg-emerald-500/10 text-emerald-500',
    lab_attendant: 'bg-amber-500/10 text-amber-500',
    receptionist: 'bg-blue-500/10 text-blue-500',
    pharmacist: 'bg-pink-500/10 text-pink-500',
    billing_officer: 'bg-violet-500/10 text-violet-500',
};

const SPECIALIZATIONS = [
    'General Medicine',
    'Pediatrics',
    'OB-GYN',
    'Surgery',
    'Cardiology',
    'Dermatology',
    'Psychiatry',
    'Orthopedics',
    'Radiology',
    'Ophthalmology',
    'Urology',
    'Internal Medicine',
    'Neurology',
    'Gastroenterology',
    'Oncology',
    'Endocrinology'
];

export default function UserManagement() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        username: '', full_name: '', email: '', password: '', confirmPassword: '', role: 'receptionist', specialty: 'General Medicine', is_active: true
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/users');
            setUsers(Array.isArray(res.data) ? res.data : res.data.users || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingUser && formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            const payload: any = { ...formData };
            delete payload.confirmPassword;

            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, payload);
            } else {
                await api.post('/users', payload);
            }
            setShowModal(false);
            setEditingUser(null);
            setFormData({ username: '', full_name: '', email: '', password: '', confirmPassword: '', role: 'receptionist', specialty: '', is_active: true });
            setShowPassword(false);
            setShowConfirmPassword(false);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Operation failed');
        }
    };

    const toggleActive = async (user: UserRecord) => {
        if (user.role === 'super_admin') return;
        try {
            await api.put(`/users/${user.id}`, { is_active: !user.is_active });
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update user');
        }
    };

    const handleDelete = async (user: UserRecord) => {
        if (user.role === 'super_admin') return;
        if (!window.confirm(`Are you sure you want to permanently delete user "${user.username}"? This action cannot be undone.`)) return;

        try {
            await api.delete(`/users/${user.id}`);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete user');
        }
    };

    const openEdit = (user: UserRecord) => {
        setEditingUser(user);
        setFormData({ 
            username: user.username, 
            full_name: user.full_name || '', 
            email: user.email, 
            password: '', 
            confirmPassword: '', 
            role: user.role, 
            specialty: user.specialty || 'General Medicine',
            is_active: user.is_active 
        });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditingUser(null);
        setFormData({ 
            username: '', 
            full_name: '',
            email: '', 
            password: '', 
            confirmPassword: '', 
            role: 'doctor', 
            specialty: 'General Medicine',
            is_active: true 
        });
        setShowPassword(false);
        setShowConfirmPassword(false);
        setShowModal(true);
    };

    const filtered = users.filter(u =>
        (u.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.role?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.role?.replace('_', ' ').toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Staff Management</h1>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Control access and system roles</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-brand-600/20 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    New Account
                </button>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                    <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500"><Users className="w-4 h-4" /></div>
                        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{users.length}</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Staff</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500"><UserCheck className="w-4 h-4" /></div>
                        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{users.filter(u => u.is_active).length}</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500"><UserX className="w-4 h-4" /></div>
                        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{users.filter(u => !u.is_active).length}</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suspended</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500"><Shield className="w-4 h-4" /></div>
                        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{new Set(users.map(u => u.role)).size}</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Roles</p>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Search className="w-5 h-5 text-slate-400 ml-3" />
                <input
                    type="text"
                    placeholder="Search users by name, email, or role..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400 text-sm py-2"
                />
            </div>

            {/* User Table */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">User</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Role</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Joined</th>
                                <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(user => (
                                <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 font-black text-xs overflow-hidden border border-brand-500/20 shadow-sm shrink-0">
                                                {user.profile_picture ? (
                                                    <img src={`http://localhost:5173/api/uploads/profiles/${user.profile_picture}`} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    (user.full_name || user.username).charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 dark:text-white uppercase truncate text-xs">{user.full_name || user.username}</p>
                                                <p className="text-[10px] text-slate-400 font-bold tracking-tight truncate">{user.username} • {user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${roleColors[user.role || ''] || 'bg-slate-500/10 text-slate-500'}`}>
                                            {user.role ? user.role.replace('_', ' ') : 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${user.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                            {user.is_active ? 'Active' : 'Offline'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {user.role !== 'super_admin' ? (
                                                <>
                                                    <button onClick={() => openEdit(user)} className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 rounded-xl transition-all active:scale-90">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => toggleActive(user)} className={`p-2 rounded-xl transition-all active:scale-90 ${user.is_active ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/10' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10'}`}>
                                                        {user.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <button onClick={() => handleDelete(user)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic px-2">Protected</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-slate-400">
                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingUser ? 'Edit Specialist' : 'New Specialist'}</h2>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{editingUser ? 'Update account access' : 'Provision new staff access'}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
                            <div className="p-8 space-y-5 overflow-y-auto scrollbar-slim modal-content-scroll">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Username</label>
                                    <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white" />
                                </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Full Name</label>
                                <input type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Email</label>
                                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Password {editingUser && <span className="font-normal normal-case">(leave blank to keep current)</span>}</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        {...(!editingUser ? { required: true } : {})}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {!editingUser && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            required
                                            value={formData.confirmPassword}
                                            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Role</label>
                                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white appearance-none">
                                    <option value="super_admin">Super Admin</option>
                                    <option value="doctor">Doctor</option>
                                    <option value="nurse">Nurse</option>
                                    <option value="lab_attendant">Lab Attendant</option>
                                    <option value="receptionist">Receptionist</option>
                                    <option value="pharmacist">Pharmacist</option>
                                    <option value="billing_officer">Billing Officer</option>
                                </select>
                            </div>
                            {formData.role === 'doctor' && (
                                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Specialization</label>
                                    <select value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white appearance-none">
                                        {SPECIALIZATIONS.map(spec => (
                                            <option key={spec} value={spec}>{spec}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            </div>
                            <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-900 sticky bottom-0">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-500 py-3 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                    Cancel
                                </button>
                                <button type="submit"
                                    className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-2xl font-bold transition-all shadow-lg shadow-brand-600/20">
                                    {editingUser ? 'Save Changes' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
