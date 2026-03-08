import React, { useEffect, useState, useCallback } from 'react';
import { 
    TrendingUp, 
    BarChart3, 
    ArrowUpRight, 
    Activity, 
    Calendar,
    Wallet,
    Banknote,
    CheckCircle2,
    Clock,
    ArrowDownRight,
    Loader2,
    Download,
    Printer,
    Filter,
    X,
    Search,
    FileText,
    Activity as ActivityIcon,
    Users,
    Bed as BedIcon
} from 'lucide-react';
import api from '../api/client';

interface Overview {
    total_revenue: number;
    total_collected: number;
    total_pending: number;
    total_bills: number;
    paid_bills: number;
}

interface SectionRevenue {
    section: string;
    generated_revenue: number;
}

interface TrendData {
    date: string;
    amount: number;
}

interface Transaction {
    id: string;
    bill_number: string;
    patient_first: string;
    patient_last: string;
    total_amount: number;
    paid_at: string;
    payment_method: string;
}

export default function FundsStatistics() {
    const [data, setData] = useState<{
        overview: Overview;
        sections: SectionRevenue[];
        trend: TrendData[];
        recent_transactions: Transaction[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Comprehensive Report State
    const [showReport, setShowReport] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [generating, setGenerating] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const res = await api.get('/reports/funds-statistics', { params });
            setData(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load financial data');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleClearFilters = () => {
        setStartDate('');
        setEndDate('');
    };

    const exportToCSV = () => {
        if (!data) return;
        
        const headers = ["Bill Number", "Patient", "Method", "Date", "Amount"];
        const rows = data.recent_transactions.map(tx => [
            tx.bill_number,
            `${tx.patient_first} ${tx.patient_last}`,
            tx.payment_method,
            new Date(tx.paid_at).toLocaleDateString(),
            tx.total_amount
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `financial_report_${startDate || 'all'}_to_${endDate || 'now'}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchComprehensiveReport = async () => {
        try {
            setGenerating(true);
            const res = await api.get('/reports/comprehensive');
            setReportData(res.data);
            setShowReport(true);
        } catch (err) {
            console.error('Failed to fetch comprehensive report:', err);
        } finally {
            setGenerating(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading && !data) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Generating financial reports...</p>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="p-8 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-3xl text-center">
                <p className="text-red-600 dark:text-red-400 font-bold">{error || 'Access Denied'}</p>
                <button 
                    onClick={fetchData}
                    className="mt-4 px-6 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const { overview, sections, trend, recent_transactions } = data!;
    const collectionRate = overview.total_revenue > 0 
        ? (overview.total_collected / overview.total_revenue) * 100 
        : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Print Only Header */}
            <div className="hidden print:block mb-8 text-center border-b pb-6">
                <h1 className="text-3xl font-bold uppercase tracking-widest text-slate-900">Hospital Financial Report</h1>
                <p className="text-slate-500 font-medium mt-2">
                    Period: {startDate || 'Beginning'} — {endDate || 'Present'}
                </p>
                <p className="text-xs text-slate-400 mt-1 italic">Generated on {new Date().toLocaleString()}</p>
            </div>

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Funds Statistics</h1>
                    <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
                        <Activity className="w-4 h-4 text-brand-500" />
                        Comprehensive revenue breakdown and performance metrics
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl transition-all shadow-lg shadow-brand-600/20 text-sm font-bold"
                    >
                        <Download className="w-4 h-4" />
                        Export Excel
                    </button>
                    <button 
                        onClick={fetchComprehensiveReport}
                        disabled={generating}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold text-sm shadow-xl shadow-slate-900/10 disabled:opacity-50"
                    >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Comprehensive Report
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold text-sm shadow-sm"
                    >
                        <Printer className="w-4 h-4" />
                        Print PDF
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-6 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <Filter className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Filters</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 flex-1">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Start Date</label>
                        <input 
                            type="date" 
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">End Date</label>
                        <input 
                            type="date" 
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                {(startDate || endDate) && (
                    <button 
                        onClick={handleClearFilters}
                        className="flex items-center gap-2 text-red-500 hover:text-red-600 font-bold text-sm px-4 py-2 bg-red-50 dark:bg-red-500/10 rounded-xl transition-all"
                    >
                        <X className="w-4 h-4" />
                        Clear
                    </button>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Revenue" 
                    value={`₦${Number(overview.total_revenue).toLocaleString()}`}
                    icon={Banknote}
                    trend="+12.5%"
                    color="brand"
                />
                <StatCard 
                    title="Liquid Funds" 
                    value={`₦${Number(overview.total_collected).toLocaleString()}`}
                    icon={Wallet}
                    trend={`${collectionRate.toFixed(1)}% Rate`}
                    color="emerald"
                />
                <StatCard 
                    title="Outstanding" 
                    value={`₦${Number(overview.total_pending).toLocaleString()}`}
                    icon={Clock}
                    trend="Needs Review"
                    color="amber"
                />
                <StatCard 
                    title="Bill Efficiency" 
                    value={`${overview.paid_bills}/${overview.total_bills}`}
                    icon={CheckCircle2}
                    trend="Settled Orders"
                    color="indigo"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Breakdown */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Revenue Source</h2>
                        <BarChart3 className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="space-y-6">
                        {sections.length > 0 ? sections.map((s, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{s.section.replace('_', ' ')}</span>
                                    <span className="font-black text-slate-900 dark:text-white">₦{Number(s.generated_revenue).toLocaleString()}</span>
                                </div>
                                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-brand-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${overview.total_collected > 0 ? (s.generated_revenue / overview.total_collected) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        )) : (
                            <p className="text-center py-10 text-slate-400 italic">No revenue data available.</p>
                        )}
                    </div>
                </div>

                {/* Performance Chart Placeholder/Trend */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden print:hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Revenue Trend</h2>
                            <p className="text-sm text-slate-500">Daily collection performance</p>
                        </div>
                        <TrendingUp className="w-5 h-5 text-brand-500" />
                    </div>
                    
                    <div className="h-64 flex items-end justify-between gap-2">
                        {trend.length > 0 ? trend.map((t, idx) => (
                            <div key={idx} className="flex-1 group relative">
                                <div 
                                    className="w-full bg-brand-500/20 group-hover:bg-brand-500/40 rounded-t-lg transition-all duration-500 cursor-pointer"
                                    style={{ height: `${(t.amount / Math.max(...trend.map(x => x.amount), 1)) * 100}%` }}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                        ₦{Number(t.amount).toLocaleString()}
                                    </div>
                                </div>
                                <div className="h-1 mt-2 bg-slate-100 dark:bg-slate-800 rounded-full" />
                            </div>
                        )) : (
                            <div className="w-full h-full flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                                <p className="text-slate-400 italic">Insufficient data for trend analysis</p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        <span>{trend[0]?.date || 'Start'}</span>
                        <span>{trend[Math.floor(trend.length/2)]?.date}</span>
                        <span>{trend[trend.length-1]?.date || 'End'}</span>
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm page-break-before">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Recent Settlements</h2>
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400 px-3 py-1 bg-brand-50 dark:bg-brand-500/10 rounded-full print:hidden">LIVE FEED</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-8 py-5">Reference</th>
                                <th className="px-8 py-5">Patient</th>
                                <th className="px-8 py-5">Method</th>
                                <th className="px-8 py-5">Date</th>
                                <th className="px-8 py-5 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {recent_transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all cursor-default">
                                    <td className="px-8 py-5 font-mono text-sm text-brand-600 dark:text-brand-500">{tx.bill_number}</td>
                                    <td className="px-8 py-5 font-bold text-slate-900 dark:text-white">
                                        {tx.patient_first} {tx.patient_last}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{tx.payment_method}</span>
                                    </td>
                                    <td className="px-8 py-5 text-sm text-slate-500">
                                        {new Date(tx.paid_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-white">
                                        ₦{Number(tx.total_amount).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Comprehensive Report Modal */}
            {showReport && reportData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-950 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800">
                        {/* Modal Header */}
                        <div className="sticky top-0 z-10 bg-white dark:bg-slate-950/80 backdrop-blur-md p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-500 rounded-2xl text-white shadow-lg shadow-brand-500/20">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Hospital Activity Report</h2>
                                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        As of {new Date(reportData.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-500 transition-all shadow-lg shadow-brand-600/20"
                                >
                                    <Printer className="w-4 h-4" />
                                    Export PDF
                                </button>
                                <button 
                                    onClick={() => setShowReport(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                >
                                    <X className="w-8 h-8 rotate-45" />
                                </button>
                            </div>
                        </div>

                        {/* Report Content */}
                        <div className="p-10 space-y-12 print:p-0">
                            {/* Summary Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <ReportStat 
                                    icon={Users}
                                    label="Total Registered Patients"
                                    value={reportData.patients?.total || 0}
                                    subtext={`${reportData.patients?.males || 0} Males • ${reportData.patients?.females || 0} Females`}
                                    color="brand"
                                />
                                <ReportStat 
                                    icon={ActivityIcon}
                                    label="Current Inpatients"
                                    value={reportData.admissions?.current_inpatients || 0}
                                    subtext={`${reportData.admissions?.occupied_beds || 0}/${reportData.admissions?.total_beds || 0} Beds Occupied`}
                                    color="emerald"
                                />
                                <ReportStat 
                                    icon={TrendingUp}
                                    label="30-Day Activity"
                                    value={reportData.volume?.total_encounters || 0}
                                    subtext={`${reportData.volume?.total_labs || 0} Lab Investigations`}
                                    color="indigo"
                                />
                            </div>

                            {/* Detailed Sections */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Demographics Table */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Users className="w-4 h-4 text-brand-500" />
                                        Patient Demographics
                                    </h3>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                                                <tr className="py-3">
                                                    <td className="py-4 font-bold text-slate-500">Total Patients</td>
                                                    <td className="py-4 text-right font-black text-slate-900 dark:text-white">{reportData.patients?.total || 0}</td>
                                                </tr>
                                                <tr className="py-3">
                                                    <td className="py-4 font-bold text-slate-500">Male Patients</td>
                                                    <td className="py-4 text-right font-black text-slate-900 dark:text-white">{reportData.patients?.males || 0}</td>
                                                </tr>
                                                <tr className="py-3">
                                                    <td className="py-4 font-bold text-slate-500">Female Patients</td>
                                                    <td className="py-4 text-right font-black text-slate-900 dark:text-white">{reportData.patients?.females || 0}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Facility Utilization */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                        <BedIcon className="w-4 h-4 text-brand-500" />
                                        Facility Utilization
                                    </h3>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                                                <tr className="py-3">
                                                    <td className="py-4 font-bold text-slate-500">Inpatient Encounters (Active)</td>
                                                    <td className="py-4 text-right font-black text-slate-900 dark:text-white">{reportData.admissions?.current_inpatients || 0}</td>
                                                </tr>
                                                <tr className="py-3">
                                                    <td className="py-4 font-bold text-slate-500">Occupied Ward Beds</td>
                                                    <td className="py-4 text-right font-black text-slate-900 dark:text-white">{reportData.admissions?.occupied_beds || 0}</td>
                                                </tr>
                                                <tr className="py-3">
                                                    <td className="py-4 font-bold text-slate-500">Total Ward Capacity</td>
                                                    <td className="py-4 text-right font-black text-slate-900 dark:text-white">{reportData.admissions?.total_beds || 0}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Clinical Volume */}
                            <div className="space-y-6">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                    <ActivityIcon className="w-4 h-4 text-emerald-500" />
                                    Clinical Throughput (Last 30 Days)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Visits</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">{reportData.volume?.total_encounters || 0}</p>
                                    </div>
                                    <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Investigations</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">{reportData.volume?.total_labs || 0}</p>
                                    </div>
                                    <div className="p-6 bg-brand-500/5 border border-brand-500/10 rounded-2xl">
                                        <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1">Appointments</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">{reportData.volume?.total_appointments || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body {
                        background: white !important;
                        padding: 0 !important;
                    }
                    .h-full, .max-h-[90vh], .overflow-y-auto {
                        height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .rounded-[2.5rem], .rounded-[2rem], .rounded-3xl {
                        border-radius: 0.5rem !important;
                        border-color: #e2e8f0 !important;
                    }
                    .shadow-sm, .shadow-lg {
                        box-shadow: none !important;
                    }
                    .page-break-before {
                        page-break-before: always;
                    }
                    table {
                        width: 100% !important;
                    }
                    th, td {
                        padding: 12px 8px !important;
                    }
                }
            ` }} />
        </div>
    );
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
    const colorClasses: any = {
        brand: 'bg-brand-600 text-white shadow-brand-600/20',
        emerald: 'bg-emerald-500 text-white shadow-emerald-500/20',
        amber: 'bg-amber-500 text-white shadow-amber-500/20',
        indigo: 'bg-indigo-600 text-white shadow-indigo-600/20'
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 relative group overflow-hidden">
            <div className={`p-4 rounded-2xl w-fit mb-6 ${colorClasses[color]} shadow-lg transition-transform group-hover:scale-110 duration-500 print:text-black print:bg-slate-100 print:shadow-none`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white print:text-black">{value}</p>
            </div>
            <div className="mt-4 flex items-center gap-2 print:hidden">
                <div className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded ${color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-600'}`}>
                    {color === 'amber' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                    {trend}
                </div>
            </div>
        </div>
    );
}

function ReportStat({ icon: Icon, label, value, subtext, color }: any) {
    const colors: any = {
        brand: 'bg-brand-500 text-brand-500',
        emerald: 'bg-emerald-500 text-emerald-500',
        indigo: 'bg-indigo-500 text-indigo-500'
    };

    return (
        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] space-y-4">
            <div className={`w-12 h-12 rounded-2xl ${colors[color].replace('text-', 'bg-')}/10 flex items-center justify-center ${colors[color].split(' ')[1]}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{value}</p>
                <p className="text-xs font-bold text-slate-400 mt-1">{subtext}</p>
            </div>
        </div>
    );
}
