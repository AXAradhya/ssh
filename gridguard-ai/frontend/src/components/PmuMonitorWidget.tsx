import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Wind, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

const PmuMonitorWidget: React.FC = () => {
    const [pmuData, setPmuData] = useState<any>(null);

    const fetchPmu = async () => {
        try {
            // Simulate random load and wind penetration
            const load = 500 + Math.random() * 200;
            const wind = 20 + Math.random() * 40; // 20-60% wind
            const res = await api.getPmuMonitor(load, wind);
            setPmuData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchPmu();
        // PMUs run fast, poll every 2 seconds for visual effect
        const interval = setInterval(fetchPmu, 2000);
        return () => clearInterval(interval);
    }, []);

    if (!pmuData) return <div className="p-4 text-gray-400">Syncing PMU Data...</div>;

    const isAlert = pmuData.disturbance_detected;
    const isLowInertia = pmuData.system_inertia === "LOW";

    return (
        <div className={`p-5 rounded-xl border ${isAlert ? 'border-red-500/50 bg-red-900/10' : 'border-teal-500/20 bg-gray-900/50'} relative overflow-hidden backdrop-blur-md`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className={isAlert ? "text-red-400 animate-pulse" : "text-teal-400"} />
                    Phasor Measurement Unit
                </h3>
                <span className={`px-2 py-1 text-xs font-mono font-bold rounded ${isAlert ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                    {pmuData.status}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-center">
                    <div className="text-xs text-gray-400 mb-1">Grid Frequency</div>
                    <div className={`text-3xl font-mono ${pmuData.frequency_hz < 59.8 || pmuData.frequency_hz > 60.2 ? 'text-red-400' : 'text-blue-400'}`}>
                        {pmuData.frequency_hz.toFixed(3)} <span className="text-sm font-sans text-gray-500">Hz</span>
                    </div>
                </div>

                <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-center">
                    <div className="text-xs text-gray-400 mb-1">RoCoF</div>
                    <div className={`text-3xl font-mono ${Math.abs(pmuData.rocof_hz_per_sec) > 0.5 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {pmuData.rocof_hz_per_sec >= 0 ? '+' : ''}{pmuData.rocof_hz_per_sec.toFixed(3)}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-2">
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${isLowInertia ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-400'}`}>
                    <Wind size={14} /> System Inertia: {pmuData.system_inertia}
                </div>
                <div className="text-xs text-slate-500 font-mono">Sample: 0.1s</div>
            </div>

            {pmuData.alerts.length > 0 && (
                <div className="mt-3 space-y-1">
                    {pmuData.alerts.map((a: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-red-300 bg-red-500/10 p-2 rounded">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            {a}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PmuMonitorWidget;
