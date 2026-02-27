import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { BarChart3 } from 'lucide-react';

const COLORS = { industrial: '#8b5cf6', residential: '#3b82f6' };

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

export default function LoadSplitChart({ data }) {
  if (!data?.length) return null;

  // Compute totals for pie
  const totalIndustrial = data.reduce((s, d) => s + d.industrial, 0);
  const totalResidential = data.reduce((s, d) => s + d.residential, 0);
  const total = totalIndustrial + totalResidential;

  const pieData = [
    { name: 'Industrial', value: totalIndustrial },
    { name: 'Residential', value: totalResidential },
  ];

  return (
    <div className="glass-card grid-col-7 animate-fade-in" style={{ animationDelay: '0.3s' }}>
      <div className="card-header">
        <span className="card-title"><BarChart3 /> Load Split — Industrial vs Residential</span>
        <span className="card-badge" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
          24HR
        </span>
      </div>

      <div className="load-split-container">
        <div className="load-chart-area">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="industrialGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="residentialGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} stroke="rgba(255,255,255,0.1)" />
              <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.1)" tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="industrial" stackId="1"
                stroke="#8b5cf6" fill="url(#industrialGrad)" name="Industrial" strokeWidth={1.5} />
              <Area type="monotone" dataKey="residential" stackId="1"
                stroke="#3b82f6" fill="url(#residentialGrad)" name="Residential" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="load-pie-area">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                dataKey="value" stroke="none" paddingAngle={3}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={Object.values(COLORS)[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="load-legend">
            <div className="load-legend-item">
              <span className="load-legend-dot" style={{ background: COLORS.industrial }} />
              <span>Industrial</span>
              <span className="load-legend-value">{Math.round(totalIndustrial / total * 100)}%</span>
            </div>
            <div className="load-legend-item">
              <span className="load-legend-dot" style={{ background: COLORS.residential }} />
              <span>Residential</span>
              <span className="load-legend-value">{Math.round(totalResidential / total * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
