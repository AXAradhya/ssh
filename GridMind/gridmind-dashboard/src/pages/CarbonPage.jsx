import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Leaf, Sun, Wind, Zap, Trophy } from 'lucide-react';
import { getCarbonTimeline, getZoneScores, getImpactMetrics, getEnergyMix, getCarbonSummary } from '../api/apiClient';

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="value" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

export default function CarbonPage() {
  const [timeline, setTimeline] = useState([]);
  const [zones, setZones] = useState([]);
  const [energyMix, setEnergyMix] = useState([]);
  const [carbonSummary, setCarbonSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ct, zs, em, cs] = await Promise.all([
          getCarbonTimeline(), getZoneScores(), getEnergyMix(), getCarbonSummary(),
        ]);
        setTimeline(ct.timeline || []);
        setZones(zs.zones || []);
        setEnergyMix(em.energyMix || []);
        setCarbonSummary(cs);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-muted)' }}>Loading...</div>;

  const carbonColors = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };

  // Build summary cards from API data
  const summaryCards = carbonSummary ? [
    { icon: Leaf, label: 'CO₂ Avoided', value: carbonSummary.co2Avoided?.value || '—', color: 'var(--accent-green)', change: carbonSummary.co2Avoided?.change || '—' },
    { icon: Sun, label: 'Solar Utilization', value: carbonSummary.solarUtil?.value || '—', color: '#fbbf24', change: carbonSummary.solarUtil?.change || '—' },
    { icon: Wind, label: 'Wind Utilization', value: carbonSummary.windUtil?.value || '—', color: 'var(--accent-cyan)', change: carbonSummary.windUtil?.change || '—' },
    { icon: Zap, label: 'Green Hours Today', value: carbonSummary.greenHours?.value || '—', color: 'var(--accent-secondary)', change: carbonSummary.greenHours?.change || '—' },
  ] : [];

  return (
    <div className="dashboard-grid">
      {/* Carbon Summary — from API */}
      <div className="glass-card grid-col-12 animate-fade-in">
        <div className="card-header">
          <span className="card-title"><Leaf /> Carbon Intelligence Dashboard</span>
          <span className="card-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>ECO TRACKING</span>
        </div>
        <div className="impact-counters" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {summaryCards.map((item, i) => (
            <div key={i} className="impact-item">
              <div className="impact-icon"><item.icon size={24} style={{ color: item.color }} /></div>
              <div className="impact-value" style={{ color: item.color, fontSize: '1.4rem' }}>{item.value}</div>
              <div className="impact-label">{item.label}</div>
              <div className="impact-change" style={{ color: 'var(--accent-green)' }}>{item.change}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Carbon Intensity Timeline */}
      <div className="glass-card grid-col-7 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="card-header">
          <span className="card-title"><Zap /> 24-Hour Carbon Intensity</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} stroke="rgba(255,255,255,0.1)" />
            <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.1)" label={{ value: 'gCO₂/kWh', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'var(--text-muted)' } }} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="intensity" name="Carbon Intensity" radius={[4,4,0,0]}>
              {timeline.map((e, i) => <Cell key={i} fill={carbonColors[e.level] || '#64748b'} fillOpacity={0.7} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Energy Mix Pie — from API */}
      <div className="glass-card grid-col-5 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="card-header">
          <span className="card-title"><Sun /> Current Energy Mix</span>
          <span className="card-badge" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontSize: '0.6rem' }}>FROM DB</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={energyMix} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" stroke="none" paddingAngle={2}>
                {energyMix.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {energyMix.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{e.name}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--text-primary)' }}>{e.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Leaderboard */}
      <div className="glass-card grid-col-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="card-header">
          <span className="card-title"><Trophy /> Zone Carbon Score Leaderboard</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px 120px 80px 100px 100px', gap: 'var(--space-sm)', padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--glass-border)' }}>
          <span>Rank</span><span>Zone</span><span>Grade</span><span>Score</span><span>Green %</span><span>Response</span><span>Status</span>
        </div>
        {zones.map((z, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 60px 120px 80px 100px 100px',
            gap: 'var(--space-sm)', padding: '12px', alignItems: 'center',
            background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
            borderRadius: 'var(--radius-sm)',
          }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{i+1}</span>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{z.zone}</span>
            <span className={`score-grade grade-${z.grade.charAt(0).toLowerCase()}`}>{z.grade}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ width: `${z.score}%`, height: '100%', background: z.color, borderRadius: 'var(--radius-full)' }} />
              </div>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem' }}>{z.score}%</span>
            </div>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: 'var(--accent-green)' }}>{z.greenUsage}%</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>{z.responseRate}%</span>
            <span style={{
              fontSize: '0.68rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600,
              background: z.score >= 70 ? 'rgba(16,185,129,0.15)' : z.score >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
              color: z.score >= 70 ? '#10b981' : z.score >= 50 ? '#f59e0b' : '#ef4444',
              textAlign: 'center',
            }}>{z.score >= 70 ? 'Good' : z.score >= 50 ? 'Fair' : 'Poor'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
