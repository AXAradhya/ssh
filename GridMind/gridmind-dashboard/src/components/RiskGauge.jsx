import { AlertTriangle } from 'lucide-react';

export default function RiskGauge({ riskData }) {
  if (!riskData) return null;

  const { current, peak, peakTime, severity, trend, nextPeakHour } = riskData;

  // Gauge arc calculation
  const radius = 70;
  const circumference = Math.PI * radius; // half circle
  const progress = (peak / 100) * circumference;

  const getColor = (val) => {
    if (val > 75) return '#ef4444';
    if (val > 50) return '#f59e0b';
    return '#10b981';
  };

  const color = getColor(peak);

  return (
    <div className="glass-card grid-col-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <div className="card-header">
        <span className="card-title"><AlertTriangle /> Overload Risk</span>
        <span className={`card-badge ${peak > 75 ? 'badge-live' : ''}`}
          style={peak <= 75 ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' } : {}}>
          {severity}
        </span>
      </div>

      <div className="risk-gauge-container">
        <svg width="180" height="110" className="gauge-svg" viewBox="0 0 180 110">
          {/* Background arc */}
          <path
            d="M 10 100 A 70 70 0 0 1 170 100"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d="M 10 100 A 70 70 0 0 1 170 100"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            style={{
              filter: `drop-shadow(0 0 8px ${color})`,
              transition: 'stroke-dasharray 1s ease',
            }}
          />
          {/* Value text */}
          <text x="90" y="85" textAnchor="middle" fill={color}
            style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
            {peak}%
          </text>
          <text x="90" y="105" textAnchor="middle" fill="var(--text-muted)"
            style={{ fontSize: '10px', fontWeight: 500 }}>
            Peak Overload Risk
          </text>
        </svg>

        <div className="risk-details">
          <div className="risk-detail-row">
            <span className="risk-detail-label">Current Risk</span>
            <span className={`risk-detail-value ${current > 50 ? 'severity-high' : 'severity-low'}`}>
              {current}%
            </span>
          </div>
          <div className="risk-detail-row">
            <span className="risk-detail-label">Peak At</span>
            <span className="risk-detail-value" style={{ color: 'var(--text-primary)' }}>
              {peakTime}
            </span>
          </div>
          <div className="risk-detail-row">
            <span className="risk-detail-label">Trend</span>
            <span className={`risk-detail-value ${trend === 'RISING' ? 'severity-high' : 'severity-low'}`}>
              {trend === 'RISING' ? '↑' : '↓'} {trend}
            </span>
          </div>
          <div className="risk-detail-row">
            <span className="risk-detail-label">Next Peak Hour</span>
            <span className="risk-detail-value" style={{ color: 'var(--accent-amber)' }}>
              {nextPeakHour}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
