import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Sliders, Thermometer, Factory, Wind, Loader2 } from 'lucide-react';
import { api } from '../api/client';

interface Slider { label: string; key: keyof SimParams; min: number; max: number; step: number; unit: string; icon: any; color: string; }

interface SimParams {
    temperature_delta: number;
    industrial_usage_delta_pct: number;
    renewable_boost_pct: number;
    hours: number;
}

const SLIDERS: Slider[] = [
    { label: 'Temperature Offset', key: 'temperature_delta', min: -10, max: 10, step: 0.5, unit: '°C', icon: Thermometer, color: '#f97316' },
    { label: 'Industrial Usage', key: 'industrial_usage_delta_pct', min: -30, max: 30, step: 1, unit: '%', icon: Factory, color: '#00d4ff' },
    { label: 'Renewable Boost', key: 'renewable_boost_pct', min: -50, max: 50, step: 1, unit: '%', icon: Wind, color: '#00ff88' },
];

const WhatIfSimulator: React.FC = () => {
    const [params, setParams] = useState<SimParams>({ temperature_delta: 0, industrial_usage_delta_pct: 0, renewable_boost_pct: 0, hours: 24 });
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const runSimulation = useCallback(async (p: SimParams) => {
        setLoading(true);
        try {
            const r = await api.whatIf(p);
            setResult(r.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced automatic simulation execution
    useEffect(() => {
        const timeout = setTimeout(() => {
            runSimulation(params);
        }, 300); // 300ms sweet spot for real-time feel

        return () => clearTimeout(timeout);
    }, [params, runSimulation]);

    const handleChange = (key: keyof SimParams, val: number) => {
        const newParams = { ...params, [key]: val };
        setParams(newParams);
    };

    const chartData = result ? result.baseline_forecasts.map((b: any, i: number) => ({
        time: b.timestamp.slice(11, 16),
        baseline: b.load_mw,
        simulated: result.simulated_forecasts[i]?.load_mw,
    })) : [];

    const deltaColor = result?.delta_avg_mw > 0 ? '#ff3c3c' : '#00ff88';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">What-If Simulator</h1>
                    <p className="text-slate-400 text-sm mt-1">Drag parameters to instantly recalculate grid dynamics</p>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-blue-400 text-sm glass-card px-4 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-semibold">Simulating scenario...</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="glass-card p-6 space-y-6 border border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
                    <h3 className="font-semibold text-white flex items-center gap-2 relative z-10">
                        <Sliders className="w-4 h-4 text-blue-400" /> Scenario Parameters
                    </h3>

                    <div className="space-y-8 relative z-10">
                        {SLIDERS.map(sl => (
                            <div key={sl.key} className="group">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm text-slate-300 flex items-center gap-2 transition-colors group-hover:text-white">
                                        <sl.icon className="w-4 h-4" style={{ color: sl.color }} />
                                        {sl.label}
                                    </label>
                                    <span className="font-mono text-base font-bold px-2 py-0.5 rounded backdrop-blur-md border border-white/10 shadow-lg" style={{ color: sl.color, backgroundColor: `${sl.color}20` }}>
                                        {params[sl.key] > 0 ? '+' : ''}{params[sl.key]}{sl.unit}
                                    </span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="range"
                                        min={sl.min} max={sl.max} step={sl.step}
                                        value={params[sl.key] as number}
                                        onChange={e => handleChange(sl.key, parseFloat(e.target.value))}
                                        className="w-full h-2 rounded-lg appearance-none cursor-pointer range-slider bg-white/10 hover:bg-white/20 transition-all border border-white/5"
                                        style={{ accentColor: sl.color }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                                    <span>{sl.min}{sl.unit}</span>
                                    <span>{sl.max}{sl.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-white/10 relative z-10">
                        <label className="text-sm text-slate-300 mb-3 block">Forecast Horizon</label>
                        <div className="flex gap-2">
                            {[24, 48, 72].map(h => (
                                <button key={h}
                                    onClick={() => setParams(p => ({ ...p, hours: h }))}
                                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${params.hours === h ? 'btn-primary shadow-[0_0_15px_rgba(0,212,255,0.4)]' : 'btn-secondary border-white/10 hover:border-white/30'}`}>
                                    {h}h
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={() => setParams({ temperature_delta: 0, industrial_usage_delta_pct: 0, renewable_boost_pct: 0, hours: 24 })}
                        className="btn-secondary w-full py-2.5 text-sm mt-4 relative z-10 border border-white/10 hover:bg-white/5 transition-colors">
                        Reset to Baseline
                    </button>
                </div>

                {/* Result Panel */}
                <div className="lg:col-span-2 space-y-4">
                    <AnimatePresence mode="wait">
                        {result ? (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                {/* Summary Banner */}
                                <div className={`p-4 rounded-xl border ${result.delta_avg_mw > 0 ? 'bg-red-500/10 border-red-500/20 shadow-[0_0_30px_rgba(255,60,60,0.1)]' : 'bg-green-500/10 border-green-500/20 shadow-[0_0_30px_rgba(0,255,136,0.1)]'}`}>
                                    <p className="text-sm text-slate-200 font-medium leading-relaxed">{result.summary}</p>
                                </div>

                                {/* Delta Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Avg Δ Load', val: `${result.delta_avg_mw > 0 ? '+' : ''}${result.delta_avg_mw.toFixed(1)} MW`, color: deltaColor, bg: deltaColor },
                                        { label: 'Peak Δ', val: `${result.delta_peak_mw > 0 ? '+' : ''}${result.delta_peak_mw.toFixed(1)} MW`, color: deltaColor, bg: deltaColor },
                                        { label: 'New Risk Score', val: `${result.new_risk_score.toFixed(0)}/100`, color: result.new_risk_score >= 60 ? '#ff3c3c' : '#00ff88', bg: result.new_risk_score >= 60 ? '#ff3c3c' : '#00ff88' },
                                        { label: 'CO₂ Impact', val: `${result.carbon_impact_tonnes > 0 ? '+' : ''}${result.carbon_impact_tonnes.toFixed(2)}t`, color: result.carbon_impact_tonnes <= 0 ? '#00ff88' : '#ff3c3c', bg: result.carbon_impact_tonnes <= 0 ? '#00ff88' : '#ff3c3c' },
                                    ].map((c, i) => (
                                        <motion.div
                                            key={c.label}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="glass-card p-4 text-center border relative overflow-hidden"
                                            style={{ borderColor: `${c.bg}20` }}
                                        >
                                            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundColor: c.bg }} />
                                            <p className="text-xs text-slate-400 font-medium tracking-wide relative z-10">{c.label}</p>
                                            <p className="font-bold font-mono mt-2 text-xl relative z-10" style={{ color: c.color, textShadow: `0 0 10px ${c.color}60` }}>{c.val}</p>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Comparison Chart */}
                                <div className="glass-card p-6 border border-white/5">
                                    <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                        Interactive Scenario Comparison
                                    </h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.5} />
                                                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.0} />
                                                </linearGradient>
                                                <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} interval={params.hours > 24 ? 3 : 1} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} axisLine={false} tickLine={false} dx={-10} />
                                            <Tooltip
                                                contentStyle={{ background: 'rgba(13,18,36,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', color: '#e2e8f0' }}
                                                itemStyle={{ fontWeight: 600 }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="circle" />
                                            <Area type="monotone" dataKey="baseline" stroke="#64748b" fill="url(#baseGrad)" strokeWidth={2} name="Baseline (MW)" strokeDasharray="4 4" />
                                            <Area type="monotone" dataKey="simulated" stroke="#00d4ff" fill="url(#simGrad)" strokeWidth={3} name="Simulated (MW)" activeDot={{ r: 6, strokeWidth: 0, fill: '#00d4ff', style: { filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.8))' } }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="empty" className="glass-card flex items-center justify-center h-full min-h-[500px] flex-col gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                    {loading ? <Loader2 className="w-10 h-10 text-blue-400 animate-spin" /> : <Sliders className="w-10 h-10 text-blue-400" />}
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-semibold text-white mb-2">{loading ? "Simulating Grid Scenario..." : "Ready to Simulate"}</h3>
                                    <p className="text-slate-400 text-sm max-w-sm mx-auto">
                                        Drag the controls on the left to adjust temperature, industrial usage, or renewable output. The AI will instantly recalculate grid dynamics.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default WhatIfSimulator;
