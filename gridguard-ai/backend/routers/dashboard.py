from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
import random

from models import DashboardMetrics, ZoneMetric
from database import SessionLocal, GridZoneModel
from ml.forecaster import get_forecaster
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

CARBON_FACTOR = 0.45
PRICE_PER_MWH = 120.0


@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(current_user: dict = Depends(get_current_user)):
    forecaster = get_forecaster()
    state = forecaster.get_current_state()
    now = datetime.utcnow()

    current_load = state["current_load_mw"]
    renewable_mw = state["renewable_mw"]
    
    # Auto-scale peak capacity (assumes 20% headroom)
    peak_capacity = current_load * 1.2 if current_load > 600 else 600.0
    # Keep it rounded nicely
    peak_capacity = round(peak_capacity / 1000) * 1000 if peak_capacity > 5000 else peak_capacity
    
    load_factor = round(current_load / peak_capacity * 100, 1)
    renewable_share = round((renewable_mw / current_load) * 100, 1) if current_load > 0 else 0.0
    
    health_score = round(100 - (load_factor - 50) * 0.5 if load_factor > 50 else 95, 1)
    health_score = max(60.0, min(100.0, health_score))

    carbon_saved = round(renewable_share / 100 * current_load * 24 * CARBON_FACTOR / 1000, 2)
    cost_saved = round(renewable_share / 100 * current_load * 24 * PRICE_PER_MWH / 1000, 2)
    active_alerts = 2 if load_factor > 90 else (1 if load_factor > 80 else 0)
    grid_freq = round(50.0 + random.uniform(-0.05, 0.05), 3)

    # Zone metrics from DB (we'll scale them up roughly to match the new current_load if needed)
    db = SessionLocal()
    try:
        zones_db = db.query(GridZoneModel).filter(GridZoneModel.is_active == True).all()
        zone_metrics = []
        
        # Calculate a multiplier to scale dummy zones up to real dataset scale
        dummy_total_load = sum(z.current_load_mw for z in zones_db) if zones_db else 1.0
        multiplier = (current_load / dummy_total_load) if dummy_total_load > 0 else 1.0
        
        for z in zones_db:
            scaled_load = z.current_load_mw * multiplier
            scaled_cap = z.capacity_mw * multiplier * 1.2
            utilization = round(scaled_load / scaled_cap * 100, 1) if scaled_cap > 0 else 0.0
            status = "critical" if utilization >= 90 else ("warning" if utilization >= 75 else "normal")
            zone_metrics.append(ZoneMetric(
                zone_id=z.zone_id,
                zone_name=z.zone_name,
                current_load_mw=round(scaled_load + random.uniform(-20, 20), 1),
                capacity_mw=round(scaled_cap, 1),
                utilization_pct=utilization,
                status=status,
                region=z.region
            ))
    finally:
        db.close()

    # 24h trend (read from actual dataset history!)
    trend_24h = []
    hist_df = forecaster.df_history.tail(24)
    for i, row in hist_df.iterrows():
        # Fake hours to display a neat 24h trailing window up to "now"
        # Since the CSV might end in 2018, we just map it to recent hours.
        hours_ago = len(hist_df) - 1 - i
        t = now - timedelta(hours=hours_ago)
        
        r_mw = row["solar_mw"] + row["wind_mw"]
        trend_24h.append({
            "time": t.strftime("%H:00"),
            "load_mw": round(row["load_mw"], 1),
            "renewable_mw": round(r_mw, 1)
        })

    return DashboardMetrics(
        current_load_mw=round(current_load, 2),
        peak_capacity_mw=peak_capacity,
        load_factor_pct=load_factor,
        renewable_share_pct=renewable_share,
        system_health_score=health_score,
        carbon_saved_today_tonnes=carbon_saved,
        cost_saved_today_usd=cost_saved,
        active_alerts=active_alerts,
        grid_frequency_hz=grid_freq,
        zone_metrics=zone_metrics,
        trend_24h=trend_24h,
        timestamp=now.isoformat() + "Z"
    )
