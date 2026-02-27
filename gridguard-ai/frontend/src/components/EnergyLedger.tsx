import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, ArrowRight, TreePine, DollarSign } from 'lucide-react';
import { api } from '../api/client';

const EnergyLedger: React.FC = () => {
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        // Initial fetch
        api.getLedger()
            .then(res => setTransactions(res.data.transactions || []))
            .catch(err => setTransactions([]));

        // Artificial mining trigger for demo purposes based on random renewable spikes
        const interval = setInterval(async () => {
            const mockGreenMwh = Math.random() * 50;
            try {
                const res = await api.mineCarbonBlock('SolarCorp', 'TechIndustries', mockGreenMwh);
                if (res.data && res.data.tx_id) {
                    setTransactions(prev => [res.data, ...(prev || [])].slice(0, 15));
                }
            } catch (e) { }
        }, 8000); // New block every 8s

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="glass-card p-5 h-[350px] flex flex-col border border-white/5">
            <h3 className="font-semibold text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-purple-400" />
                    Live Carbon Ledger
                </span>
                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Network Sync
                </span>
            </h3>

            <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050814] z-10 pointer-events-none" />
                <div className="space-y-3 font-mono text-xs pr-2 h-full overflow-y-auto custom-scrollbar relative z-0">
                    <AnimatePresence>
                        {(transactions || []).map((tx) => (
                            <motion.div
                                key={tx.tx_id}
                                initial={{ opacity: 0, x: -20, height: 0 }}
                                animate={{ opacity: 1, x: 0, height: 'auto' }}
                                exit={{ opacity: 0 }}
                                className="bg-slate-900/40 p-3 rounded-lg border border-white/5 relative overflow-hidden group"
                            >
                                {/* Hash background */}
                                <div className="absolute -right-10 top-2 opacity-[0.03] text-4xl font-black break-all w-full leading-none group-hover:text-purple-500 transition-colors duration-1000">
                                    {tx.tx_id.split('-').join('')}
                                </div>

                                <div className="relative z-10 flex flex-col gap-2">
                                    <div className="flex justify-between text-slate-500">
                                        <span className="truncate w-32" title={tx.tx_id}>Tx: {tx.tx_id.substring(0, 8)}...</span>
                                        <span>{tx.timestamp.split('T')[1].substring(0, 8)}</span>
                                    </div>

                                    <div className="flex items-center justify-between text-slate-300 bg-black/20 p-2 rounded">
                                        <span className="truncate w-24 text-green-400">{tx.producer}</span>
                                        <ArrowRight className="w-3 h-3 text-slate-600" />
                                        <span className="truncate w-24 text-blue-400 text-right">{tx.consumer}</span>
                                    </div>

                                    <div className="flex justify-between mt-1 items-end">
                                        <div>
                                            <span className="text-white font-bold">{tx.energy_mwh.toFixed(1)}</span>
                                            <span className="text-slate-500 ml-1">MWh</span>
                                        </div>
                                        <div className="flex gap-3 text-right">
                                            <span className="flex items-center gap-1 text-emerald-400">
                                                <TreePine className="w-3 h-3" /> {tx.carbon_credits.toFixed(2)}
                                            </span>
                                            <span className="flex items-center text-purple-400">
                                                <DollarSign className="w-3 h-3" />{tx.market_value_usd.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {(!transactions || transactions.length === 0) && (
                        <div className="text-center text-slate-500 mt-10">Awaiting block generation...</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnergyLedger;
