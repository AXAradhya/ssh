"""
Physics-based renewable energy generation models.
Solar PV and wind turbine power output estimation (No Numpy).
"""
import math
from datetime import datetime, timedelta
from typing import List, Dict

# ── Solar PV Configuration ────────────────────────────────────────────────────
PANEL_EFFICIENCY = 0.20          # 20% efficiency
PANEL_AREA_M2 = 15_000_000       # 1500 ha solar farm (scaled 100x)
TEMP_COEFFICIENT = -0.004        # -0.4% per °C above 25°C
INVERTER_EFFICIENCY = 0.97

# ── Wind Turbine Configuration ────────────────────────────────────────────────
NUM_TURBINES = 5000              # (scaled 100x)
ROTOR_RADIUS_M = 50              # 50m radius → 7854 m² swept area
AIR_DENSITY = 1.225              # kg/m³ at sea level
CP = 0.40                        # Betz efficiency coefficient (~40%)
TURBINE_RATED_MW = 3.0           # 3 MW per turbine
CUT_IN_SPEED = 3.0               # m/s
CUT_OUT_SPEED = 25.0             # m/s
RATED_SPEED = 12.0               # m/s


def solar_power_mw(irradiance_wm2: float, temperature_c: float) -> float:
    """Calculate solar PV output in MW given irradiance and cell temperature."""
    if irradiance_wm2 <= 0:
        return 0.0
    cell_temp = temperature_c + 0.0256 * irradiance_wm2  # NOCT approximation
    temp_factor = 1 + TEMP_COEFFICIENT * (cell_temp - 25)
    power_w = irradiance_wm2 * PANEL_AREA_M2 * PANEL_EFFICIENCY * temp_factor * INVERTER_EFFICIENCY
    return max(0.0, round(power_w / 1_000_000, 3))  # W → MW


def wind_power_mw(wind_speed_ms: float) -> float:
    """Calculate wind farm output in MW using the power curve."""
    if wind_speed_ms < CUT_IN_SPEED or wind_speed_ms > CUT_OUT_SPEED:
        return 0.0
    if wind_speed_ms >= RATED_SPEED:
        return round(NUM_TURBINES * TURBINE_RATED_MW, 3)
    swept_area = math.pi * ROTOR_RADIUS_M ** 2
    power_one_w = 0.5 * AIR_DENSITY * swept_area * CP * (wind_speed_ms ** 3)
    power_mw = (power_one_w * NUM_TURBINES) / 1_000_000
    return round(min(power_mw, NUM_TURBINES * TURBINE_RATED_MW), 3)


import random

def fetch_live_weather_sim(hour_index: int) -> Dict[str, float]:
    """
    Simulates a call to a live weather API like OpenWeatherMap.
    Returns dynamic cloud cover and wind speed modifiers.
    """
    # Simulate a passing storm front: Clouds roll in, wind picks up
    if 5 <= hour_index <= 12:
        cloud_cover = random.uniform(0.6, 0.95) # 60% to 95% cloudy
        wind_gust_modifier = random.uniform(1.2, 1.8)
    elif 13 <= hour_index <= 18:
        cloud_cover = random.uniform(0.1, 0.4) # Clearing up
        wind_gust_modifier = random.uniform(0.8, 1.2)
    else:
        cloud_cover = random.uniform(0.0, 0.2)
        wind_gust_modifier = random.uniform(0.5, 1.0)
        
    return {
        "cloud_cover": cloud_cover,
        "wind_gust_modifier": wind_gust_modifier,
        "temperature_offset": random.uniform(-2.0, 3.0)
    }

def forecast_renewables(hours: int = 24, renewable_boost_pct: float = 0.0) -> List[Dict]:
    """Generate hourly renewable forecast using simulated live weather feed."""
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    results = []

    for i in range(hours):
        ts = now + timedelta(hours=i)
        h = ts.hour
        month = ts.month

        # Fetch simulated live weather for this specific hour
        weather = fetch_live_weather_sim(i)

        # Temperature model (base sine + live offset)
        base_temp = 20 + 10 * math.sin(2 * math.pi * (month - 3) / 12)
        temperature = base_temp + 5 * math.sin(2 * math.pi * (h - 6) / 24) + weather["temperature_offset"]

        # Irradiance model (base sine * (1 - cloud cover))
        if 6 <= h <= 18:
            irr = 800 * math.sin(math.pi * (h - 6) / 12) * (0.6 + 0.4 * math.sin(2 * math.pi * (month - 3) / 12))
            irr *= (1.0 - weather["cloud_cover"])  # dynamic cloud penalty
        else:
            irr = 0.0

        # Wind speed model (base * dynamic gust)
        wind = max(0, 6 + 4 * math.sin(2 * math.pi * (month - 1) / 12) + 1.0)
        wind *= weather["wind_gust_modifier"]

        s_mw = solar_power_mw(irr, temperature)
        w_mw = wind_power_mw(wind)

        # Apply user boost
        boost = 1 + renewable_boost_pct / 100
        s_mw = round(s_mw * boost, 3)
        w_mw = round(w_mw * boost, 3)

        # Estimated baseline demand for coverage %
        load_est = 400 + 60 * math.sin(2 * math.pi * (h - 9) / 24)
        coverage = min(100.0, round((s_mw + w_mw) / max(load_est, 1) * 100, 1))

        results.append({
            "timestamp": (ts).isoformat() + "Z",
            "solar_mw": s_mw,
            "wind_mw": w_mw,
            "total_mw": round(s_mw + w_mw, 3),
            "coverage_pct": coverage,
        })

    return results
