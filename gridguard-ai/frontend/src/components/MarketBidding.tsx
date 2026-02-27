import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Database } from 'lucide-react';
import { api } from '../api/client';

const MarketBidding: React.FC = () => {
    const [bidData, setBidData] = useState<any>(null);

    const fetchBid = async () => {
        try {
            // Mock random states for the simulation visual
            const hour = new Date().getHours();
            const load = 400 + Math.random() * 100;
            const ren = 300 + Math.random() * 200;
            const battery = 20 + Math.random() * 60;

            const res = await api.getTradingBid(hour, load, ren, battery);
            setBidData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchBid();
        const interval = setInterval(fetchBid, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!bidData) return <div className="p-4 text-gray-400">Loading AI Trader...</div>;

    const actionColors: Record<string, string> = {
        "BUY": "text-blue-400 bg-blue-500/20 border-blue-500/30",
        "SELL": "text-green-400 bg-green-500/20 border-green-500/30",
        "STORE": "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
        "DISCHARGE": "text-purple-400 bg-purple-500/20 border-purple-500/30",
        "HOLD": "text-gray-400 bg-gray-500/20 shadow-none border-gray-500/30"
    };

    return (
        <div className="p-4 rounded-xl border border-blue-500/30 bg-gray-900/50 relative overflow-hidden backdrop-blur-md">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <DollarSign className="text-blue-400" />
                AI Wholesale Bidding Agent
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div className="text-gray-400 text-sm mb-1">Market Price</div>
                    <div className="text-2xl text-white font-mono">${bidData.market_price_usd_mwh}/MWh</div>
                </div>
                <div>
                    <div className="text-gray-400 text-sm mb-1">Expected PnL</div>
                    <div className={`text-2xl font-mono ${bidData.expected_profit_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {bidData.expected_profit_usd >= 0 ? '+' : ''}${bidData.expected_profit_usd}
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 p-3 rounded-lg flex items-center justify-between border border-gray-700">
                <span className="text-gray-400 text-sm flex items-center gap-2">
                    {bidData.recommended_action === "BUY" && <TrendingDown size={16} />}
                    {bidData.recommended_action === "SELL" && <TrendingUp size={16} />}
                    {(bidData.recommended_action === "STORE" || bidData.recommended_action === "DISCHARGE") && <Database size={16} />}
                    AI Recommendation:
                </span>
                <span className={`px-3 py-1 text-sm font-bold font-mono rounded border ${actionColors[bidData.recommended_action]}`}>
                    {bidData.recommended_action} {bidData.trade_volume_mw > 0 ? `${bidData.trade_volume_mw} MW` : ''}
                </span>
            </div>

            <div className="mt-3 text-right">
                <span className="text-xs text-gray-500">
                    Confidence: {(bidData.confidence_score * 100).toFixed(1)}%
                </span>
            </div>
        </div>
    );
};

export default MarketBidding;
