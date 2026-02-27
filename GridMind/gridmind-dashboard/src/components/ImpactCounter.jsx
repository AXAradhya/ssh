import { motion } from 'framer-motion';
import { Activity, CloudOff, AlertTriangle, Zap } from 'lucide-react';

const icons = {
  currentLoad: Activity,
  co2Avoided: CloudOff,
  blackoutsPredicted: AlertTriangle,
  renewableUtil: Zap,
};

const colors = {
  currentLoad: 'var(--accent-primary)',
  co2Avoided: 'var(--accent-cyan)',
  blackoutsPredicted: 'var(--accent-red)',
  renewableUtil: 'var(--accent-secondary)',
};

export default function ImpactCounter({ metrics }) {
  if (!metrics) return null;

  const entries = Object.entries(metrics);

  return (
    <div className="glass-card grid-col-12 animate-fade-in" style={{ animationDelay: '0.15s' }}>
      <div className="card-header">
        <span className="card-title"><Activity /> Grid Status — Live Metrics</span>
        <span className="card-badge badge-live">● LIVE</span>
      </div>
      <div className="impact-counters" style={{ gridTemplateColumns: `repeat(${entries.length}, 1fr)` }}>
        {entries.map(([key, metric], i) => {
          const Icon = icons[key];
          const color = colors[key];
          return (
            <motion.div
              key={key}
              className="impact-item"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <div className="impact-icon">
                <Icon size={24} style={{ color }} />
              </div>
              <div className="impact-value" style={{ color }}>
                {metric.prefix}{metric.value}<span className="impact-unit">{metric.unit}</span>
              </div>
              <div className="impact-label">{metric.label}</div>
              <div className="impact-change" style={{
                color: metric.change.startsWith('+') ? 'var(--accent-green)' : metric.change.includes('active') ? 'var(--accent-amber)' : 'var(--text-muted)'
              }}>
                {metric.change}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
