"""What-If Simulator — Simulates electricity demand under different scenarios."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from database import get_db
from models import LoadData, Forecast
from datetime import datetime, timedelta
import math

router = APIRouter(prefix="/api/simulator", tags=["Simulator"])


class SimulationRequest(BaseModel):
    temperature: float = 35.0        # °C
    industrial_activity: float = 100  # % (100 = normal)
    solar_capacity: float = 20.0     # % of mix
    time_of_day: int = 14            # hour (0-23)
    is_holiday: bool = False
    season: str = "summer"           # summer, winter, monsoon, autumn


def _get_baseline(db: Session):
    """Get baseline metrics from current DB data."""
    avg_demand = db.query(func.avg(LoadData.demand_mw)).scalar() or 4000
    peak_demand = db.query(func.max(LoadData.demand_mw)).scalar() or 5200
    min_demand = db.query(func.min(LoadData.demand_mw)).scalar() or 2400
    total_records = db.query(func.count(LoadData.id)).scalar() or 0
    return {
        "avg": float(avg_demand),
        "peak": float(peak_demand),
        "min": float(min_demand),
        "records": total_records,
    }


def _simulate(baseline: dict, params: SimulationRequest) -> dict:
    """Run the simulation based on adjustable factors."""
    base_demand = baseline["avg"]
    capacity = 5200

    # --- Temperature Effect ---
    # Every degree above 25°C adds ~2.5% load (AC), below 15°C adds ~1.5% (heating)
    temp_effect = 1.0
    if params.temperature > 25:
        temp_effect += (params.temperature - 25) * 0.025
    elif params.temperature < 15:
        temp_effect += (15 - params.temperature) * 0.015

    # --- Time of Day Effect (diurnal curve) ---
    hour = params.time_of_day
    # Normalized diurnal profile: peak at 14-18h, trough at 3-5h
    diurnal_factors = [
        0.65, 0.60, 0.58, 0.56, 0.55, 0.58,  # 0-5
        0.65, 0.75, 0.85, 0.92, 0.96, 0.98,  # 6-11
        1.00, 1.03, 1.05, 1.04, 1.02, 1.00,  # 12-17
        0.97, 0.95, 0.90, 0.85, 0.78, 0.70,  # 18-23
    ]
    time_effect = diurnal_factors[hour]

    # --- Season Effect ---
    season_factors = {"summer": 1.18, "winter": 0.88, "monsoon": 0.95, "autumn": 0.92}
    season_effect = season_factors.get(params.season, 1.0)

    # --- Industrial Activity ---
    # Industrial is ~45% of total load
    ind_ratio = 0.45
    ind_effect = 1.0 + ind_ratio * ((params.industrial_activity / 100) - 1.0)

    # --- Solar Capacity (reduces net load) ---
    # Solar only generates during daytime (6am-6pm), peak at noon
    solar_generation = 0
    if 6 <= hour <= 18:
        solar_peak_ratio = 1.0 - abs(hour - 12) / 6  # 0 at 6/18, 1 at 12
        solar_generation = params.solar_capacity / 100 * capacity * solar_peak_ratio * 0.35

    # --- Holiday Effect ---
    holiday_effect = 0.72 if params.is_holiday else 1.0

    # --- Combine all effects ---
    simulated_demand = base_demand * temp_effect * time_effect * season_effect * ind_effect * holiday_effect
    net_demand = max(simulated_demand - solar_generation, base_demand * 0.3)

    # --- Derived metrics ---
    utilization = round(net_demand / capacity * 100, 1)
    risk_score = min(100, max(0, round((utilization - 60) * 2.5)))
    blackout_probability = min(99, max(0, round((utilization - 85) * 6.5))) if utilization > 85 else 0

    # CO₂ intensity based on solar and demand level
    base_carbon = 650  # gCO₂/kWh for coal-heavy grid
    carbon_reduction = (params.solar_capacity / 100) * 0.45 + (0.15 if params.season == "monsoon" else 0)
    carbon_intensity = round(base_carbon * (1 - carbon_reduction) * (net_demand / base_demand) ** 0.3)

    # Cost estimate (₹/MWh)
    base_rate = 4500
    peak_premium = max(0, (utilization - 80) * 120) if utilization > 80 else 0
    cost_per_mwh = round(base_rate + peak_premium)

    # Industrial vs Residential split
    if params.is_holiday:
        ind_share = 25
    elif 9 <= hour <= 18:
        ind_share = round(55 * (params.industrial_activity / 100))
    else:
        ind_share = round(25 * (params.industrial_activity / 100))
    res_share = 100 - ind_share

    # 24h projection
    projection = []
    for h in range(24):
        h_diurnal = diurnal_factors[h]
        h_solar = 0
        if 6 <= h <= 18:
            h_solar_ratio = 1.0 - abs(h - 12) / 6
            h_solar = params.solar_capacity / 100 * capacity * h_solar_ratio * 0.35
        h_demand = base_demand * temp_effect * h_diurnal * season_effect * ind_effect * (0.72 if params.is_holiday else 1.0)
        h_net = max(h_demand - h_solar, base_demand * 0.3)
        projection.append({
            "hour": h,
            "label": f"{h:02d}:00",
            "demand": round(h_net),
            "gross": round(h_demand),
            "solar": round(h_solar),
            "utilization": round(h_net / capacity * 100, 1),
        })

    peak_hour = max(projection, key=lambda x: x["demand"])
    min_hour = min(projection, key=lambda x: x["demand"])

    return {
        "demandMW": round(net_demand),
        "grossDemandMW": round(simulated_demand),
        "solarGenerationMW": round(solar_generation),
        "utilizationPct": utilization,
        "riskScore": risk_score,
        "blackoutProbability": blackout_probability,
        "carbonIntensity": carbon_intensity,
        "costPerMWh": cost_per_mwh,
        "industrialPct": ind_share,
        "residentialPct": res_share,
        "peakHour": {"hour": peak_hour["hour"], "demand": peak_hour["demand"]},
        "minHour": {"hour": min_hour["hour"], "demand": min_hour["demand"]},
        "capacityMW": capacity,
        "projection": projection,
        "factors": {
            "temperature": round((temp_effect - 1) * 100, 1),
            "timeOfDay": round((time_effect - 1) * 100, 1),
            "season": round((season_effect - 1) * 100, 1),
            "industrial": round((ind_effect - 1) * 100, 1),
            "holiday": round(((0.72 if params.is_holiday else 1.0) - 1) * 100, 1),
        },
    }


@router.post("/run")
def run_simulation(params: SimulationRequest, db: Session = Depends(get_db)):
    """Run a what-if simulation with given parameters."""
    baseline = _get_baseline(db)
    result = _simulate(baseline, params)
    return {
        "baseline": baseline,
        "simulation": result,
        "params": params.dict(),
    }


@router.get("/defaults")
def get_defaults(db: Session = Depends(get_db)):
    """Get default simulation parameters and current baseline."""
    baseline = _get_baseline(db)
    return {
        "baseline": baseline,
        "defaults": {
            "temperature": 35.0,
            "industrial_activity": 100,
            "solar_capacity": 20.0,
            "time_of_day": 14,
            "is_holiday": False,
            "season": "summer",
        },
        "ranges": {
            "temperature": {"min": -5, "max": 50, "step": 0.5, "unit": "°C"},
            "industrial_activity": {"min": 0, "max": 200, "step": 5, "unit": "%"},
            "solar_capacity": {"min": 0, "max": 80, "step": 1, "unit": "%"},
            "time_of_day": {"min": 0, "max": 23, "step": 1, "unit": "h"},
        },
    }
