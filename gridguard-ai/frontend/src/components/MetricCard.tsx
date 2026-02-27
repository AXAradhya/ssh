import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
    color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, trend, trendUp, color = '#00d4ff' }) => {
    return (
        <motion.div
            className="glass-card p-5 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
        >
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full filter blur-2xl opacity-10"
                style={{ background: color, transform: 'translate(30%, -30%)' }} />

            <div className="flex items-start justify-between mb-3 relative">
                <div className="p-2 rounded-xl" style={{ background: `${color}20` }}>
                    {icon}
                </div>
                {trend && (
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${trendUp ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                        <TrendingUp className="w-3 h-3" />
                        {trend}
                    </span>
                )}
            </div>

            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{title}</p>
            <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </motion.div>
    );
};

export default MetricCard;
