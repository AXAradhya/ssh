import { useState, useEffect, useRef } from "react";
import {
  Sliders,
  Thermometer,
  Clock,
  Factory,
  Sun,
  Calendar,
  Zap,
  AlertTriangle,
  TrendingUp,
  Leaf,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { runSimulation, getSimulatorDefaults } from "../api/apiClient";

const SEASONS = [
  { value: "summer", label: "☀️ Summer", color: "#f59e0b" },
  { value: "winter", label: "❄️ Winter", color: "#3b82f6" },
  { value: "monsoon", label: "🌧️ Monsoon", color: "#06b6d4" },
  { value: "autumn", label: "🍂 Autumn", color: "#10b981" },
];

function SliderControl({
  label,
  icon: Icon,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  color,
}) {
  return (
    <div className="sim-slider-row">
      <div className="sim-slider-header">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon size={14} style={{ color }} />
          <span className="sim-slider-label">{label}</span>
        </div>
        <span className="sim-slider-value" style={{ color }}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) => onChange(parseFloat(e.target.value))}
        className="sim-range"
        style={{ "--accent": color }}
      />
      <div className="sim-slider-range">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

function AnimatedNumber({ value, prefix = "", suffix = "", color }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const frameRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    const duration = 250;
    const start = performance.now();

    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = to;
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return (
    <span className="sim-metric-value sim-live-value" style={{ color }}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function SimulatorPage() {
  const [params, setParams] = useState({
    temperature: 35,
    industrial_activity: 100,
    solar_capacity: 20,
    time_of_day: 14,
    is_holiday: false,
    season: "summer",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  // Load initial simulation
  useEffect(() => {
    runSimulation(params)
      .then((r) => setResult(r.simulation))
      .catch(() => {});
  }, []);

  // Instant simulate on every param change (50ms debounce for rapid slider drags)
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await runSimulation(params);
        setResult(res.simulation);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }, 50);
    return () => clearTimeout(timerRef.current);
  }, [params]);

  const update = (key, val) => setParams((p) => ({ ...p, [key]: val }));

  const sim = result;
  const riskColor = sim
    ? sim.riskScore > 75
      ? "#ef4444"
      : sim.riskScore > 50
        ? "#f59e0b"
        : "#10b981"
    : "#64748b";
  const utilColor = sim
    ? sim.utilizationPct > 95
      ? "#ef4444"
      : sim.utilizationPct > 80
        ? "#f59e0b"
        : "#3b82f6"
    : "#64748b";

  return (
    <div className="dashboard-grid">
      {/* Controls Panel */}
      <div
        className="glass-card grid-col-4 animate-fade-in"
        style={{ overflow: "auto", maxHeight: "calc(100vh - 140px)" }}
      >
        <div className="card-header">
          <span className="card-title">
            <Sliders /> Scenario Controls
          </span>
        </div>

        <SliderControl
          label="Temperature"
          icon={Thermometer}
          value={params.temperature}
          onChange={(v) => update("temperature", v)}
          min={-5}
          max={50}
          step={0.5}
          unit="°C"
          color="#ef4444"
        />

        <SliderControl
          label="Time of Day"
          icon={Clock}
          value={params.time_of_day}
          onChange={(v) => update("time_of_day", v)}
          min={0}
          max={23}
          step={1}
          unit=":00"
          color="#f59e0b"
        />

        <SliderControl
          label="Industrial Activity"
          icon={Factory}
          value={params.industrial_activity}
          onChange={(v) => update("industrial_activity", v)}
          min={0}
          max={200}
          step={5}
          unit="%"
          color="#8b5cf6"
        />

        <SliderControl
          label="Solar Capacity"
          icon={Sun}
          value={params.solar_capacity}
          onChange={(v) => update("solar_capacity", v)}
          min={0}
          max={80}
          step={1}
          unit="%"
          color="#fbbf24"
        />

        {/* Season */}
        <div className="sim-slider-row">
          <div className="sim-slider-header">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={14} style={{ color: "var(--accent-amber)" }} />
              <span className="sim-slider-label">Season</span>
            </div>
          </div>
          <div className="sim-season-grid">
            {SEASONS.map((s) => (
              <button
                key={s.value}
                className={`sim-season-btn ${params.season === s.value ? "active" : ""}`}
                style={{ "--btn-color": s.color }}
                onClick={() => update("season", s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Holiday toggle */}
        <div
          className="sim-slider-row"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={14} style={{ color: "var(--accent-green)" }} />
            <span className="sim-slider-label">Public Holiday</span>
          </div>
          <button
            className={`sim-toggle ${params.is_holiday ? "on" : ""}`}
            onClick={() => update("is_holiday", !params.is_holiday)}
          >
            <span className="sim-toggle-knob" />
          </button>
        </div>
      </div>

      {/* Results Panel */}
      <div
        className="grid-col-8"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-lg)",
        }}
      >
        {/* Key Metrics */}
        <div
          className="glass-card animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="card-header">
            <span className="card-title">
              <Zap /> Simulation Results
            </span>
            {loading && (
              <span className="sim-calculating">⚡ Calculating...</span>
            )}
          </div>
          {sim && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "var(--space-md)",
              }}
            >
              {/* Net Demand */}
              <div className="sim-metric-card">
                <div className="sim-metric-icon" style={{ color: utilColor }}>
                  <Zap size={20} />
                </div>
                <AnimatedNumber value={sim.demandMW} color={utilColor} />
                <div className="sim-metric-unit">MW</div>
                <div className="sim-metric-label">Net Demand</div>
                <div className="sim-metric-sub">
                  {sim.utilizationPct}% of {sim.capacityMW.toLocaleString()} MW
                </div>
              </div>
              {/* Risk Score */}
              <div className="sim-metric-card">
                <div className="sim-metric-icon" style={{ color: riskColor }}>
                  <AlertTriangle size={20} />
                </div>
                <AnimatedNumber
                  value={sim.riskScore}
                  suffix="%"
                  color={riskColor}
                />
                <div className="sim-metric-unit">&nbsp;</div>
                <div className="sim-metric-label">Overload Risk</div>
                <div className="sim-metric-sub">
                  {sim.blackoutProbability}% blackout chance
                </div>
              </div>
              {/* Carbon */}
              <div className="sim-metric-card">
                <div
                  className="sim-metric-icon"
                  style={{ color: "var(--accent-cyan)" }}
                >
                  <Leaf size={20} />
                </div>
                <AnimatedNumber
                  value={sim.carbonIntensity}
                  color="var(--accent-cyan)"
                />
                <div className="sim-metric-unit">gCO₂/kWh</div>
                <div className="sim-metric-label">Carbon Intensity</div>
                <div className="sim-metric-sub">
                  {sim.solarGenerationMW} MW solar
                </div>
              </div>
              {/* Cost */}
              <div className="sim-metric-card">
                <div
                  className="sim-metric-icon"
                  style={{ color: "var(--accent-amber)" }}
                >
                  ₹
                </div>
                <AnimatedNumber
                  value={sim.costPerMWh}
                  prefix="₹"
                  color="var(--accent-amber)"
                />
                <div className="sim-metric-unit">₹/MWh</div>
                <div className="sim-metric-label">Energy Cost</div>
                <div className="sim-metric-sub">
                  Ind {sim.industrialPct}% / Res {sim.residentialPct}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 24h Projection Chart */}
        <div
          className="glass-card animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="card-header">
            <span className="card-title">
              <TrendingUp /> 24-Hour Demand Projection
            </span>
            {sim && (
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Peak: {sim.peakHour.demand.toLocaleString()} MW at{" "}
                {String(sim.peakHour.hour).padStart(2, "0")}:00 | Min:{" "}
                {sim.minHour.demand.toLocaleString()} MW at{" "}
                {String(sim.minHour.hour).padStart(2, "0")}:00
              </span>
            )}
          </div>
          {sim && (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={sim.projection}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="simDemand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="simSolar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(17,24,39,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: "0.8rem",
                  }}
                  formatter={(v, n) => [
                    v.toLocaleString() + " MW",
                    n === "demand"
                      ? "Net Demand"
                      : n === "solar"
                        ? "Solar Generation"
                        : "Gross Demand",
                  ]}
                />
                <ReferenceLine
                  y={5200}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{
                    value: "Grid Capacity 5,200 MW",
                    fill: "#ef4444",
                    fontSize: 10,
                    position: "right",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="gross"
                  stroke="rgba(255,255,255,0.15)"
                  fill="none"
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="solar"
                  stroke="#fbbf24"
                  fill="url(#simSolar)"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="demand"
                  stroke="#3b82f6"
                  fill="url(#simDemand)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Factor Impact Breakdown */}
        {sim && (
          <div
            className="glass-card animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="card-header">
              <span className="card-title">
                <Sliders /> Factor Impact Breakdown
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "var(--space-sm)",
              }}
            >
              {Object.entries(sim.factors).map(([key, val]) => {
                const label =
                  {
                    temperature: "Temperature",
                    timeOfDay: "Time of Day",
                    season: "Season",
                    industrial: "Industrial",
                    holiday: "Holiday",
                  }[key] || key;
                const color =
                  val > 0
                    ? "#ef4444"
                    : val < 0
                      ? "#10b981"
                      : "var(--text-muted)";
                return (
                  <div key={key} className="sim-factor-cell">
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "var(--text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      {label}
                    </div>
                    <div className="sim-factor-value" style={{ color }}>
                      {val > 0 ? "+" : ""}
                      {val}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
