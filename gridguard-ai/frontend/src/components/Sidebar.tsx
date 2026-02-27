import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, TrendingUp, AlertTriangle, Sliders,
    Lightbulb, MessageSquare, Zap
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/forecast', icon: TrendingUp, label: 'Load Forecast' },
    { to: '/risk', icon: AlertTriangle, label: 'Risk Analysis' },
    { to: '/simulator', icon: Sliders, label: 'What-If Sim' },
    { to: '/recommendations', icon: Lightbulb, label: 'Recommendations' },
    { to: '/chat', icon: MessageSquare, label: 'AI Assistant' },
];

const Sidebar: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <aside className="h-screen w-64 flex flex-col"
            style={{ background: 'rgba(10,14,31,0.95)', borderRight: '1px solid rgba(0,212,255,0.1)' }}>

            {/* Logo */}
            <div className="p-5 border-b border-white/5">
                <motion.div className="flex items-center gap-3" whileHover={{ x: 2 }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center glow-blue"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-white text-sm leading-none">GridGuard</p>
                        <p className="text-xs" style={{ color: '#00d4ff' }}>AI Platform</p>
                    </div>
                </motion.div>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map(item => (
                    <NavLink key={item.to} to={item.to}
                        className={({ isActive }) => `sidebar-link flex items-center gap-3 px-3 py-2.5 text-sm transition-all ${isActive ? 'active text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        {({ isActive }) => (
                            <>
                                <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? '#00d4ff' : undefined }} />
                                <span>{item.label}</span>
                                {isActive && (
                                    <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom section */}
            <div className="p-3 border-t border-white/5 space-y-2">
                {/* Theme toggle */}
                <button onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
