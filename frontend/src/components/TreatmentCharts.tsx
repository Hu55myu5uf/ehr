import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, ReferenceLine
} from 'recharts';
import { Thermometer, Droplets, Activity } from 'lucide-react';

interface MonitoringRecord {
    temp: number;
    bp_sys: number;
    bp_dia: number;
    hr: number;
    intake_ml: number;
    output_ml: number;
    recorded_at: string;
}

interface Props {
    records: MonitoringRecord[];
}

export default function TreatmentCharts({ records }: Props) {
    if (records.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-12 text-center h-[400px] flex flex-col items-center justify-center">
                <Activity className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">No monitoring data available to chart.</p>
                <p className="text-sm text-slate-400 mt-1">Record vitals or IO to see trends.</p>
            </div>
        );
    }

    const chartData = records.map(r => ({
        ...r,
        time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date(r.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
    }));

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Fever Pattern */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Thermometer className="w-5 h-5 text-orange-500" />
                                Fever Pattern
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">Temperature trend (°C)</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis 
                                    dataKey="time" 
                                    tick={{ fontSize: 10, fontWeight: 'bold' }} 
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis 
                                    domain={[35, 42]} 
                                    tick={{ fontSize: 10, fontWeight: 'bold' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <ReferenceLine y={37.5} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Fever', position: 'right', fontSize: 10, fill: '#ef4444' }} />
                                <Line 
                                    type="monotone" 
                                    dataKey="temp" 
                                    stroke="#f97316" 
                                    strokeWidth={4} 
                                    dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Intake/Output */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Droplets className="w-5 h-5 text-blue-500" />
                                Intake & Output
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">Fluid balance (ml)</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis 
                                    dataKey="time" 
                                    tick={{ fontSize: 10, fontWeight: 'bold' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis 
                                    tick={{ fontSize: 10, fontWeight: 'bold' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: 20 }} />
                                <Bar dataKey="intake_ml" name="Intake" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="output_ml" name="Output" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
