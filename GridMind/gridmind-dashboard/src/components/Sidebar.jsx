import { NavLink } from 'react-router-dom';
import { Zap, LayoutDashboard, TrendingUp, Bot, Leaf, BarChart3, Bell, Settings, Activity, MapPin, Sliders } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/forecasts', icon: TrendingUp, label: 'Forecasts' },
  { to: '/interventions', icon: Bot, label: 'Interventions' },
  { to: '/carbon', icon: Leaf, label: 'Carbon Intelligence' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/grid-map', icon: MapPin, label: 'Grid Map' },
  { to: '/simulator', icon: Sliders, label: 'What-If Simulator' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Zap className="brand-icon" />
        <div>
          <div className="brand-name">GridMind</div>
          <div className="brand-tagline">SMART GRID</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <Activity size={14} className="status-pulse" />
          <span>System Active</span>
        </div>
        <div className="pipeline-status">
          <TrendingUp size={12} />
          <span>Pipeline: Real-time</span>
        </div>
      </div>
    </aside>
  );
}
