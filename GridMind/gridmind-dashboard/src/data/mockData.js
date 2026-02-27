// ============ DEMAND FORECAST DATA ============
export function generateForecastData(hours = 72) {
  const data = [];
  const now = new Date();
  now.setMinutes(0, 0, 0);

  for (let i = 0; i < hours; i++) {
    const time = new Date(now.getTime() + i * 3600000);
    const hour = time.getHours();

    // Base demand pattern (MW) — realistic Indian grid pattern
    let baseDemand = 3200;
    // Morning ramp
    if (hour >= 6 && hour < 10) baseDemand = 3200 + (hour - 6) * 300;
    // Daytime plateau
    else if (hour >= 10 && hour < 14)
      baseDemand = 4400 + Math.sin((hour - 10) * 0.8) * 200;
    // Afternoon dip
    else if (hour >= 14 && hour < 17) baseDemand = 4200 + (hour - 14) * 100;
    // Evening peak!
    else if (hour >= 17 && hour < 21)
      baseDemand = 4600 + Math.sin((hour - 17) * 0.9) * 600;
    // Night decline
    else if (hour >= 21) baseDemand = 4200 - (hour - 21) * 300;
    // Late night low
    else baseDemand = 2800 + Math.sin(hour * 0.5) * 200;

    // Add realistic noise
    const noise = (Math.random() - 0.5) * 300;
    const demand = Math.round(baseDemand + noise);

    // Confidence bands widen with forecast horizon
    const uncertainty = Math.min(i * 8, 400);

    // Grid capacity
    const capacity = 5200;

    // Carbon intensity (gCO2/kWh) — lower during solar hours
    let carbonIntensity;
    if (hour >= 10 && hour < 15)
      carbonIntensity = 380 + Math.random() * 40; // Solar peak
    else if (hour >= 6 && hour < 10) carbonIntensity = 520 + Math.random() * 60;
    else if (hour >= 15 && hour < 18)
      carbonIntensity = 580 + Math.random() * 40;
    else carbonIntensity = 650 + Math.random() * 80; // Night/peak = coal heavy

    // Risk calculation
    const loadRatio = demand / capacity;
    let riskScore = 0;
    if (loadRatio > 0.95) riskScore = 95;
    else if (loadRatio > 0.9) riskScore = 75 + (loadRatio - 0.9) * 400;
    else if (loadRatio > 0.85) riskScore = 50 + (loadRatio - 0.85) * 500;
    else if (loadRatio > 0.8) riskScore = 25 + (loadRatio - 0.8) * 500;
    else riskScore = loadRatio * 30;

    data.push({
      time: time.toISOString(),
      hour: `${String(hour).padStart(2, "0")}:00`,
      label: `${time.toLocaleDateString("en-IN", { weekday: "short" })} ${String(hour).padStart(2, "0")}:00`,
      demand: demand,
      upperBound: demand + uncertainty,
      lowerBound: Math.max(demand - uncertainty, 2000),
      capacity: capacity,
      carbonIntensity: Math.round(carbonIntensity),
      riskScore: Math.round(Math.min(riskScore, 99)),
      isOverload: demand > capacity * 0.9,
      industrial: Math.round(demand * (hour >= 9 && hour < 18 ? 0.55 : 0.25)),
      residential: Math.round(demand * (hour >= 17 && hour < 23 ? 0.6 : 0.35)),
    });
  }

  return data;
}

// ============ CURRENT RISK DATA ============
export function getCurrentRisk(forecastData) {
  // Find the highest risk in next 24 hours
  const next24 = forecastData.slice(0, 24);
  let peakRisk = next24[0];
  next24.forEach((d) => {
    if (d.riskScore > peakRisk.riskScore) peakRisk = d;
  });

  const currentRisk = forecastData[0]?.riskScore || 0;

  return {
    current: currentRisk,
    peak: peakRisk.riskScore,
    peakTime: peakRisk.label,
    severity:
      peakRisk.riskScore > 75
        ? "CRITICAL"
        : peakRisk.riskScore > 50
          ? "WARNING"
          : "NORMAL",
    trend: peakRisk.riskScore > currentRisk ? "RISING" : "FALLING",
    nextPeakHour: peakRisk.hour,
  };
}

