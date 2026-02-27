import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, AlertTriangle, Info, Shield } from 'lucide-react';
import { getAlerts, resolveAlert } from '../api/apiClient';

const severityConfig = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: AlertTriangle, label: 'CRITICAL' },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Shield, label: 'WARNING' },
  info: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', icon: Info, label: 'INFO' },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await getAlerts();
      setAlerts(res.alerts || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleResolve(id) {
    await resolveAlert(id);
    load();
  }

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);
  const unresolvedCount = alerts.filter(a => !a.isResolved).length;

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-muted)' }}>Loading...</div>;

  return (
    <div className="dashboard-grid">
      {/* Header */}
      <div className="glass-card grid-col-12 animate-fade-in">
        <div className="card-header">
          <span className="card-title"><Bell /> Alert Center</span>
          <span style={{
            padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700,
            background: unresolvedCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
            color: unresolvedCount > 0 ? '#ef4444' : '#10b981',
          }}>{unresolvedCount} Active</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'critical', 'warning', 'info'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '5px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600,
              border: `1px solid ${filter === s ? (severityConfig[s]?.color || 'var(--accent-primary)') : 'var(--glass-border)'}`,
              background: filter === s ? `${severityConfig[s]?.color || 'var(--accent-primary)'}22` : 'transparent',
              color: filter === s ? (severityConfig[s]?.color || 'var(--accent-primary)') : 'var(--text-muted)',
              cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'inherit',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid-col-12" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {filtered.map((alert, i) => {
          const cfg = severityConfig[alert.severity] || severityConfig.info;
          const Icon = cfg.icon;
          return (
            <motion.div key={alert.id} className="glass-card"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ borderLeft: `3px solid ${cfg.color}`, opacity: alert.isResolved ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Icon size={16} style={{ color: cfg.color }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cfg.label}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{alert.type}</span>
                    {alert.isResolved && <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 'var(--radius-full)', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>RESOLVED</span>}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 6 }}>{alert.title}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{alert.message}</div>
                  {alert.thresholdValue && (
                    <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 8, fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Threshold: <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>{alert.thresholdValue}</span></span>
                      <span style={{ color: 'var(--text-muted)' }}>Actual: <span style={{ fontFamily: 'JetBrains Mono', color: cfg.color }}>{alert.actualValue}</span></span>
                    </div>
                  )}
                </div>
                {!alert.isResolved && (
                  <button onClick={() => handleResolve(alert.id)} style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.3)',
                    background: 'rgba(16,185,129,0.08)', color: '#10b981', cursor: 'pointer', fontSize: '0.72rem',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, fontFamily: 'inherit',
                  }}><CheckCircle size={12} /> Resolve</button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
