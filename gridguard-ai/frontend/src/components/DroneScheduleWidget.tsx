import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Calendar, Fan, AlertTriangle, CloudRain, Sun } from 'lucide-react';
import { api } from '../api/client';

const DroneScheduleWidget: React.FC = () => {
    const [scheduleData, setScheduleData] = useState<any>(null);

    const fetchSchedule = async () => {
        try {
            const res = await api.getDroneSchedule();
            setScheduleData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchSchedule();
        const interval = setInterval(fetchSchedule, 30000); // Poll slower for schedule
        return () => clearInterval(interval);
    }, []);

    if (!scheduleData) return <div className="p-4 text-gray-400">Loading Drone Fleet...</div>;

    return (
        <div className="p-5 rounded-xl border border-indigo-500/20 bg-gray-900/50 relative overflow-hidden backdrop-blur-md">
            <div className="flex justify-between items-center mb-4 relative z-10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Plane className="text-indigo-400" />
                    Autonomous Drone Fleet
                </h3>
                <span className="px-2 py-1 text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 rounded flex items-center gap-1">
                    <Calendar size={14} /> Weekly Schedule
                </span>
            </div>

            <div className="text-xs text-slate-400 mb-4 bg-black/20 p-2 rounded">
                Targeting predictive maintenance of highest risk assets. Total: <span className="text-white font-bold">{scheduleData.total_inspections_scheduled} Flights</span>
            </div>

            <div className="space-y-3 relative z-10 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                <AnimatePresence>
                    {scheduleData.schedule.map((flight: any, idx: number) => {
                        const isDelayed = flight.status === "DELAYED_WEATHER";
                        return (
                            <motion.div
                                key={flight.flight_id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`p-3 rounded-lg border flex flex-col gap-2 ${isDelayed ? 'bg-orange-500/10 border-orange-500/20' : 'bg-indigo-500/10 border-indigo-500/20'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${flight.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'}`}>
                                            {flight.priority} priority
                                        </span>
                                    </div>
                                    <span className={`text-xs font-bold flex items-center gap-1 ${isDelayed ? 'text-orange-400' : 'text-green-400'}`}>
                                        {isDelayed ? <><CloudRain size={12} /> WEATHER DELAY</> : <><Sun size={12} /> APPROVED</>}
                                    </span>
                                </div>

                                <div>
                                    <div className="text-sm text-white font-bold flex items-center gap-2">
                                        {flight.asset_type === 'Wind Turbine' ? <Fan size={14} className="text-blue-300" /> : <AlertTriangle size={14} className="text-yellow-500" />}
                                        {flight.target_asset}
                                    </div>
                                    <div className="flex justify-between mt-1 text-xs text-slate-400">
                                        <span>Flight: <span className="font-mono text-indigo-300">{flight.flight_id}</span> • {flight.scheduled_day}</span>
                                        <span className={flight.current_health_pct < 50 ? 'text-red-400 font-bold' : ''}>Health: {flight.current_health_pct.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default DroneScheduleWidget;
