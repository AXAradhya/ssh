from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Forecast
from analysis import compute_model_accuracy
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])


@router.get("/model-accuracy")
def get_model_accuracy(db: Session = Depends(get_db)):
    """Get model accuracy metrics — computed from forecast vs actual comparison."""
    return {"models": compute_model_accuracy(db)}


@router.get("")
def get_forecasts(
    hours: int = Query(48, ge=1, le=72),
    db: Session = Depends(get_db),
):
    """Get demand forecasts for the next N hours."""
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    rows = (
        db.query(Forecast)
        .filter(Forecast.target_time >= now)
        .order_by(Forecast.target_time)
        .limit(hours)
        .all()
    )
    data = []
    for r in rows:
        data.append({
            "time": r.target_time.isoformat(),
            "hour": r.target_time.strftime("%H:%M"),
            "label": f"{r.target_time.strftime('%a %H:%M')}",
            "demand": r.predicted_demand_mw,
            "upperBound": r.upper_bound_mw,
            "lowerBound": r.lower_bound_mw,
            "capacity": 5200,
            "carbonIntensity": r.carbon_intensity,
            "riskScore": r.risk_score,
            "isOverload": r.predicted_demand_mw > 5200 * 0.9,
            "model": r.model_name,
            "confidence": r.confidence,
            "horizonHours": r.horizon_hours,
        })
    return {"forecasts": data, "count": len(data)}


@router.get("/risk")
def get_risk_summary(db: Session = Depends(get_db)):
    """Get current risk assessment."""
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    next_24 = (
        db.query(Forecast)
        .filter(Forecast.target_time >= now, Forecast.target_time <= now + timedelta(hours=24))
        .order_by(Forecast.target_time)
        .all()
    )
    if not next_24:
        return {"current": 0, "peak": 0, "peakTime": "—", "severity": "NORMAL", "trend": "STABLE"}

    current = next_24[0]
    peak = max(next_24, key=lambda r: r.risk_score)

    severity = "CRITICAL" if peak.risk_score > 75 else "WARNING" if peak.risk_score > 50 else "NORMAL"
    trend = "RISING" if peak.risk_score > current.risk_score else "FALLING"

    return {
        "current": current.risk_score,
        "peak": peak.risk_score,
        "peakTime": peak.target_time.strftime("%a %H:%M"),
        "severity": severity,
        "trend": trend,
        "nextPeakHour": peak.target_time.strftime("%H:%M"),
    }


@router.get("/carbon-timeline")
def get_carbon_timeline(db: Session = Depends(get_db)):
    """Get 24hr carbon intensity timeline."""
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    rows = (
        db.query(Forecast)
        .filter(Forecast.target_time >= now, Forecast.target_time < now + timedelta(hours=24))
        .order_by(Forecast.target_time)
        .all()
    )
    slots = []
    for r in rows:
        ci = r.carbon_intensity or 500
        if ci < 450:
            level = "low"
            renewable = 62
        elif ci < 600:
            level = "medium"
            renewable = 35
        else:
            level = "high"
            renewable = 12
        slots.append({
            "hour": r.target_time.hour,
            "label": r.target_time.strftime("%H:%M"),
            "level": level,
            "intensity": round(ci),
            "renewable": renewable,
        })
    return {"timeline": slots}
