import React, { useEffect, useState } from 'react';
import { 
    Activity, Search, Filter, Calendar, User, 
    FileText, Shield, AlertCircle, Eye, 
    ArrowLeft, ArrowRight, Loader2, RefreshCw,
    Database, MapPin, Monitor, Users, Contact, X
} from 'lucide-react';
import api from '../api/client';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, Cell
} from 'recharts';

interface AuditLog {
    id: string;
    user_id: string;
    patient_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    ip_address: string;
    user_agent: string | null;
    request_method: string;
    request_url: string;
    request_data: string | null;
    response_status: number | null;
    created_at: string;
    operator_username: string | null;
    operator_name: string | null;
    operator_role: string | null;
    patient_first: string | null;
    patient_last: string | null;
}

interface LogResponse {
    logs: AuditLog[];
    total: number;
    page: number;
    last_page: number;
}

export default function AuditLogs() {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [lastPage, setLastPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    
    

    const [activeTab, setActiveTab] = useState<'logs' | 'staff' | 'patients'>('logs');
    const [staff, setStaff] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [fetchingRecords, setFetchingRecords] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        action: '',
        entity_type: '',
        search: ''
    });
    const [perfData, setPerfData] = useState<any>(null);
    const [perfLoading, setPerfLoading] = useState(true);

    useEffect(() => {
        if (activeTab === 'logs') {
            fetchLogs();
            fetchPerformance();
        } else if (activeTab === 'staff') {
            fetchStaff();
        } else if (activeTab === 'patients') {
            fetchPatients();
        }
    }, [page, filters.action, filters.entity_type, activeTab]);

    const fetchStaff = async () => {
        try {
            setFetchingRecords(true);
            const res = await api.get('/users');
            setStaff(res.data.users || []);
        } catch (err) {
            console.error('Failed to fetch staff', err);
        } finally {
            setFetchingRecords(false);
        }
    };

    const fetchPatients = async () => {
        try {
            setFetchingRecords(true);
            const res = await api.get('/patients');
            setPatients(res.data.patients || []);
        } catch (err) {
            console.error('Failed to fetch patients', err);
        } finally {
            setFetchingRecords(false);
        }
    };

    const fetchPerformance = async () => {
        try {
            setPerfLoading(true);
            const res = await api.get('/reports/performance');
            setPerfData(res.data);
        } catch (err) {
            console.error('Failed to fetch performance stats', err);
        } finally {
            setPerfLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                action: filters.action,
                entity_type: filters.entity_type
            });
            const res = await api.get(`/audit/logs?${params.toString()}`);
            setLogs(res.data.logs);
            setTotal(res.data.total);
            setLastPage(res.data.last_page);
        } catch (err) {
            console.error('Failed to fetch audit logs', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: number | null) => {
        if (!status) return 'bg-slate-500/10 text-slate-500';
        if (status >= 200 && status < 300) return 'bg-emerald-500/10 text-emerald-600';
        if (status >= 400 && status < 500) return 'bg-amber-500/10 text-amber-600';
        return 'bg-rose-500/10 text-rose-600';
    };

    const getActionColor = (action: string) => {
        switch (action.toUpperCase()) {
            case 'CREATE': return 'bg-blue-500/10 text-blue-600';
            case 'UPDATE': return 'bg-indigo-500/10 text-indigo-600';
            case 'DELETE': return 'bg-rose-500/10 text-rose-600';
            case 'READ': return 'bg-slate-500/10 text-slate-500';
            default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600';
        }
    };

    const formatJSON = (json: string | null) => {
        if (!json) return 'No data recorded';
        try {
            const parsed = JSON.parse(json);
            return JSON.stringify(parsed, null, 2);
        } catch (e) {
            return json;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-brand-500" />
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em]">Comprehensive System Repository</p>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Records & Logs</h1>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 w-fit">
                    <Database className="w-3 h-3 text-brand-500" />
                    Total Records: {total.toLocaleString()}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit border border-slate-200 dark:border-slate-700/50">
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'logs' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm border border-slate-200 dark:border-slate-800' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Activity className="w-4 h-4" /> Activity Logs
                </button>
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'staff' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm border border-slate-200 dark:border-slate-800' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Users className="w-4 h-4" /> Staff Records
                </button>
                <button
                    onClick={() => setActiveTab('patients')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'patients' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm border border-slate-200 dark:border-slate-800' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Contact className="w-4 h-4" /> Patient Records
                </button>
            </div>

            {activeTab === 'logs' && (
                <>
                    {/* Performance Overview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <Activity className="w-3 h-3 text-brand-500" /> Revenue Growth
                            </p>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Total Funds Generated</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-brand-600 dark:text-brand-500 tabular-nums">
                                ₦{Number(perfData?.financial?.total_collected || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Received to date</p>
                        </div>
                    </div>
                    
                    <div className="h-[200px] w-full relative z-10" style={{ minHeight: '200px' }}>
                        {perfLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl animate-pulse">
                                <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={perfData?.revenue_trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                        labelStyle={{ display: 'none' }}
                                        formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, 'Revenue']}
                                    />
                                    <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl" />
                </div>

                {/* Visit Chart */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <User className="w-3 h-3 text-emerald-500" /> Clinical Volume
                            </p>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Total Visits</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500 tabular-nums">
                                {Number(perfData?.hospital_stats?.volume?.total_encounters || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last 30 Days</p>
                        </div>
                    </div>
                    
                    <div className="h-[200px] w-full relative z-10" style={{ minHeight: '200px' }}>
                        {perfLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl animate-pulse">
                                <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={perfData?.visit_trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                        labelStyle={{ display: 'none' }}
                                        formatter={(value: any) => [value, 'Visits']}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {(perfData?.visit_trend || []).map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#34d399'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
            </>
        )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={`Search ${activeTab === 'logs' ? 'logs' : activeTab === 'staff' ? 'staff' : 'patients'}...`} 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                </div>
                {activeTab === 'logs' && (
                    <>
                        <select 
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer min-w-[140px]"
                            value={filters.action}
                            onChange={(e) => setFilters({...filters, action: e.target.value})}
                        >
                            <option value="">All Actions</option>
                            <option value="CREATE">Create</option>
                            <option value="READ">Read</option>
                            <option value="UPDATE">Update</option>
                            <option value="DELETE">Delete</option>
                        </select>
                        <select 
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer min-w-[140px]"
                            value={filters.entity_type}
                            onChange={(e) => setFilters({...filters, entity_type: e.target.value})}
                        >
                            <option value="">All Entities</option>
                            <option value="patient">Patient</option>
                            <option value="encounter">Encounter</option>
                            <option value="clinical_note">Clinical Note</option>
                            <option value="medication">Medication</option>
                            <option value="auth">Authentication</option>
                        </select>
                    </>
                )}
                <button 
                    onClick={() => { 
                        if (activeTab === 'logs') { setPage(1); fetchLogs(); }
                        else if (activeTab === 'staff') fetchStaff();
                        else fetchPatients();
                    }}
                    className="p-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20"
                >
                    <RefreshCw className={`w-4 h-4 ${loading || fetchingRecords ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Content Table */}
            <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    {activeTab === 'logs' ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Timestamp</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Operator</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Entity</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-6 py-4 h-16 bg-slate-50/50 dark:bg-slate-800/20" />
                                        </tr>
                                    ))
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                                                    <FileText className="w-8 h-8" />
                                                </div>
                                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No activity logs found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col items-center">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                        {new Date(log.created_at).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        {new Date(log.created_at).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold text-xs shrink-0">
                                                        {log.operator_username?.charAt(0).toUpperCase() || 'S'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                            {log.operator_name || log.operator_username || 'System'}
                                                        </p>
                                                        <p className="text-[10px] text-brand-600 dark:text-brand-500 font-black uppercase tracking-widest truncate">
                                                            {log.operator_role?.replace('_', ' ') || 'Internal'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate">
                                                        {log.entity_type.replace('_', ' ')}
                                                    </p>
                                                    {log.patient_first && (
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                                            Patient: {log.patient_first} {log.patient_last}
                                                        </p>
                                                    )}
                                                    {!log.patient_first && log.entity_id && (
                                                        <p className="text-[10px] text-slate-400 font-mono truncate">
                                                            ID: {log.entity_id.split('-')[0]}...
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(log.response_status)}`}>
                                                    {log.response_status || '---'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button 
                                                    onClick={() => { setSelectedLog(log); setShowDetailModal(true); }}
                                                    className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 rounded-xl transition-all"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : activeTab === 'staff' ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name / Username</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Registered</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {fetchingRecords ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-4 h-16 bg-slate-50/50 dark:bg-slate-800/20" />
                                        </tr>
                                    ))
                                ) : (staff.filter(u => 
                                    (u.full_name || '').toLowerCase().includes(filters.search.toLowerCase()) || 
                                    (u.username || '').toLowerCase().includes(filters.search.toLowerCase()) ||
                                    (u.email || '').toLowerCase().includes(filters.search.toLowerCase())
                                ).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No staff records found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    staff.filter(u => 
                                        (u.full_name || '').toLowerCase().includes(filters.search.toLowerCase()) || 
                                        (u.username || '').toLowerCase().includes(filters.search.toLowerCase())
                                    ).map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-xs">
                                                        {u.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white">{u.full_name || u.username}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium">@{u.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                                                    {u.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-slate-600 dark:text-slate-400">{u.email}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                    {u.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</p>
                                            </td>
                                        </tr>
                                    ))
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name / MRN</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender / DOB</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Info</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Last Visit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {fetchingRecords ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-4 h-16 bg-slate-50/50 dark:bg-slate-800/20" />
                                        </tr>
                                    ))
                                ) : (patients.filter(p => 
                                    `${p.first_name} ${p.last_name}`.toLowerCase().includes(filters.search.toLowerCase()) || 
                                    (p.patient_number || '').toLowerCase().includes(filters.search.toLowerCase())
                                ).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No patient records found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    patients.filter(p => 
                                        `${p.first_name} ${p.last_name}`.toLowerCase().includes(filters.search.toLowerCase()) || 
                                        (p.patient_number || '').toLowerCase().includes(filters.search.toLowerCase())
                                    ).map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4 text-xs">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs uppercase">
                                                        {p.first_name[0]}{p.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white capitalize">{p.first_name} {p.last_name}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono">{p.patient_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">{p.gender}</p>
                                                <p className="text-[10px] text-slate-400">{new Date(p.date_of_birth).toLocaleDateString()}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-slate-600 dark:text-slate-400">{p.phone}</p>
                                                <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{p.email}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Active</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-xs text-slate-500">{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : 'N/A'}</p>
                                            </td>
                                        </tr>
                                    ))
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination (Only for logs) */}
                {activeTab === 'logs' && !loading && logs.length > 0 && (
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            Showing page {page} of {lastPage}
                        </p>
                        <div className="flex items-center gap-2">
                            <button 
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                className="p-2 text-slate-500 hover:text-brand-500 disabled:opacity-30 disabled:hover:text-slate-500 transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <button 
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === pageNum ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button 
                                disabled={page === lastPage}
                                onClick={() => setPage(page + 1)}
                                className="p-2 text-slate-500 hover:text-brand-500 disabled:opacity-30 disabled:hover:text-slate-500 transition-all"
                            >
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-brand-500 rounded-xl text-white shadow-lg shadow-brand-500/20">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight leading-tight">Log Details</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedLog.id}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto space-y-8 scrollbar-slim">
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <RefreshCw className="w-3 h-3" /> Method & URL
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                                            {selectedLog.request_method}
                                        </span>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                                            {selectedLog.request_url}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <MapPin className="w-3 h-3" /> IP Address
                                    </p>
                                    <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                        {selectedLog.ip_address}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Monitor className="w-3 h-3" /> User Agent
                                    </p>
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate max-w-[150px]" title={selectedLog.user_agent || ''}>
                                        {selectedLog.user_agent || 'Unknown'}
                                    </p>
                                </div>
                            </div>

                            {/* Data Section */}
                            <div>
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-brand-500" /> Request Payload
                                </h3>
                                <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                                    <pre className="text-[11px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[300px]">
                                        {formatJSON(selectedLog.request_data)}
                                    </pre>
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-brand-500" />
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-4">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                <p className="text-[11px] text-amber-700 dark:text-amber-500 font-bold leading-relaxed">
                                    This log is a permanent record of system activity. Some sensitive fields like passwords and tokens are automatically redacted for security.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
