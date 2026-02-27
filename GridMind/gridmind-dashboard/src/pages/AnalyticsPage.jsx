import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { getLoadData, getLoadStats } from '../api/apiClient';

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((p, i) => <p key={i} className="value" style={{ color: p.color }}>{p.name}: {p.value?.toLocaleString()} MW</p>)}
    </div>
  );
}

export default function AnalyticsPage() {
  const [dailyData, setDailyData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [stats, setStats] = useState(null);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [d, h, s] = await Promise.all([getLoadData(days, 'daily'), getLoadData(3, 'hourly'), getLoadStats()]);
        setDailyData(d.data || []); setHourlyData(h.data || []); setStats(s);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [days]);

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-muted)' }}>Loading...</div>;

  const sc = stats ? [
    { l:'Total Records', v:stats.totalRecords?.toLocaleString(), c:'var(--accent-primary)' },
    { l:'Avg Demand', v:`${stats.avgDemand} MW`, c:'var(--accent-cyan)' },
    { l:'Peak Demand', v:`${stats.maxDemand} MW`, c:'var(--accent-red)' },
    { l:'Min Demand', v:`${stats.minDemand} MW`, c:'var(--accent-green)' },
  ] : [];

  return (
    <div className="dashboard-grid">
      <div className="glass-card grid-col-12 animate-fade-in">
        <div className="card-header">
          <span className="card-title"><BarChart3 /> Analytics</span>
          <div style={{ display:'flex',gap:8 }}>
            {[7,14,30].map(d => (
              <button key={d} onClick={() => { setLoading(true); setDays(d); }} style={{
                padding:'4px 14px',borderRadius:'var(--radius-full)',fontSize:'0.75rem',fontWeight:600,
                border:`1px solid ${days===d?'var(--accent-primary)':'var(--glass-border)'}`,
                background:days===d?'rgba(59,130,246,0.15)':'transparent',
                color:days===d?'var(--accent-primary)':'var(--text-muted)',cursor:'pointer',fontFamily:'inherit',
              }}>{d}D</button>
            ))}
          </div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:`repeat(${sc.length},1fr)`,gap:'var(--space-md)' }}>
          {sc.map((s,i) => (
            <div key={i} style={{ textAlign:'center',padding:'var(--space-md)',background:'rgba(255,255,255,0.03)',borderRadius:'var(--radius-md)' }}>
              <div style={{ fontFamily:'JetBrains Mono',fontSize:'1.1rem',fontWeight:700,color:s.c }}>{s.v}</div>
              <div style={{ fontSize:'0.7rem',color:'var(--text-muted)',marginTop:4,textTransform:'uppercase' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card grid-col-12 animate-fade-in" style={{ animationDelay:'0.1s' }}>
        <div className="card-header"><span className="card-title"><Calendar /> Daily Load — {days} Days</span></div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fontSize:9 }} stroke="rgba(255,255,255,0.1)" />
            <YAxis tick={{ fontSize:10 }} stroke="rgba(255,255,255,0.1)" tickFormatter={v=>`${(v/1000).toFixed(1)}k`} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="avgDemand" fill="#3b82f6" fillOpacity={0.6} radius={[4,4,0,0]} name="Avg Demand" />
            <Bar dataKey="peakDemand" fill="#ef4444" fillOpacity={0.4} radius={[4,4,0,0]} name="Peak" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card grid-col-7 animate-fade-in" style={{ animationDelay:'0.2s' }}>
        <div className="card-header"><span className="card-title"><TrendingUp /> 3-Day Hourly</span></div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={hourlyData.slice(-72)}>
            <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="time" tick={{ fontSize:9 }} interval={11} stroke="rgba(255,255,255,0.1)" />
            <YAxis tick={{ fontSize:10 }} stroke="rgba(255,255,255,0.1)" tickFormatter={v=>`${(v/1000).toFixed(1)}k`} />
            <Tooltip content={<Tip />} />
            <Area type="monotone" dataKey="demand" stroke="#06b6d4" strokeWidth={1.5} fill="url(#ag)" dot={false} name="Demand" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card grid-col-5 animate-fade-in" style={{ animationDelay:'0.25s' }}>
        <div className="card-header"><span className="card-title"><BarChart3 /> Load Split (7D)</span></div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dailyData.slice(-7)}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fontSize:9 }} stroke="rgba(255,255,255,0.1)" />
            <YAxis tick={{ fontSize:10 }} stroke="rgba(255,255,255,0.1)" tickFormatter={v=>`${(v/1000).toFixed(1)}k`} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="avgIndustrial" stackId="a" fill="#8b5cf6" fillOpacity={0.7} name="Industrial" />
            <Bar dataKey="avgResidential" stackId="a" fill="#3b82f6" fillOpacity={0.7} name="Residential" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
