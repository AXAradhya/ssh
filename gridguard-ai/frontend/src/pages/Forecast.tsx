import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { Brain, ChevronDown, TrendingUp, Sun, Wind } from 'lucide-react';
import { api } from '../api/client';
import ReportExporter from '../components/ReportExporter';

const Forecast: React.FC = () => {
    const [hours, setHours] = useState(24);
    const [loadData, setLoadData] = useState<any>(null);
    const [renewableData, setRenewableData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async (h: number) => {
        setLoading(true);
        try {
            const [ld, rd] = await Promise.all([
                api.getLoadForecast(h),
                api.getRenewableForecast(h),
            ]);
            setLoadData(ld.data);
            setRenewableData(rd.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(hours); }, [hours]);

    const chartData = (loadData?.forecasts || []).map((f: any, i: number) => {
        const r = renewableData?.forecasts?.[i];
        return {
            time: f.timestamp.slice(11, 16),
            load: f.load_mw,
            upper: f.confidence_upper,
            lower: f.confidence_lower,
            solar: f.solar_mw,
            wind: f.wind_mw,
            renewable: (f.solar_mw || 0) + (f.wind_mw || 0),
            isPeak: f.is_peak,
        };
    });

    return (
        <div id="forecast-root" className="space-y-6">
            <div className="flex items-center justify-between no-export">
                <div>
                    <h1 className="text-2xl font-bold text-white">Load Forecast</h1>
                    <p className="text-slate-400 text-sm mt-1">XGBoost AI-powered demand prediction with confidence intervals</p>
                </div>
                <div className="flex gap-4 items-center">
                    <ReportExporter targetId="forecast-root" filename={`GridGuard_Forecast_${hours}h`} />
                    <div className="flex gap-2">
                        {[24, 48, 72].map(h => (
                            <motion.button
                                key={h}
                                onClick={() => setHours(h)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${hours === h ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                {h}h
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Max Load', value: `${loadData?.max_load_mw?.toFixed(0)} MW`, color: '#ff3c3c' },
                    { label: 'Avg Load', value: `${loadData?.avg_load_mw?.toFixed(0)} MW`, color: '#00d4ff' },
                    { label: 'Min Load', value: `${loadData?.min_load_mw?.toFixed(0)} MW`, color: '#00ff88' },
                    { label: 'Peak Hours', value: `${loadData?.peak_count || 0}`, color: '#f97316' },
                ].map(item => (
                    <motion.div key={item.label} className="glass-card p-4 text-center"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                        <p className="text-2xl font-bold font-mono" style={{ color: item.color }}>{item.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Load Forecast Chart */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-400" />
                    Hourly Load Forecast — Next {hours} Hours
                </h3>
                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="loadGrad2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} interval={hours === 24 ? 2 : hours === 48 ? 5 : 7} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} />
                            <Tooltip
                                contentStyle={{ background: 'rgba(13,18,36,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10, color: '#e2e8f0' }}
                                formatter={(v: any, name: string | undefined) => [`${Number(v).toFixed(1)} MW`, name ?? '']}
                            />
                            <ReferenceLine y={480} stroke="#ff3c3c" strokeDasharray="5 5" label={{ value: 'Peak Threshold', fill: '#ff3c3c', fontSize: 11 }} />
                            <Area type="monotone" dataKey="upper" stroke="none" fill="url(#ciGrad)" name="Upper CI" stackId="ci" />
                            <Area type="monotone" dataKey="load" stroke="#00d4ff" fill="url(#loadGrad2)" strokeWidth={2.5} name="Load (MW)" dot={false} />
                            <Area type="monotone" dataKey="lower" stroke="none" fill="#0a0e1f" name="Lower CI" stackId="ci2" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Renewable vs Demand */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-yellow-400" />
                    <Wind className="w-4 h-4 text-green-400" />
                    Renewable Generation vs Demand
                </h3>
                <p className="text-xs text-slate-500 mb-4">Solar + Wind contribution against grid demand</p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {[
                        { label: 'Avg Solar', val: `${renewableData?.avg_solar_mw?.toFixed(1)} MW`, color: '#eab308' },
                        { label: 'Avg Wind', val: `${renewableData?.avg_wind_mw?.toFixed(1)} MW`, color: '#00ff88' },
                        { label: 'Carbon Saved', val: `${renewableData?.carbon_saved_tonnes?.toFixed(1)}t`, color: '#a855f7' },
                    ].map(s => (
                        <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: `${s.color}10` }}>
                            <p className="text-xs text-slate-400">{s.label}</p>
                            <p className="font-bold mt-0.5" style={{ color: s.color }}>{s.val}</p>
                        </div>
                    ))}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData.filter((_: any, i: number) => i % (hours === 24 ? 1 : 2) === 0)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: 'rgba(13,18,36,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10, color: '#e2e8f0' }} />
                        <Legend />
                        <Bar dataKey="solar" fill="#eab308" name="Solar (MW)" radius={[4, 4, 0, 0]} opacity={0.85} />
                        <Bar dataKey="wind" fill="#00ff88" name="Wind (MW)" radius={[4, 4, 0, 0]} opacity={0.85} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Forecast;
