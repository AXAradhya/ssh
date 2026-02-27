import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Battery, Zap, Clock, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

const SmartEVQueue: React.FC = () => {
    const [schedule, setSchedule] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                // Mock base load and solar from current conditions
                const res = await api.getEVSchedule(850, 150, 5000);
                setSchedule(res.data);
            } catch (e) {
                console.error("Failed to fetch EV schedule", e);
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
        const interval = setInterval(fetchSchedule, 60000); // refresh every minute
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="glass-card p-6 border border-blue-500/20 flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!schedule) return null;

    return (
        <div className="glass-card p-6 border border-blue-500/20">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        <Battery className="w-5 h-5 text-blue-400" />
                        Smart EV Fleet Scheduler
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Active alignment of {schedule.total_evs.toLocaleString()} EV chargers with solar generation
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded inline-flex items-center gap-1 border border-emerald-500/20">
                        <Zap className="w-3 h-3" /> Peak Reduced by {schedule.peak_reduction_pct.toFixed(1)}%
                    </span>
                    <div className="text-xs text-slate-500 mt-1 mt-1 font-mono">
                        {schedule.baseline_peak_mw.toFixed(1)}MW <ArrowRight className="inline w-3 h-3 mx-1" /> {schedule.optimized_peak_mw.toFixed(1)}MW
                    </div>
                </div>
            </div>

            <div className="h-48 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={schedule.schedule} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="optGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="hour"
                            tickFormatter={(h) => `${h}:00`}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}MW`}
                        />
                        <Tooltip
                            contentStyle={{ background: '#0f172a', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                            labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
                            labelFormatter={(l) => `${l}:00`}
                        />

                        {/* Highlight optimal charging window (10am - 3pm) */}
                        <ReferenceLine x={10} stroke="#facc15" strokeDasharray="3 3" opacity={0.3} />
                        <ReferenceLine x={15} stroke="#facc15" strokeDasharray="3 3" opacity={0.3} />

                        <Area
                            type="monotone"
                            dataKey="baseline_mw"
                            name="Unmanaged Demand"
                            stroke="#64748b"
                            fill="url(#baseGrad)"
                            strokeDasharray="4 4"
                            strokeWidth={1}
                        />
                        <Area
                            type="monotone"
                            dataKey="optimized_mw"
                            name="Optimized Charging"
                            stroke="#3b82f6"
                            fill="url(#optGrad)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Next optimal window: 10:00 - 15:00</span>
                </div>
                <div className="flex gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-500"></div> Unmanaged</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Optimized</div>
                </div>
            </div>
        </div>
    );
};

export default SmartEVQueue;
