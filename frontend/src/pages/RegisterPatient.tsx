import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserPlus, ArrowLeft, Loader2, Save, User, Calendar, Mail, Phone, Hash, Shield, Camera, X } from 'lucide-react';
import api from '../api/client';

export default function RegisterPatient() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'male',
        email: '',
        phone: '',
        nin: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        insurance_provider_id: '',
        insurance_policy_number: ''
    });
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [providers, setProviders] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const [providersRes, patientRes] = await Promise.all([
                    api.get('/insurance/providers'),
                    isEdit ? api.get(`/patients/${id}`) : Promise.resolve({ data: null })
                ]);
                
                setProviders(providersRes.data.filter((p: any) => p.status === 'active'));
                
                if (patientRes.data) {
                    const p = patientRes.data;
                    setFormData({
                        first_name: p.first_name || '',
                        last_name: p.last_name || '',
                        date_of_birth: p.date_of_birth || '',
                        gender: p.gender || 'male',
                        email: p.email || '',
                        phone: p.phone || '',
                        nin: p.nin || '',
                        emergency_contact_name: p.emergency_contact_name || '',
                        emergency_contact_phone: p.emergency_contact_phone || '',
                        emergency_contact_relationship: p.emergency_contact_relationship || '',
                        insurance_provider_id: p.insurance_provider_id || '',
                        insurance_policy_number: p.insurance_policy_number || ''
                    });
                    if (p.profile_picture) {
                        setPreviewUrl(`${api.defaults.baseURL?.replace('/api', '')}/${p.profile_picture}`);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch initial data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [id, isEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                data.append(key, value);
            });
            if (profilePicture) {
                data.append('profile_picture', profilePicture);
            }

            if (isEdit) {
                // If it's a multipart edit, some backends prefer POST with _method=PUT or just POST
                // but let's try calling PUT first
                await api.post(`/patients/${id}?_method=PUT`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/patients', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            navigate(isEdit ? `/patients/${id}` : '/patients');
        } catch (err: any) {
            setError(err.response?.data?.error || `Failed to ${isEdit ? 'update' : 'register'} patient. Please verify input.`);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePicture(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/patients')}
                    className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-900 rounded-xl transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {isEdit ? 'Edit Patient Profile' : 'Register Patient'}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {isEdit ? 'Modify patient medical record information' : 'Create a new secure medical record'}
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-500 text-sm flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-500" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <User className="w-4 h-4" /> Personal Information
                    </h2>

                    <div className="flex flex-col items-center mb-6">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-xl relative">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                                        <User className="w-16 h-16" />
                                    </div>
                                )}
                                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                    <Camera className="w-8 h-8 text-white" />
                                </label>
                            </div>
                            {previewUrl && (
                                <button
                                    type="button"
                                    onClick={() => { setPreviewUrl(null); setProfilePicture(null); }}
                                    className="absolute -top-1 -right-1 p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-all"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-widest">Patient Photo</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">First Name</label>
                            <input
                                type="text"
                                name="first_name"
                                required
                                value={formData.first_name}
                                onChange={handleChange}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                placeholder="Enter first name"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                required
                                value={formData.last_name}
                                onChange={handleChange}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                placeholder="Enter last name"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Date of Birth</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    name="date_of_birth"
                                    required
                                    value={formData.date_of_birth}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Gender</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 flex items-center gap-2 uppercase">
                            <Hash className="w-3 h-3" /> NIN (National Identification)
                        </label>
                        <input
                            type="text"
                            name="nin"
                            value={formData.nin}
                            onChange={handleChange}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                            placeholder="Enter 11-digit NIN"
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Insurance Information
                    </h2>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Insurance Provider</label>
                        <select
                            name="insurance_provider_id"
                            value={formData.insurance_provider_id}
                            onChange={handleChange}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white appearance-none"
                        >
                            <option value="">No Insurance (Private Pay)</option>
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Policy Number</label>
                        <input
                            type="text"
                            name="insurance_policy_number"
                            value={formData.insurance_policy_number}
                            onChange={handleChange}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                            placeholder="Policy Number"
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Contact Information
                    </h2>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Email Address <span className="font-normal lowercase opacity-70">(Optional)</span></label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                placeholder="Email Address"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                placeholder="Phone Number"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm col-span-full">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> Next of Kin Details
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Full Name</label>
                            <input
                                type="text"
                                name="emergency_contact_name"
                                value={formData.emergency_contact_name}
                                onChange={handleChange}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                placeholder="Full Name"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    name="emergency_contact_phone"
                                    value={formData.emergency_contact_phone}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                    placeholder="Phone Number"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Relationship</label>
                            <select
                                name="emergency_contact_relationship"
                                value={formData.emergency_contact_relationship}
                                onChange={handleChange}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
                            >
                                <option value="">Select Relationship...</option>
                                <option value="Spouse">Spouse</option>
                                <option value="Parent">Parent</option>
                                <option value="Child">Child</option>
                                <option value="Sibling">Sibling</option>
                                <option value="Grandparent">Grandparent</option>
                                <option value="Friend">Friend</option>
                                <option value="Guardian">Guardian</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="col-span-full flex items-center justify-end gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/patients')}
                        className="px-6 py-3 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 px-10 py-4 rounded-2xl font-bold text-white shadow-xl shadow-brand-600/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {isEdit ? 'Save Changes' : 'Complete Registration'}
                    </button>
                </div>
            </form>
        </div>
    );
}
