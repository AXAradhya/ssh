import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Thermometer, Zap, Factory, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';

const TransformerTwinWidget: React.FC = () => {
    const [twinData, setTwinData] = useState<any>(null);

    const fetchTwinData = async () => {
        try {
            // Simulate variable load and weather
            const load = 70 + Math.random() * 40; // 70 to 110 MW
            const temp = 25 + Math.random() * 15; // 25 to 40 C
            const res = await api.getTransformerTwin(load, temp, 1);
            setTwinData(res.data);
        } catch (err) {
            console.error("Failed to fetch transformer twin data:", err);
        }
    };

    useEffect(() => {
        fetchTwinData();
        const interval = setInterval(fetchTwinData, 8000);
        return () => clearInterval(interval);
    }, []);

    if (!twinData) return <div className="p-4 text-gray-400">Initializing Digital Twin...</div>;

    const isCritical = twinData.hot_spot_temp_c >= 110;
    const isWarning = twinData.hot_spot_temp_c >= 90 && twinData.hot_spot_temp_c < 110;

    return (
        <div className={`p-5 rounded-xl border ${isCritical ? 'border-red-500/50 bg-red-900/10' : isWarning ? 'border-yellow-500/30 bg-yellow-900/10' : 'border-blue-500/20 bg-gray-900/50'} relative overflow-hidden backdrop-blur-md transition-all duration-500`}>
            {/* Background Glow */}
            <div className={`absolute -top-20 -right-20 w-40 h-40 blur-[80px] rounded-full ${isCritical ? 'bg-red-500/20' : isWarning ? 'bg-yellow-500/10' : 'bg-blue-500/10'}`}></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Factory className={isCritical ? "text-red-400" : "text-blue-400"} />
                        {twinData.transformer_id} Digital Twin
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Physics-based thermal lifecycle model</p>
                </div>
                {isCritical && (
                    <span className="flex items-center gap-1 text-xs font-bold bg-red-500/20 text-red-400 px-2 py-1 rounded animate-pulse">
                        <AlertTriangle size={14} /> CRITICAL THERMAL EVENT
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5 relative z-10">
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Thermometer size={14} className="text-orange-400" /> Hot Spot Temp</div>
                    <div className={`text-2xl font-mono ${isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-white'}`}>
                        {twinData.hot_spot_temp_c}°C
                    </div>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Zap size={14} className="text-blue-400" /> Load Ratio (K)</div>
                    <div className="text-2xl font-mono text-white">
                        {twinData.load_ratio_pct}%
                    </div>
                </div>
            </div>

            <div className="space-y-3 relative z-10">
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Top-Oil Temperature</span>
                        <span className="text-slate-300 font-mono">{twinData.top_oil_temp_c}°C</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-orange-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (twinData.top_oil_temp_c / 120) * 100)}%` }}
                            transition={{ duration: 1 }}
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Insulation Remaining Life</span>
                        <span className="text-green-400 font-mono">{twinData.remaining_life_pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-green-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${twinData.remaining_life_pct}%` }}
                            transition={{ duration: 1 }}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs relative z-10">
                <span className="text-slate-500">Aging Accel Factor (FAA)</span>
                <span className={`font-mono font-bold ${twinData.aging_acceleration_factor > 1.0 ? 'text-red-400' : 'text-slate-300'}`}>
                    {twinData.aging_acceleration_factor}x
                </span>
            </div>
        </div>
    );
};

export default TransformerTwinWidget;
