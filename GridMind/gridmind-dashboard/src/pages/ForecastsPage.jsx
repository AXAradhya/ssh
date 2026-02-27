import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, LineChart, Line,
} from 'recharts';
import { TrendingUp, Clock, BarChart3, Table } from 'lucide-react';
import { getForecasts, getLoadData, getModelAccuracy } from '../api/apiClient';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="value" style={{ color: p.color }}>
          {p.name}: {p.value?.toLocaleString()} MW
        </p>
      ))}
    </div>
  );
}

export default function ForecastsPage() {
  const [forecasts, setForecasts] = useState([]);
  const [historical, setHistorical] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [horizon, setHorizon] = useState(48);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [fc, hist, ma] = await Promise.all([
          getForecasts(horizon),
          getLoadData(7, 'hourly'),
          getModelAccuracy(),
        ]);
        setForecasts(fc.forecasts || []);
        setHistorical(hist.data || []);
        setMetrics(ma.models || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [horizon]);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Loading forecasts...</div>;
  }

  return (
    <div className="dashboard-grid">
      {/* Horizon Selector */}
      <div className="glass-card grid-col-12 animate-fade-in">
        <div className="card-header">
          <span className="card-title"><Clock /> Forecast Horizon</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          {[24, 48, 72].map(h => (
            <button key={h} onClick={() => { setLoading(true); setHorizon(h); }}
              style={{
                padding: '8px 24px', borderRadius: 'var(--radius-md)',
                border: `1px solid ${horizon === h ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                background: horizon === h ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                color: horizon === h ? 'var(--accent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                transition: 'all 0.2s ease', fontFamily: 'inherit',
              }}>
              {h} Hours
            </button>
          ))}
        </div>
      </div>

      {/* Main Forecast Chart */}
      <div className="glass-card grid-col-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="card-header">
          <span className="card-title"><TrendingUp /> Demand Forecast — {horizon} Hour</span>
          <span className="card-badge badge-live">● LIVE</span>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={forecasts} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={Math.floor(horizon / 12)} stroke="rgba(255,255,255,0.1)" />
            <YAxis domain={[2000, 6000]} tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.1)" tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={5200} stroke="#ef4444" strokeDasharray="8 4" strokeWidth={1.5}
              label={{ value: 'Grid Capacity', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
            <Area type="monotone" dataKey="upperBound" stroke="none" fill="rgba(139,92,246,0.08)" name="Upper Bound" />
            <Area type="monotone" dataKey="demand" stroke="#3b82f6" strokeWidth={2} fill="url(#fcGrad)" name="Predicted Demand" dot={false}
              activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
            <Legend />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Historical Trend */}
      <div className="glass-card grid-col-7 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="card-header">
          <span className="card-title"><BarChart3 /> 7-Day Historical Load</span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={historical.slice(-168)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="time" tick={{ fontSize: 9 }} interval={23} stroke="rgba(255,255,255,0.1)" />
            <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.1)" tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="demand" stroke="#06b6d4" strokeWidth={1.5} dot={false} name="Actual Demand" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Model Accuracy Table */}
      <div className="glass-card grid-col-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <div className="card-header">
          <span className="card-title"><Table /> Model Accuracy Comparison</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px', gap: 'var(--space-sm)', padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Model</span><span>MAPE</span><span>RMSE</span><span>Status</span>
          </div>
          {metrics.map((m, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px', gap: 'var(--space-sm)',
              padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem', alignItems: 'center',
            }}>
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
                {m.model}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-green)' }}>{m.mape}</span>
              <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>{m.rmse}</span>
              <span style={{
                fontSize: '0.68rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600,
                background: m.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                color: m.status === 'Active' ? 'var(--accent-green)' : 'var(--text-muted)',
              }}>{m.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
