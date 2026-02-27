import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';
import { TrendingUp } from 'lucide-react';

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

export default function ForecastChart({ data }) {
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.slice(0, 48).map((d, i) => ({
      ...d,
      name: d.label,
      idx: i,
    }));
  }, [data]);

  // Find overload zones
  const overloadZones = useMemo(() => {
    const zones = [];
    let start = null;
    chartData.forEach((d, i) => {
      if (d.isOverload && !start) start = i;
      if (!d.isOverload && start !== null) {
        zones.push({ x1: chartData[start].name, x2: chartData[i - 1].name });
        start = null;
      }
    });
    if (start !== null) {
      zones.push({ x1: chartData[start].name, x2: chartData[chartData.length - 1].name });
    }
    return zones;
  }, [chartData]);

  return (
    <div className="glass-card grid-col-8 animate-fade-in">
      <div className="card-header">
        <span className="card-title"><TrendingUp /> Demand Forecast — 48 Hour</span>
        <span className="card-badge badge-live">● LIVE</span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="upperGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            interval={5}
            stroke="rgba(255,255,255,0.1)"
          />
          <YAxis
            domain={[2000, 6000]}
            tick={{ fontSize: 10 }}
            stroke="rgba(255,255,255,0.1)"
            tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Overload zones */}
          {overloadZones.map((zone, i) => (
            <ReferenceArea
              key={i}
              x1={zone.x1}
              x2={zone.x2}
              fill="rgba(239, 68, 68, 0.08)"
              stroke="rgba(239, 68, 68, 0.3)"
              strokeDasharray="4 4"
            />
          ))}

          {/* Capacity line */}
          <ReferenceLine
            y={5200}
            stroke="#ef4444"
            strokeDasharray="8 4"
            strokeWidth={1.5}
            label={{
              value: 'Grid Capacity 5,200 MW',
              position: 'insideTopRight',
              fill: '#ef4444',
              fontSize: 10,
            }}
          />

          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="upperBound"
            stroke="none"
            fill="url(#upperGradient)"
            fillOpacity={1}
          />
          <Area
            type="monotone"
            dataKey="lowerBound"
            stroke="none"
            fill="transparent"
          />

          {/* Main demand line */}
          <Area
            type="monotone"
            dataKey="demand"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#demandGradient)"
            fillOpacity={1}
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            name="Demand"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
