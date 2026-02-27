import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    Zap, TrendingUp, Activity, DollarSign, Wifi, WifiOff, AlertCircle, BatteryCharging
} from 'lucide-react';
import { api } from '../api/client';
import MetricCard from '../components/MetricCard';
import GridMap from '../components/GridMap';
import ReportExporter from '../components/ReportExporter';
import AgentNegotiation from '../components/AgentNegotiation';
import EnergyLedger from '../components/EnergyLedger';
import AiChat from '../components/AiChat';
import SmartEVQueue from '../components/SmartEVQueue';
import SecurityRadar from '../components/SecurityRadar';
import MarketBidding from '../components/MarketBidding';
import GridTopology from '../components/GridTopology';

interface LiveData { current_load_mw: number; solar_mw: number; wind_mw: number; frequency_hz: number; risk_score: number; }
interface Anomaly { timestamp: string; load_mw: number; z_score: number; type: string; severity: string; }

const Dashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<any>(null);
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [livePrice, setLivePrice] = useState<any>(null);
    const [physics, setPhysics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [liveData, setLiveData] = useState<LiveData | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        let advInterval: NodeJS.Timeout;

        const fetchDashboardData = async () => {
            try {
                const [dashRes, anomRes] = await Promise.all([
                    api.getDashboard(),
                    api.getAnomalies(24)
                ]);
                setMetrics(dashRes.data);
                if (anomRes.data && anomRes.data.anomalies) {
                    setAnomalies(anomRes.data.anomalies);
                } else {
                    setAnomalies([]);
                }
                setLoading(false);
            } catch (e) {
                setLoading(false);
            }
        };

        // Periodic fetch for advanced metrics
        const fetchAdvanced = async () => {
            try {
                const load = 850; // Use static baseline, updated visually by ws
                const solar = 150;
                const wind = 80;
                const renewablePct = (solar + wind) / load;

                const [priceRes, physRes] = await Promise.all([
                    api.getLivePrice(load, renewablePct),
                    api.getGridPhysics(load, solar, wind, 1)
                ]);
                setLivePrice(priceRes.data);
                setPhysics(physRes.data);
            } catch (e) { }
        };

        fetchDashboardData();
        fetchAdvanced();
        advInterval = setInterval(fetchAdvanced, 15000);

        // WebSocket live updates
        const WS_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace('http', 'ws');
        try {
            const ws = new WebSocket(`${WS_URL}/ws/live`);
            wsRef.current = ws;
            ws.onopen = () => setWsConnected(true);
            ws.onmessage = (e) => {
                try { const d = JSON.parse(e.data); setLiveData(d); } catch { }
            };
            ws.onclose = () => setWsConnected(false);
            ws.onerror = () => setWsConnected(false);
        } catch { }

        return () => {
            wsRef.current?.close();
            clearInterval(advInterval);
        };
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );

    const currentLoad = liveData?.current_load_mw ?? metrics?.current_load_mw ?? 0;
    const capacity = metrics?.peak_capacity_mw ?? 1150;
    const riskScore = liveData?.risk_score ?? 0;
    const riskColor = riskScore >= 80 ? '#ff3c3c' : riskScore >= 60 ? '#f97316' : riskScore >= 40 ? '#eab308' : '#00ff88';

    return (
        <div id="dashboard-root" className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between no-export">
                <div>
                    <h1 className="text-2xl font-bold text-white">Grid Control Center</h1>
                    <p className="text-slate-400 text-sm mt-1">Real-time smart grid monitoring & optimization</p>
                </div>
                <div className="flex items-center gap-4">
                    <ReportExporter targetId="dashboard-root" filename="GridGuard_Dashboard_Report" />
                    <div className="flex items-center gap-2 glass-card px-4 py-2 text-sm">
                        {wsConnected
                            ? <><Wifi className="w-4 h-4 text-green-400" /><span className="text-green-400">Live</span></>
                            : <><WifiOff className="w-4 h-4 text-red-400" /><span className="text-red-400">Offline</span></>
                        }
                    </div>
                </div>
            </div>

            {/* AI Agent Negotiation Overlay */}
            <AgentNegotiation currentLoadMw={currentLoad} capacityMw={capacity} />

            {/* Live Metrics Strip */}
            {liveData && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
                >
                    <MetricCard
                        title="Current Load"
                        value={`${liveData.current_load_mw.toFixed(1)} MW`}
                        trend={liveData.current_load_mw > capacity * 0.8 ? "up" : "stable"}
                        icon={<Zap className="w-5 h-5" />}
                        color={liveData.current_load_mw > capacity * 0.9 ? 'border-red-500/50 shadow-[0_0_15px_rgba(255,0,0,0.2)]' : 'border-blue-500/20'}
                        subtitle={`${((liveData.current_load_mw / capacity) * 100).toFixed(1)}% cap`}
                    />

                    <MetricCard
                        title="Total Renewable"
                        value={`${(liveData.solar_mw + liveData.wind_mw).toFixed(1)} MW`}
                        trend="up"
                        subtitle={`${(((liveData.solar_mw + liveData.wind_mw) / liveData.current_load_mw) * 100).toFixed(1)}% mix`}
                        icon={<TrendingUp className="w-5 h-5" />}
                        color="border-green-500/20"
                    />

                    <MetricCard
                        title="System Risk Score"
                        value={liveData.risk_score.toFixed(0)}
                        trend={liveData.risk_score > 50 ? "up" : "down"}
                        subtitle="Live Analysis"
                        icon={<AlertCircle className={`w-5 h-5 ${riskScore >= 80 ? 'text-red-500 animate-pulse' : ''}`} />}
                        color={`border-[${riskColor}]/30`}
                    />

                    {/* BESS Storage Gauge */}
                    <div className="glass-card p-4 border border-purple-500/20 flex flex-col justify-between relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-400 font-semibold flex items-center gap-2">
                                <BatteryCharging className="w-5 h-5 text-purple-400" /> BESS Status
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${physics?.bess.action === 'DISCHARGING' ? 'bg-orange-500/20 text-orange-400' : physics?.bess.action === 'CHARGING' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                {physics?.bess.action || 'IDLE'}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">
                            {physics?.bess.state_of_charge_pct?.toFixed(1) || 0}% <span className="text-sm font-normal text-slate-500">SOC</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
                            <div className={`h-full rounded-full ${physics?.bess.action === 'DISCHARGING' ? 'bg-orange-400' : 'bg-purple-400'}`} style={{ width: `${physics?.bess.state_of_charge_pct || 0}%` }} />
                        </div>
                    </div>

                    {/* Dynamic Live Price */}
                    <div className="glass-card p-4 border border-emerald-500/20 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-400 font-semibold flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-400" /> Live Tariff
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${livePrice?.trend === 'UP' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                {livePrice?.trend === 'UP' ? 'SURGE' : 'SAVINGS'}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-400">
                            ${livePrice?.current_price_usd_per_mwh?.toFixed(2) || '0.00'} <span className="text-sm font-normal text-emerald-600">/MWh</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex justify-between">
                            <span>Renewable Disc: {livePrice?.renewable_discount_pct || 0}%</span>
                            <span>Load Factor: {livePrice?.load_multiplier || 1}x</span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Interactive Grid Map */}
            <div className="col-span-1 lg:col-span-2 glass-card p-6 border border-white/5 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-400" /> Live Grid Topology
                    </h3>
                    <span className="text-xs text-slate-500">Real-time geospatial state</span>
                </div>
                <div className="flex-grow min-h-[400px]">
                    <GridMap physics={physics} />
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 24h Load Trend & EV Queue */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    <div className="glass-card p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-blue-400" /> 24-Hour Load Trend
                            </h3>
                            <span className="text-xs text-slate-500">Last 24 hours</span>
                        </div>
                        {metrics?.trend_24h && (
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={metrics.trend_24h}>
                                    <defs>
                                        <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="renGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <Tooltip contentStyle={{ background: 'rgba(13,18,36,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10, color: '#e2e8f0' }} />
                                    <Legend />
                                    <Area type="monotone" dataKey="load_mw" stroke="#00d4ff" fill="url(#loadGrad)" strokeWidth={2} name="Load (MW)" />
                                    <Area type="monotone" dataKey="renewable_mw" stroke="#00ff88" fill="url(#renGrad)" strokeWidth={2} name="Renewable (MW)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* EV Smart Charging Queue */}
                    <SmartEVQueue />

                    {/* Self-Healing Grid Protocol */}
                    <GridTopology />
                </div>

                {/* Zone Status, Security, Bidding & Anomalies */}
                <div className="space-y-6">
                    {/* Security Intrusion Detection */}
                    <SecurityRadar />

                    {/* Wholesale Bidding AI */}
                    <MarketBidding />

                    {/* Zone Status */}
                    <div className="glass-card p-6 border border-white/5">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-purple-400" /> Grid Zones
                        </h3>
                        <div className="space-y-4">
                            {(metrics?.zone_metrics || []).map((z: any) => (
                                <motion.div key={z.zone_id} className="flex items-center gap-3" whileHover={{ x: 3 }}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-300 truncate">{z.zone_name}</span>
                                            <span className={`font-mono ${z.status === 'critical' ? 'text-red-400' : z.status === 'warning' ? 'text-yellow-400' : 'text-green-400'}`}>
                                                {z.utilization_pct}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${z.utilization_pct}%` }}
                                                transition={{ duration: 1, ease: 'easeOut' }}
                                                className="h-full rounded-full"
                                                style={{
                                                    background: z.status === 'critical' ? '#ff3c3c' : z.status === 'warning' ? '#f97316' : '#00ff88'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Anomalies Widget */}
                    <div className="glass-card p-6 border border-red-500/10">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400" /> Real-Time Anomalies
                        </h3>
                        {anomalies.length === 0 ? (
                            <div className="text-center text-slate-500 py-6 text-sm">
                                No statistical anomalies detected in the last 24 hours. Grid is stable.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                {anomalies.map((ano, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className={`p-3 rounded-lg border flex flex-col gap-1 ${ano.severity === 'high'
                                            ? 'bg-red-500/10 border-red-500/20'
                                            : 'bg-yellow-500/5 border-yellow-500/10'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className={`text-xs font-semibold ${ano.severity === 'high' ? 'text-red-400' : 'text-yellow-400'
                                                } uppercase`}>
                                                {ano.type} DETECTED
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {new Date(ano.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-200">{ano.load_mw.toFixed(0)} MW</span>
                                            <span className="font-mono text-slate-400 text-xs">Z: {ano.z_score.toFixed(2)}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5 text-center transition-all hover:bg-white/5 border border-white/5 hover:border-blue-500/20">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">System Health</p>
                    <p className="text-3xl font-bold" style={{ color: (metrics?.system_health_score || 0) >= 80 ? '#00ff88' : '#f97316' }}>
                        {metrics?.system_health_score?.toFixed(0)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">/ 100</p>
                </div>
                <div className="glass-card p-5 text-center transition-all hover:bg-white/5 border border-white/5 hover:border-blue-500/20">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Grid Frequency</p>
                    <p className="text-3xl font-bold text-blue-400 font-mono">
                        {liveData?.frequency_hz.toFixed(3) ?? metrics?.grid_frequency_hz?.toFixed(3)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Hz</p>
                </div>
                <div className="glass-card p-5 text-center transition-all hover:bg-white/5 border border-white/5 hover:border-blue-500/20">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Active Alerts</p>
                    <p className="text-3xl font-bold" style={{ color: (metrics?.active_alerts || 0) > 0 ? '#f97316' : '#00ff88' }}>
                        {metrics?.active_alerts ?? 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">warnings</p>
                </div>
                <div className="glass-card p-5 text-center transition-all hover:bg-white/5 border border-white/5 hover:border-blue-500/20">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Peak Capacity</p>
                    <p className="text-3xl font-bold text-purple-400">
                        {metrics?.peak_capacity_mw?.toFixed(0)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">MW</p>
                </div>
            </div>

            {/* Blockchain Energy Ledger Full Width Row */}
            <div className="mt-6 border border-white/5 rounded-xl overflow-hidden bg-[#050814]/50 shadow-lg backdrop-blur-md">
                <EnergyLedger />
            </div>

            {/* AI Core Interaction Menu */}
            <AiChat />
        </div >
    );
};

export default Dashboard;
