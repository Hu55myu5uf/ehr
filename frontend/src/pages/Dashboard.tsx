import React, { useEffect, useState } from 'react';
import {
    Users, Stethoscope, Beaker, Pill, CalendarCheck, Clock,
    TrendingUp, Activity, Banknote, Loader2, ArrowRight,
    ClipboardList, HeartPulse, FileText, AlertCircle, CheckCircle2, ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';

interface DashboardStats {
    total_patients: number;
    active_encounters: number;
    pending_labs: number;
    pending_rx: number;
    todays_appointments: number;
    pending_bills: number;
    completed_today: number;
}

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        total_patients: 0,
        active_encounters: 0,
        pending_labs: 0,
        pending_rx: 0,
        todays_appointments: 0,
        pending_bills: 0,
        completed_today: 0
    });
    const [loading, setLoading] = useState(true);

    const userStr = localStorage.getItem('user');
    let user = { username: 'User', role: 'super_admin' };
    if (userStr && userStr !== 'undefined') {
        try { user = JSON.parse(userStr); } catch { }
    }

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.get('/dashboard/stats');
            setStats({
                total_patients: res.data.total_patients || 0,
                active_encounters: res.data.active_encounters || 0,
                pending_labs: res.data.pending_labs || 0,
                pending_rx: res.data.pending_rx || 0,
                todays_appointments: res.data.todays_appointments || 0,
                pending_bills: res.data.pending_bills || 0,
                completed_today: res.data.completed_today || 0
            });
        } catch (err) {
            console.error('Failed to fetch stats', err);
        } finally {
            setLoading(false);
        }
    };

    const getRoleGreeting = () => {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
        return timeGreeting;
    };

    const getRoleTitle = () => {
        switch (user.role) {
            case 'receptionist': return 'Reception Desk';
            case 'doctor': return 'Clinical Dashboard';
            case 'nurse': return 'Nursing Station';
            case 'lab_attendant': return 'Laboratory Dashboard';
            case 'pharmacist': return 'Pharmacy Dashboard';
            case 'billing_officer': return 'Billing & Verification';
            default: return 'Admin Dashboard';
        }
    };

    // Color maps for Tailwind JIT
    const colorMap: Record<string, { bg: string; text: string; shadow: string }> = {
        brand: { bg: 'bg-brand-500/10', text: 'text-brand-500', shadow: 'shadow-brand-500/10' },
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', shadow: 'shadow-blue-500/10' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', shadow: 'shadow-amber-500/10' },
        indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', shadow: 'shadow-indigo-500/10' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', shadow: 'shadow-emerald-500/10' },
        rose: { bg: 'bg-rose-500/10', text: 'text-rose-500', shadow: 'shadow-rose-500/10' },
    };

    // KPI cards per role
    const getKPIs = () => {
        const all = [
            { label: 'Total Patients', value: stats.total_patients, icon: Users, color: 'brand', link: '/patients' },
            { label: 'Active Consultations', value: stats.active_encounters, icon: Stethoscope, color: 'blue', link: '/consultations' },
            { label: 'Completed Today', value: stats.completed_today, icon: CheckCircle2, color: 'emerald', link: '/consultations' },
            { label: 'Pending Lab Orders', value: stats.pending_labs, icon: Beaker, color: 'amber', link: '/labs' },
            { label: 'Pending Prescriptions', value: stats.pending_rx, icon: Pill, color: 'indigo', link: '/pharmacy' },
            { label: "Today's Appointments", value: stats.todays_appointments, icon: CalendarCheck, color: 'emerald', link: '/appointments' },
            { label: 'Pending Bills', value: stats.pending_bills, icon: Banknote, color: 'rose', link: '/billing' },
        ];

        switch (user.role) {
            case 'receptionist':
                return all.filter(k => ['Total Patients', "Today's Appointments", 'Active Consultations', 'Pending Bills'].includes(k.label));
            case 'doctor':
                return all.filter(k => ['Active Consultations', 'Completed Today', 'Pending Lab Orders', "Today's Appointments"].includes(k.label));
            case 'nurse':
                return [
                    { label: 'Active Patients', value: stats.active_encounters, icon: HeartPulse, color: 'brand', link: '/nursing' },
                    { label: 'Completed Today', value: stats.completed_today, icon: CheckCircle2, color: 'emerald', link: '/nursing' },
                ];
            case 'lab_attendant':
                return [
                    { label: 'Pending Orders', value: stats.pending_labs, icon: Beaker, color: 'amber', link: '/labs' },
                    { label: 'Completed Today', value: stats.completed_today, icon: FileText, color: 'emerald', link: '/labs' },
                ];
            case 'pharmacist':
                return [
                    { label: 'Pending Prescriptions', value: stats.pending_rx, icon: Pill, color: 'indigo', link: '/pharmacy' },
                    { label: 'Dispensed Today', value: stats.completed_today, icon: ClipboardList, color: 'emerald', link: '/pharmacy' },
                ];
            case 'billing_officer':
                return [
                    { label: 'Pending Verification', value: stats.pending_bills, icon: ShieldCheck, color: 'indigo', link: '/billing' },
                    { label: 'Pending Bills', value: stats.pending_bills, icon: Banknote, color: 'rose', link: '/billing' },
                    { label: 'Total Patients', value: stats.total_patients, icon: Users, color: 'brand', link: '/patients' },
                ];
            default: // super_admin
                return all;
        }
    };

    // Quick action buttons per role
    const getQuickActions = () => {
        switch (user.role) {
            case 'receptionist':
                return [
                    { label: 'Register Patient', to: '/patients/register', icon: Users },
                    { label: 'Book Appointment', to: '/appointments', icon: CalendarCheck },
                    { label: 'View Bills', to: '/billing', icon: Banknote },
                ];
            case 'doctor':
                return [
                    { label: 'View Consultations', to: '/consultations', icon: Stethoscope },
                    { label: 'Lab Results', to: '/labs', icon: Beaker },
                ];
            case 'nurse':
                return [
                    { label: 'Active Patients', to: '/nursing', icon: HeartPulse },
                    { label: 'Record Vitals', to: '/nursing', icon: Activity },
                ];
            case 'lab_attendant':
                return [
                    { label: 'Pending Orders', to: '/labs', icon: Beaker },
                ];
            case 'pharmacist':
                return [
                    { label: 'Pending Prescriptions', to: '/pharmacy', icon: Pill },
                ];
            case 'billing_officer':
                return [
                    { label: 'Pending Verification', to: '/billing', icon: ShieldCheck },
                    { label: 'View Bills', to: '/billing', icon: Banknote },
                ];
            default:
                return [
                    { label: 'Register Patient', to: '/patients/register', icon: Users },
                    { label: 'Consultations', to: '/consultations', icon: Stethoscope },
                    { label: 'Appointments', to: '/appointments', icon: CalendarCheck },
                    { label: 'User Management', to: '/admin/users', icon: FileText },
                ];
        }
    };

    const kpis = getKPIs();
    const quickActions = getQuickActions();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em]">{getRoleGreeting()}, {user.username}</p>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{getRoleTitle()}</h1>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 w-fit">
                    <Activity className="w-3 h-3 text-emerald-500" />
                    System Active
                </div>
            </div>

            {/* KPI Cards */}
            <div className={`grid gap-4 ${kpis.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
                {kpis.map((kpi) => {
                    const colors = colorMap[kpi.color] || colorMap.brand;
                    return (
                        <Link
                            key={kpi.label}
                            to={kpi.link}
                            className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-5 hover:border-brand-500/50 transition-all group shadow-sm relative overflow-hidden active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-between mb-3 relative z-10">
                                <div className={`p-2.5 rounded-xl ${colors.bg}`}>
                                    <kpi.icon className={`w-5 h-5 ${colors.text}`} />
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{kpi.value}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-bold uppercase tracking-wider">{kpi.label}</p>
                            </div>
                            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${colors.bg} opacity-0 group-hover:opacity-20 transition-all blur-2xl`} />
                        </Link>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {quickActions.map((action) => (
                        <Link
                            key={action.label}
                            to={action.to}
                            className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-brand-500/50 p-4 rounded-3xl font-bold text-[11px] text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-all shadow-sm active:scale-95"
                        >
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <action.icon className="w-5 h-5 text-slate-400 group-hover:text-brand-500" />
                            </div>
                            <span className="text-center">{action.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* System Status (super_admin only) */}
            {user.role === 'super_admin' && (
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> System Overview
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-emerald-500/10 rounded-2xl p-4 text-center">
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Online</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">System Status</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-4 text-center">
                            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.total_patients}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Total Records</p>
                        </div>
                        <div className="bg-blue-500/10 rounded-2xl p-4 text-center">
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.active_encounters}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Active Sessions</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
