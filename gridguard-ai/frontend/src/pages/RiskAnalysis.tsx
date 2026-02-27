import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis
} from 'recharts';
import { AlertTriangle, CheckCircle, Zap, Battery, Car, Factory } from 'lucide-react';
import { api } from '../api/client';
import TransformerTwinWidget from '../components/TransformerTwinWidget';
import PmuMonitorWidget from '../components/PmuMonitorWidget';
import DroneScheduleWidget from '../components/DroneScheduleWidget';

const ICON_MAP: Record<string, any> = {
    demand_response: Factory, ev_management: Car, battery_storage: Battery,
    renewable: Zap, behavioral: CheckCircle,
};

const RiskAnalysis: React.FC = () => {
    const [risk, setRisk] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getPeakRisk().then(r => { setRisk(r.data); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );

    if (!risk) return <div className="text-slate-400">Failed to load risk data.</div>;

    const riskColor = risk.risk_score >= 80 ? '#ff3c3c' : risk.risk_score >= 60 ? '#f97316' : risk.risk_score >= 40 ? '#eab308' : '#00ff88';
    const gaugeData = [{ name: 'risk', value: risk.risk_score, fill: riskColor }];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Peak Risk Analysis</h1>
                <p className="text-slate-400 text-sm mt-1">AI-driven demand risk assessment and optimization recommendations</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Risk Gauge */}
                <div className="glass-card p-6 flex flex-col items-center">
                    <h3 className="font-semibold text-white mb-4">Peak Risk Score</h3>
                    <div className="relative w-48 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart
                                cx="50%" cy="50%"
                                innerRadius="60%" outerRadius="90%"
                                startAngle={210} endAngle={-30}
                                data={gaugeData}
                            >
                                {React.createElement(PolarAngleAxis as any, { type: 'number', domain: [0, 100], angleAxisId: 0, tick: false })}
                                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(255,255,255,0.05)' }} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold" style={{ color: riskColor }}>{risk.risk_score.toFixed(0)}</span>
                            <span className="text-xs text-slate-400">/ 100</span>
                            <span className="text-sm font-semibold mt-1 uppercase tracking-wider" style={{ color: riskColor }}>
                                {risk.risk_level}
                            </span>
                        </div>
                    </div>

                    <div className="w-full mt-4 space-y-2">
                        {[
                            { label: 'Peak Load', val: `${risk.peak_load_mw?.toFixed(0)} MW`, color: '#ff3c3c' },
                            { label: 'Threshold', val: `${risk.threshold_mw?.toFixed(0)} MW`, color: '#64748b' },
                            { label: 'Savings', val: `${risk.estimated_savings_mwh} MWh`, color: '#00ff88' },
                        ].map(i => (
                            <div key={i.label} className="flex justify-between text-sm">
                                <span className="text-slate-400">{i.label}</span>
                                <span className="font-mono font-semibold" style={{ color: i.color }}>{i.val}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Optimization Actions */}
                <div className="glass-card p-6">
                    <h3 className="font-semibold text-white mb-4">Optimization Actions</h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Industrial Reduction', val: `${risk.industrial_reduction_pct?.toFixed(1)}%`, icon: Factory, color: '#f97316' },
                            { label: 'EV Delay', val: `${risk.ev_delay_minutes} min`, icon: Car, color: '#00d4ff' },
                            { label: 'Battery Discharge', val: `${risk.battery_discharge_pct?.toFixed(0)}%`, icon: Battery, color: '#00ff88' },
                        ].map(item => (
                            <motion.div key={item.label} className="flex items-center gap-3 p-3 rounded-xl"
                                style={{ background: `${item.color}10`, border: `1px solid ${item.color}20` }}
                                whileHover={{ scale: 1.02 }}>
                                <item.icon className="w-8 h-8 p-1.5 rounded-lg" style={{ color: item.color, background: `${item.color}20` }} />
                                <div className="flex-1">
                                    <p className="text-xs text-slate-400">{item.label}</p>
                                    <p className="font-bold" style={{ color: item.color }}>{item.val}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Alert Card */}
                <div className="glass-card p-6">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" /> Risk Status
                    </h3>
                    <div className="space-y-3">
                        <div className="p-4 rounded-xl" style={{ background: `${riskColor}10`, border: `1px solid ${riskColor}30` }}>
                            <p className="text-sm font-semibold mb-1" style={{ color: riskColor }}>
                                {risk.risk_level === 'low' ? '✅ System Normal' : risk.risk_level === 'medium' ? '⚠️ Caution Advised' : risk.risk_level === 'high' ? '🔴 High Risk' : '🚨 Critical Alert'}
                            </p>
                            <p className="text-xs text-slate-400">
                                {risk.risk_level === 'low'
                                    ? 'Grid operating within safe parameters. No immediate action required.'
                                    : `Peak demand of ${risk.peak_load_mw?.toFixed(0)} MW detected. Immediate optimization recommended.`}
                            </p>
                        </div>
                        <div className="text-xs text-slate-500">
                            <p>Peak window: {risk.peak_hour?.slice(0, 16)?.replace('T', ' ')} UTC</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Suggestion Cards */}
            <div>
                <h3 className="font-semibold text-white mb-4">Optimization Suggestions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(risk.suggestions || []).map((s: any, i: number) => {
                        const Icon = ICON_MAP[s.type] || Zap;
                        const prioColor = s.priority === 'high' ? '#ff3c3c' : s.priority === 'medium' ? '#f97316' : '#64748b';
                        return (
                            <motion.div key={i} className="glass-card p-4"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }} whileHover={{ scale: 1.02 }}>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${prioColor}20` }}>
                                        <Icon className="w-4 h-4" style={{ color: prioColor }} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                                style={{ background: `${prioColor}20`, color: prioColor }}>
                                                {s.priority.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-300">{s.description}</p>
                                        <p className="text-xs text-slate-500 mt-1">Impact: {s.impact_mw} MW</p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Advanced Phase 5 Widgets */}
            <div className="pt-6 border-t border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Deep Tech Structural Analysis</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <TransformerTwinWidget />
                    <PmuMonitorWidget />
                    <DroneScheduleWidget />
                </div>
            </div>
        </div>
    );
};

export default RiskAnalysis;
