import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Activity, Globe } from 'lucide-react';
import { api } from '../api/client';

const SecurityRadar: React.FC = () => {
    const [scanData, setScanData] = useState<any>(null);
    const [simulating, setSimulating] = useState(false);

    const runScan = async (triggerAttack = false) => {
        setSimulating(true);
        try {
            const traffic = triggerAttack ? 1500 + Math.random() * 500 : 450 + Math.random() * 100;
            const authFails = triggerAttack ? 80 + Math.floor(Math.random() * 50) : Math.floor(Math.random() * 5);
            const foreignIps = triggerAttack ? Math.floor(Math.random() * 5) + 1 : 0;

            const res = await api.getIdsScan(traffic, authFails, foreignIps);
            setScanData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setSimulating(false);
        }
    };

    useEffect(() => {
        runScan();
        const interval = setInterval(() => runScan(Math.random() > 0.85), 10000); // Occasional attack spike
        return () => clearInterval(interval);
    }, []);

    if (!scanData) return <div className="p-4 text-gray-400">Loading IDS Radar...</div>;

    const isAlert = scanData.threat_score >= 50;

    return (
        <div className={`p-4 rounded-xl border ${isAlert ? 'border-red-500/50 bg-red-900/10' : 'border-green-500/30 bg-gray-900/50'} relative overflow-hidden backdrop-blur-md`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {isAlert ? <ShieldAlert className="text-red-400" /> : <ShieldCheck className="text-green-400" />}
                    SCADA Intrusion Detection System
                </h3>
                <span className={`px-2 py-1 text-xs font-mono rounded ${isAlert ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                    {scanData.status}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div className="text-gray-400 text-sm flex items-center gap-1"><Activity size={14} /> Traffic Rate</div>
                    <div className="text-xl text-white font-mono">{Math.round(scanData.metrics.traffic_req_sec)} req/s</div>
                </div>
                <div>
                    <div className="text-gray-400 text-sm flex items-center gap-1"><Globe size={14} /> Unauthorized IPs</div>
                    <div className="text-xl text-white font-mono">{scanData.metrics.foreign_ips} blocked</div>
                </div>
            </div>

            <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">Threat Score</span>
                    <span className={isAlert ? 'text-red-400 font-bold' : 'text-green-400'}>{scanData.threat_score}/100</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full ${isAlert ? 'bg-red-500' : 'bg-green-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${scanData.threat_score}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            <AnimatePresence>
                {scanData.active_alerts.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 space-y-2"
                    >
                        {scanData.active_alerts.map((alert: string, i: number) => (
                            <div key={i} className="text-xs text-red-200 bg-red-900/30 border border-red-500/20 p-2 rounded">
                                ⚠ {alert}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SecurityRadar;
