from fastapi import APIRouter, Query, Depends
from datetime import datetime
import json

from models import LoadForecastResponse, RenewableForecastResponse
from ml.forecaster import get_forecaster
from ml.renewable import forecast_renewables
from database import SessionLocal, ForecastHistoryModel
from auth import get_current_user

router = APIRouter(prefix="/api/forecast", tags=["Forecasting"])

CARBON_FACTOR = 0.45   # tonnes CO₂ per MWh (natural gas baseline)
ELECTRICITY_PRICE = 0.12  # USD per kWh


@router.get("/load", response_model=LoadForecastResponse)
async def get_load_forecast(
    hours: int = Query(default=24, ge=1, le=72),
    current_user: dict = Depends(get_current_user)
):

    forecaster = get_forecaster()
    forecasts = forecaster.forecast(hours=hours)

    loads = [f["load_mw"] for f in forecasts]
    renewables = [f["solar_mw"] + f["wind_mw"] for f in forecasts]
    peak_count = sum(1 for f in forecasts if f["is_peak"])

    db = SessionLocal()
    try:
        record = ForecastHistoryModel(
            forecast_type="load",
            hours_ahead=hours,
            peak_detected=(peak_count > 0),
            peak_risk_score=max(loads) / 1000 if loads else 0.0,
            requested_by=current_user["username"],
            parameters_json=json.dumps({"hours": hours})
        )
        db.add(record)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to save forecast history log: {e}")
    finally:
        db.close()

    return LoadForecastResponse(
        forecasts=forecasts,
        peak_count=peak_count,
        avg_load_mw=round(sum(loads) / len(loads), 2),
        max_load_mw=round(max(loads), 2),
        min_load_mw=round(min(loads), 2),
        total_renewable_mw=round(sum(renewables), 2),
        generated_at=datetime.utcnow().isoformat() + "Z"
    )


@router.get("/renewable", response_model=RenewableForecastResponse)
async def get_renewable_forecast(
    hours: int = Query(default=24, ge=1, le=72),
    current_user: dict = Depends(get_current_user)
):
    forecasts = forecast_renewables(hours=hours)

    solars = [f["solar_mw"] for f in forecasts]
    winds = [f["wind_mw"] for f in forecasts]
    totals = [f["total_mw"] for f in forecasts]
    peak_ren = max(totals)
    total_mwh = sum(totals)

    carbon_saved = round(total_mwh * CARBON_FACTOR, 2)
    cost_saved = round(total_mwh * 1000 * ELECTRICITY_PRICE, 2)  # MWh→kWh×price

    return RenewableForecastResponse(
        forecasts=forecasts,
        avg_solar_mw=round(sum(solars) / len(solars), 2),
        avg_wind_mw=round(sum(winds) / len(winds), 2),
        peak_renewable_mw=round(peak_ren, 2),
        carbon_saved_tonnes=carbon_saved,
        cost_saved_usd=cost_saved
    )