// ============ AI INTERVENTIONS ============
export const interventions = [
  {
    id: 1,
    type: "alert",
    category: "PEAK OVERLOAD ALERT",
    text: "Peak overload risk at 18:47 Thursday — 87% probability. Grid capacity will be stressed by 340 MW above safe threshold.",
    timestamp: "2 min ago",
    icon: "⚡",
    priority: "critical",
  },
  {
    id: 2,
    type: "tariff",
    category: "DYNAMIC TARIFF ADJUSTMENT",
    text: "Increase rate to ₹9.2/kWh from 17:00-20:00 (current: ₹6.5/kWh). Expected demand reduction: 180 MW.",
    timestamp: "5 min ago",
    icon: "💰",
    priority: "high",
  },
  {
    id: 3,
    type: "nudge",
    category: "CONSUMER NUDGE — EV CHARGING",
    text: "Shift EV charging to 02:00-05:00 window. Save ₹47 per charge and avoid 1.2kg CO₂. 2,340 EV owners notified.",
    timestamp: "8 min ago",
    icon: "🔋",
    priority: "medium",
  },
  {
    id: 4,
    type: "curtail",
    category: "INDUSTRIAL CURTAILMENT ORDER",
    text: "Curtail Zone-B foundry cluster by 15% from 17:30-19:30. Estimated savings: ₹2.8L in demand charges. Compliance rate: 94%.",
    timestamp: "12 min ago",
    icon: "🏭",
    priority: "high",
  },
  {
    id: 5,
    type: "green",
    category: "GREEN WINDOW IDENTIFIED",
    text: "Lowest carbon intensity tomorrow 11:00-14:00 (solar peak). Carbon: 380 gCO₂/kWh vs 720 gCO₂/kWh at peak. Shift 45MW of flexible load.",
    timestamp: "15 min ago",
    icon: "🌿",
    priority: "info",
  },
  {
    id: 6,
    type: "nudge",
    category: "RESIDENTIAL DEMAND RESPONSE",
    text: "Pre-cool homes before 17:00. Reduce AC usage during 17:00-20:00 peak. Incentive: ₹15 credit per household. 12,800 homes targeted.",
    timestamp: "18 min ago",
    icon: "🏠",
    priority: "medium",
  },
  {
    id: 7,
    type: "tariff",
    category: "OFF-PEAK INCENTIVE",
    text: "Super off-peak rate ₹3.1/kWh active 01:00-05:00. Industrial water heating and cold storage can save ₹1.2L by shifting loads.",
    timestamp: "25 min ago",
    icon: "🌙",
    priority: "low",
  },
];

// ============ CARBON DATA ============
export function generateCarbonTimeline() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    let level;
    if (h >= 10 && h < 15)
      level = "low"; // Solar peak
    else if (h >= 7 && h < 10)
      level = "medium"; // Morning transition
    else if (h >= 15 && h < 17)
      level = "medium"; // Afternoon
    else level = "high"; // Coal/gas hours

    let intensity;
    if (level === "low") intensity = 350 + Math.random() * 80;
    else if (level === "medium") intensity = 500 + Math.random() * 80;
    else intensity = 650 + Math.random() * 100;

    slots.push({
      hour: h,
      label: `${String(h).padStart(2, "0")}:00`,
      level,
      intensity: Math.round(intensity),
      renewable: level === "low" ? 62 : level === "medium" ? 35 : 12,
    });
  }
  return slots;
}

// ============ ZONE CARBON SCORES ============
export const zoneScores = [
  {
    zone: "Zone A — South Delhi",
    grade: "A+",
    score: 92,
    color: "#10b981",
    greenUsage: 78,
    responseRate: 95,
  },
  {
    zone: "Zone D — Dwarka",
    grade: "A",
    score: 85,
    color: "#10b981",
    greenUsage: 71,
    responseRate: 88,
  },
  {
    zone: "Zone E — East Delhi",
    grade: "B+",
    score: 74,
    color: "#06b6d4",
    greenUsage: 58,
    responseRate: 76,
  },
  {
    zone: "Zone B — Industrial",
    grade: "B",
    score: 68,
    color: "#06b6d4",
    greenUsage: 45,
    responseRate: 70,
  },
  {
    zone: "Zone F — North Delhi",
    grade: "C+",
    score: 55,
    color: "#f59e0b",
    greenUsage: 32,
    responseRate: 58,
  },
  {
    zone: "Zone C — Old Delhi",
    grade: "D",
    score: 38,
    color: "#ef4444",
    greenUsage: 18,
    responseRate: 34,
  },
];

// ============ IMPACT METRICS ============
export const impactMetrics = {
  costSaved: {
    value: 12.4,
    unit: "L",
    prefix: "₹",
    change: "+18%",
    label: "Cost Saved (This Week)",
  },
  co2Avoided: {
    value: 3.2,
    unit: "tons",
    prefix: "",
    change: "+22%",
    label: "CO₂ Avoided",
  },
  blackoutsPrevented: {
    value: 1,
    unit: "",
    prefix: "",
    change: "—",
    label: "Blackouts Prevented",
  },
  renewableUtil: {
    value: 22,
    unit: "%↑",
    prefix: "",
    change: "+5.4%",
    label: "Renewable Utilization",
  },
};

// ============ LOAD SPLIT DATA ============
export function generateLoadSplitData() {
  const data = [];
  for (let h = 0; h < 24; h++) {
    let industrial, residential;
    // Industrial: heavy 9-18, light otherwise
    if (h >= 9 && h < 18) {
      industrial =
        2200 + Math.sin((h - 9) * 0.35) * 400 + (Math.random() - 0.5) * 200;
    } else {
      industrial = 600 + Math.sin(h * 0.3) * 200 + Math.random() * 100;
    }

    // Residential: peaks in morning and evening
    if (h >= 17 && h < 22) {
      residential =
        2400 + Math.sin((h - 17) * 0.7) * 500 + (Math.random() - 0.5) * 200;
    } else if (h >= 6 && h < 10) {
      residential = 1200 + (h - 6) * 150 + Math.random() * 100;
    } else if (h >= 22 || h < 6) {
      residential = 800 + Math.random() * 200;
    } else {
      residential = 1100 + Math.random() * 300;
    }

    data.push({
      hour: `${String(h).padStart(2, "0")}:00`,
      industrial: Math.round(industrial),
      residential: Math.round(residential),
      total: Math.round(industrial + residential),
    });
  }
  return data;
}
