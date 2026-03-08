import React, { useState } from 'react';
import {
    User,
    Lock,
    Shield,
    Eye,
    EyeOff,
    Loader2,
    CheckCircle,
    AlertCircle,
    X,
    Smartphone,
    Mail,
    KeyRound,
    Settings as SettingsIcon,
    Globe,
    Timer,
    Coins,
    Upload
} from 'lucide-react';
import api from '../api/client';

export default function Settings() {
    const userStr = localStorage.getItem('user');
    let currentUser = { username: 'User', role: '', email: '' };
    if (userStr && userStr !== 'undefined') {
        try { currentUser = JSON.parse(userStr); } catch { }
    }

    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'system'>('profile');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // System Settings State
    const [systemSettings, setSystemSettings] = useState<Record<string, { value: string, category: string }>>({});
    const [loadingSettings, setLoadingSettings] = useState(false);

    const [profileData, setProfileData] = useState({
        username: currentUser.username,
        full_name: (currentUser as any).full_name || '',
        email: currentUser.email || '',
        profile_picture: (currentUser as any).profile_picture || null
    });

    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });

    React.useEffect(() => {
        if (activeTab === 'system' && currentUser.role === 'super_admin') {
            fetchSystemSettings();
        }
    }, [activeTab]);

    const fetchSystemSettings = async () => {
        try {
            setLoadingSettings(true);
            const res = await api.get('/settings');
            setSystemSettings(res.data);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setLoadingSettings(false);
        }
    };

    const handleSystemSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const updatePayload: Record<string, string> = {};
            Object.keys(systemSettings).forEach(key => {
                updatePayload[key] = systemSettings[key].value;
            });
            await api.post('/settings/update', updatePayload);
            setMessage({ type: 'success', text: 'System settings updated successfully' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update system settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleProfileSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.put('/users/profile', {
                username: profileData.username,
                email: profileData.email,
                full_name: profileData.full_name
            });
            const updatedUser = { ...currentUser, ...profileData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setMessage({ type: 'success', text: 'Profile updated successfully' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profile_picture', file);

        try {
            setSaving(true);
            const res = await api.post('/api/users/profile-picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const newPic = res.data.profile_picture;
            setProfileData(prev => ({ ...prev, profile_picture: newPic }));
            const updatedUser = { ...currentUser, profile_picture: newPic };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setMessage({ type: 'success', text: 'Profile picture updated' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to upload picture' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        if (passwordData.new_password.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
            return;
        }
        try {
            setSaving(true);
            await api.put('/users/password', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password
            });
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
            setMessage({ type: 'success', text: 'Password changed successfully' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'profile' as const, label: 'Profile', icon: User },
        { id: 'security' as const, label: 'Security', icon: Shield },
        ...(currentUser.role === 'super_admin' ? [{ id: 'system' as const, label: 'System', icon: SettingsIcon }] : []),
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account preferences and security</p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                    <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-1">
                        {/* User Info */}
                        <div className="text-center p-6 pb-4">
                            <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold text-2xl mx-auto mb-3 overflow-hidden">
                                {profileData.profile_picture ? (
                                    <img src={`http://localhost:5173/api/uploads/profiles/${profileData.profile_picture}`} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    (profileData.full_name || currentUser.username).charAt(0).toUpperCase()
                                )}
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white truncate">{profileData.full_name || currentUser.username}</h3>
                            <p className="text-xs text-slate-500 truncate mb-2">@{currentUser.username}</p>
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg bg-brand-500/10 text-brand-500 inline-block">
                                {currentUser.role.replace('_', ' ')}
                            </span>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${activeTab === tab.id
                                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white'
                                        }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Panel */}
                <div className="lg:col-span-3">
                    {activeTab === 'profile' && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <User className="w-5 h-5 text-brand-500" />
                                Profile Information
                            </h2>
                            <form onSubmit={handleProfileSave} className="space-y-6 max-w-md">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-brand-500 text-3xl font-bold overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                                            {profileData.profile_picture ? (
                                                <img src={`http://localhost:5173/api/uploads/profiles/${profileData.profile_picture}`} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                (profileData.full_name || profileData.username).charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <label className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-white rounded-3xl opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
                                            <Upload className="w-6 h-6" />
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">Profile Photo</h4>
                                        <p className="text-xs text-slate-500 mt-1">Click to upload a new picture. Max 2MB.</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Full Name</label>
                                    <input type="text" value={profileData.full_name}
                                        onChange={e => setProfileData({ ...profileData, full_name: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Username</label>
                                    <input type="text" required value={profileData.username}
                                        onChange={e => setProfileData({ ...profileData, username: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase flex items-center gap-2">
                                        <Mail className="w-3 h-3" /> Email
                                    </label>
                                    <input type="email" required value={profileData.email}
                                        onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white" />
                                </div>
                                <button type="submit" disabled={saving}
                                    className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-600/20 flex items-center gap-2">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    Save Profile
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            {/* Password Change */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <KeyRound className="w-5 h-5 text-brand-500" />
                                    Change Password
                                </h2>
                                <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Current Password</label>
                                        <div className="relative">
                                            <input type={showOld ? 'text' : 'password'} required value={passwordData.current_password}
                                                onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 pr-10 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white" />
                                            <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-3 text-slate-400">
                                                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 ml-1 uppercase">New Password</label>
                                        <div className="relative">
                                            <input type={showNew ? 'text' : 'password'} required value={passwordData.new_password}
                                                onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 pr-10 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white" />
                                            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-3 text-slate-400">
                                                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Confirm New Password</label>
                                        <div className="relative">
                                            <input type={showConfirm ? 'text' : 'password'} required value={passwordData.confirm_password}
                                                onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 pr-10 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white" />
                                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3 text-slate-400">
                                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <button type="submit" disabled={saving}
                                        className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-600/20 flex items-center gap-2">
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                        Update Password
                                    </button>
                                </form>
                            </div>

                            {/* MFA Section */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Smartphone className="w-5 h-5 text-brand-500" />
                                    Two-Factor Authentication
                                </h2>
                                <p className="text-slate-500 text-sm mb-6">Add an extra layer of security to your account using TOTP</p>
                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                                            <Shield className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">TOTP Authenticator</p>
                                            <p className="text-xs text-slate-400">Google Authenticator, Authy, or similar</p>
                                        </div>
                                    </div>
                                    <button className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-600/20">
                                        Enable
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'system' && currentUser.role === 'super_admin' && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <SettingsIcon className="w-5 h-5 text-brand-500" />
                                System Configuration
                            </h2>

                            {loadingSettings ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                                    <p className="mt-4 text-slate-500 font-medium">Loading system parameters...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSystemSave} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* General Section */}
                                        <div className="space-y-6">
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Globe className="w-4 h-4" /> General Info
                                            </h3>
                                            
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hospital Name</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                                    value={systemSettings.hospital_name?.value || ''}
                                                    onChange={e => setSystemSettings({
                                                        ...systemSettings,
                                                        hospital_name: { ...systemSettings.hospital_name, value: e.target.value }
                                                    })}
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Currency Symbol</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                                        value={systemSettings.hospital_currency?.value || ''}
                                                        onChange={e => setSystemSettings({
                                                            ...systemSettings,
                                                            hospital_currency: { ...systemSettings.hospital_currency, value: e.target.value }
                                                        })}
                                                    />
                                                    <Coins className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Security & System */}
                                        <div className="space-y-6">
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Shield className="w-4 h-4" /> Security & System
                                            </h3>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Session Timeout (Minutes)</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                                        value={systemSettings.session_timeout?.value || ''}
                                                        onChange={e => setSystemSettings({
                                                            ...systemSettings,
                                                            session_timeout: { ...systemSettings.session_timeout, value: e.target.value }
                                                        })}
                                                    />
                                                    <Timer className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Maintenance Mode</label>
                                                <select 
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white font-bold"
                                                    value={systemSettings.maintenance_mode?.value || 'false'}
                                                    onChange={e => setSystemSettings({
                                                        ...systemSettings,
                                                        maintenance_mode: { ...systemSettings.maintenance_mode, value: e.target.value }
                                                    })}
                                                >
                                                    <option value="false">Off / Active</option>
                                                    <option value="true">On / Maintenance</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <button 
                                            type="submit" 
                                            disabled={saving}
                                            className="bg-slate-900 dark:bg-brand-600 hover:bg-slate-800 dark:hover:bg-brand-500 disabled:opacity-50 text-white px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center gap-3"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <SettingsIcon className="w-4 h-4" />}
                                            Save System Settings
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
