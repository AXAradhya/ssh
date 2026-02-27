import { Sun, Wind, Leaf } from 'lucide-react';

export default function GreenWindows({ carbonTimeline }) {
  if (!carbonTimeline?.length) return null;

  // Find best green window
  const bestSlots = carbonTimeline.filter(s => s.level === 'low');
  const bestStart = bestSlots.length ? bestSlots[0].label : '—';
  const bestEnd = bestSlots.length ? bestSlots[bestSlots.length - 1].label : '—';
  const avgRenewable = bestSlots.length
    ? Math.round(bestSlots.reduce((s, d) => s + d.renewable, 0) / bestSlots.length)
    : 0;

  return (
    <div className="glass-card grid-col-5 animate-fade-in" style={{ animationDelay: '0.35s' }}>
      <div className="card-header">
        <span className="card-title"><Leaf /> Green Windows</span>
        <span className="card-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
          ECO
        </span>
      </div>

      {/* Timeline strip */}
      <div className="green-timeline">
        {carbonTimeline.map((slot, i) => (
          <div
            key={i}
            className={`timeline-slot carbon-${slot.level}`}
            title={`${slot.label} — ${slot.intensity} gCO₂/kWh (${slot.renewable}% renewable)`}
          />
        ))}
      </div>

      <div className="timeline-labels">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>

      {/* Best window highlight */}
      <div style={{ marginTop: 'var(--space-md)' }}>
        <div className="green-window-best">
          <Sun size={16} />
          <span>Best Window: {bestStart} — {bestEnd}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
        <div style={{
          flex: 1, textAlign: 'center', padding: '12px',
          background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)'
        }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'JetBrains Mono' }}>
            {avgRenewable}%
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
            <Sun size={12} style={{ verticalAlign: 'middle' }} /> Renewable Mix
          </div>
        </div>
        <div style={{
          flex: 1, textAlign: 'center', padding: '12px',
          background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)'
        }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono' }}>
            {bestSlots.length}h
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
            <Wind size={12} style={{ verticalAlign: 'middle' }} /> Green Hours
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="carbon-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'rgba(16,185,129,0.6)' }} />
          <span>Low Carbon</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'rgba(245,158,11,0.5)' }} />
          <span>Medium</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'rgba(239,68,68,0.5)' }} />
          <span>High Carbon</span>
        </div>
      </div>
    </div>
  );
}
