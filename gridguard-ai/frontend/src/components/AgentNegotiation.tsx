import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Zap, Factory, Car, ShieldAlert } from 'lucide-react';
import { api } from '../api/client';

interface Props {
    currentLoadMw: number;
    capacityMw: number;
}

const AgentNegotiation: React.FC<Props> = ({ currentLoadMw, capacityMw }) => {
    const [negotiation, setNegotiation] = useState<any>(null);

    useEffect(() => {
        // Poll negotiation status every 10 seconds if load is high
        const fetchNegotiation = async () => {
            if (currentLoadMw / capacityMw < 0.85) return; // Don't spam backend if stable
            try {
                const res = await api.getNegotiation(currentLoadMw, capacityMw);
                if (res.data.active) {
                    setNegotiation(res.data);
                } else {
                    setNegotiation(null);
                }
            } catch (error) {
                console.error("Failed to fetch negotiation status", error);
            }
        };

        fetchNegotiation();
        const interval = setInterval(fetchNegotiation, 10000);
        return () => clearInterval(interval);
    }, [currentLoadMw, capacityMw]);

    if (!negotiation) return null;

    const getAgentIcon = (agent: string) => {
        if (agent.includes('Operator')) return <ShieldAlert className="w-4 h-4 text-red-400" />;
        if (agent.includes('EV')) return <Car className="w-4 h-4 text-green-400" />;
        if (agent.includes('Industrial')) return <Factory className="w-4 h-4 text-yellow-400" />;
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'BROADCAST': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'BID': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'ACCEPT': return 'text-green-400 bg-green-400/10 border-green-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-5 border border-red-500/30 shadow-[0_0_20px_rgba(255,0,0,0.1)] mb-6"
        >
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
                    Live AI Multi-Agent Load Negotiation
                </h3>
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${negotiation.status === 'SUCCESS' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {negotiation.status}
                </span>
            </div>

            <div className="space-y-3 font-mono text-sm max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                <AnimatePresence>
                    {negotiation.negotiations.map((msg: any, idx: number) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.5 }}
                            className="bg-slate-900/50 rounded-lg p-3 border border-white/5"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="flex items-center gap-2 font-bold text-slate-300">
                                    {getAgentIcon(msg.agent)} {msg.agent}
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionColor(msg.action)}`}>
                                        {msg.action}
                                    </span>
                                    <span className="text-slate-500 text-xs">{msg.timestamp}</span>
                                </div>
                            </div>
                            <p className="text-slate-400 leading-relaxed mt-2 pl-6 border-l-2 border-slate-700">
                                {msg.message}
                            </p>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-sm">
                <span className="text-slate-400">Total Load Shed Secured:</span>
                <span className="font-bold text-green-400 text-lg">
                    {negotiation.final_shed_mw.toFixed(1)} MW
                </span>
            </div>
        </motion.div>
    );
};

export default AgentNegotiation;
