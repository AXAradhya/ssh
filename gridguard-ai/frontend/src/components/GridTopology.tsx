import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, ZapOff, Activity } from 'lucide-react';
import { api } from '../api/client';

const GridTopology: React.FC = () => {
    const [topologyData, setTopologyData] = useState<any>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const fetchTopology = async () => {
        try {
            // Trigger a simulated failure routing scenario randomly between C and F
            const target = Math.random() > 0.5 ? "Substation-F" : "Substation-E";
            const res = await api.getTopologyHeal("Substation-C", target, Math.floor(Math.random() * 80) + 20);
            setTopologyData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchTopology();
        const interval = setInterval(() => setRefreshTrigger(prev => prev + 1), 6000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (refreshTrigger > 0) fetchTopology();
    }, [refreshTrigger]);

    if (!topologyData) return <div className="p-4 text-gray-400">Loading Grid Topology...</div>;

    const pathString = topologyData.path_found.join(" → ");
    const isSuccess = topologyData.status.includes("SUCCESS");

    return (
        <div className="p-4 rounded-xl border border-teal-500/30 bg-gray-900/50 backdrop-blur-md relative overflow-hidden">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Share2 className="text-teal-400" />
                Self-Healing Topology
            </h3>

            <div className="flex gap-4 mb-4">
                <div className="flex-1 bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                    <ZapOff className="text-red-400 mx-auto mb-1" size={24} />
                    <div className="text-xs text-red-300">Failure Point</div>
                    <div className="text-sm text-red-100 font-bold">{topologyData.failed_node}</div>
                </div>

                <div className="flex-1 bg-teal-500/10 border border-teal-500/20 p-3 rounded-lg text-center">
                    <Activity className="text-teal-400 mx-auto mb-1" size={24} />
                    <div className="text-xs text-teal-300">Target Node</div>
                    <div className="text-sm text-teal-100 font-bold">{topologyData.target_node}</div>
                </div>
            </div>

            <div className="bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Calculated Reroute Path</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${isSuccess ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {topologyData.status}
                    </span>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={pathString}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-white font-mono text-sm leading-relaxed"
                    >
                        {topologyData.path_found.map((node: string, idx: number) => (
                            <span key={idx}>
                                <span className={node === "Substation-A" ? "text-green-300 font-bold" : "text-gray-300"}>{node}</span>
                                {idx < topologyData.path_found.length - 1 && <span className="text-teal-500 mx-2">→</span>}
                            </span>
                        ))}
                    </motion.div>
                </AnimatePresence>

                <div className="mt-3 text-xs text-gray-500 flex justify-between">
                    <span>Hops: {topologyData.hop_count}</span>
                    <span>Bottleneck Flow: <span className="text-gray-300">{topologyData.capacity_available_mw} MW</span></span>
                </div>
            </div>
        </div>
    );
};

export default GridTopology;
