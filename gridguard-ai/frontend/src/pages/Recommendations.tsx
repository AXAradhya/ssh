import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Brain, Lightbulb, Factory, Car, Battery, Sun, Thermometer } from 'lucide-react';
import { api } from '../api/client';

const ICON_MAP: Record<string, any> = {
    demand_response: Factory, ev_management: Car, storage: Battery,
    renewable: Sun, behavioral: Thermometer,
};

const Recommendations: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [shap, setShap] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.getRecommendations(), api.getShapExplanation()])
            .then(([r, s]) => { setData(r.data); setShap(s.data); })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );

    const shapChartData = (shap?.top_features || []).map((f: any) => ({
        feature: f.feature,
        importance: f.importance,
        direction: f.direction,
    }));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">AI Recommendations</h1>
                <p className="text-slate-400 text-sm mt-1">SHAP-driven explainable AI insights and optimization actions</p>
            </div>

            {/* AI Explanation Banner */}
            {shap && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5 border-neon">
                    <div className="flex items-start gap-3">
                        <Brain className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#a855f7' }} />
                        <div>
                            <h3 className="font-semibold text-white mb-1">AI Explanation</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">{shap.explanation_text}</p>
                            <p className="text-xs text-slate-500 mt-2">Model confidence: {(shap.model_confidence * 100).toFixed(1)}%</p>
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* SHAP Chart */}
                <div className="glass-card p-6">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-400" /> Feature Importance (SHAP)
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={shapChartData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis dataKey="feature" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={130} />
                            <Tooltip
                                contentStyle={{ background: 'rgba(13,18,36,0.95)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 10, color: '#e2e8f0' }}
                                formatter={(v: any) => [`${Number(v).toFixed(3)}`, 'SHAP Impact']}
                            />
                            <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
                                {shapChartData.map((entry: any, index: number) => (
                                    <Cell key={index} fill={entry.direction === 'positive' ? '#00d4ff' : '#a855f7'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> Increases load</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-400 inline-block" /> Reduces load</span>
                    </div>
                </div>

                {/* Savings Summary */}
                <div className="glass-card p-6">
                    <h3 className="font-semibold text-white mb-4">Optimization Impact</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                            <p className="text-xs text-slate-400">Total Impact</p>
                            <p className="text-2xl font-bold text-green-400">{data?.total_impact_mw} MW</p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <p className="text-xs text-slate-400">Cost Savings</p>
                            <p className="text-2xl font-bold text-blue-400">${data?.total_savings_usd?.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {(data?.recommendations || []).map((r: any) => (
                            <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/5">
                                <span className="text-sm text-slate-300 truncate">{r.title}</span>
                                <span className="text-sm font-mono text-green-400 ml-2">↓{r.impact_mw} MW</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recommendation Cards */}
            <div>
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400" /> Action Recommendations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(data?.recommendations || []).map((rec: any, i: number) => {
                        const Icon = ICON_MAP[rec.category] || Lightbulb;
                        const prioColor = rec.priority === 'high' ? '#ff3c3c' : rec.priority === 'medium' ? '#f97316' : '#64748b';
                        return (
                            <motion.div key={rec.id} className="glass-card p-5"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }} whileHover={{ scale: 1.02 }}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-lg" style={{ background: `${prioColor}20` }}>
                                        <Icon className="w-5 h-5" style={{ color: prioColor }} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-white">{rec.title}</h4>
                                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${prioColor}20`, color: prioColor }}>
                                            {rec.priority}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">{rec.description}</p>
                                <div className="flex justify-between mt-3 pt-3 border-t border-white/5 text-xs">
                                    <span className="text-slate-500">Impact: <span className="text-green-400 font-mono">{rec.impact_mw} MW</span></span>
                                    <span className="text-slate-500">Saves: <span className="text-blue-400 font-mono">${rec.cost_savings_usd}</span></span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Recommendations;
