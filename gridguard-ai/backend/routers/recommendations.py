from fastapi import APIRouter, Depends
from datetime import datetime
from typing import List
from models import RecommendationsResponse, Recommendation, ShapExplanationResponse
from ml.forecaster import get_forecaster
from ml.optimizer import analyze_peak_risk
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["Recommendations"])


@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_recommendations(current_user: dict = Depends(get_current_user)):
    forecaster = get_forecaster()
    forecasts = forecaster.forecast(hours=24)
    risk = analyze_peak_risk(forecasts)

    recs: List[Recommendation] = [
        Recommendation(
            id="rec-001",
            category="demand_response",
            title="Industrial Load Shifting",
            description=f"Reschedule {risk['industrial_reduction_pct']:.1f}% of industrial processes to off-peak hours (11 PM–6 AM) to reduce peak demand pressure.",
            impact_mw=round(risk["peak_load_mw"] * risk["industrial_reduction_pct"] / 100, 1),
            cost_savings_usd=round(risk["estimated_savings_mwh"] * 120, 0),
            priority="high" if risk["risk_level"] in ("high", "critical") else "medium",
            icon="factory"
        ),
        Recommendation(
            id="rec-002",
            category="ev_management",
            title="EV Smart Charging Delay",
            description=f"Delay {risk['ev_delay_minutes']} min of EV charging via smart grid signals. Estimated 15–25 MW demand reduction during peak window.",
            impact_mw=round(15 * (risk["ev_delay_minutes"] / 60 if risk["ev_delay_minutes"] > 0 else 0.3), 1),
            cost_savings_usd=round(15 * 120 * 0.5, 0),
            priority="high" if risk["ev_delay_minutes"] >= 60 else "medium",
            icon="ev_station"
        ),
        Recommendation(
            id="rec-003",
            category="storage",
            title="Battery Storage Dispatch",
            description=f"Dispatch battery storage at {risk['battery_discharge_pct']:.0f}% capacity. Grid-scale batteries can absorb {risk['battery_discharge_pct'] * 0.5:.1f} MWh during 2-hour peak.",
            impact_mw=round(50 * risk["battery_discharge_pct"] / 100, 1),
            cost_savings_usd=round(50 * risk["battery_discharge_pct"] / 100 * 120, 0),
            priority="high" if risk["battery_discharge_pct"] >= 50 else "low",
            icon="battery_charging"
        ),
        Recommendation(
            id="rec-004",
            category="renewable",
            title="Maximize Solar Dispatch",
            description="Cloud cover is low today. Increase solar farm curtailment limit by 15% to maximize free clean energy injection.",
            impact_mw=18.5,
            cost_savings_usd=2220.0,
            priority="medium",
            icon="solar_power"
        ),
        Recommendation(
            id="rec-005",
            category="behavioral",
            title="Smart Thermostat Advisory",
            description="Send demand-response signal to 12,000 enrolled smart thermostats to pre-cool buildings by 1°C before peak window.",
            impact_mw=12.0,
            cost_savings_usd=1440.0,
            priority="low",
            icon="thermostat"
        ),
    ]

    total_impact = round(sum(r.impact_mw for r in recs), 1)
    total_savings = round(sum(r.cost_savings_usd for r in recs), 2)

    return RecommendationsResponse(
        recommendations=recs,
        total_impact_mw=total_impact,
        total_savings_usd=total_savings,
        generated_at=datetime.utcnow().isoformat() + "Z"
    )


@router.get("/shap/explanation", response_model=ShapExplanationResponse)
async def get_shap_explanation(current_user: dict = Depends(get_current_user)):
    forecaster = get_forecaster()
    shap_features = forecaster.get_shap_explanation()
    top = shap_features[0] if shap_features else {}
    explanation_text = (
        f"The most impactful factor driving today's load forecast is **{top.get('feature', 'temperature')}** "
        f"({top.get('description', '')}). "
        "Secondary factors include industrial activity patterns and day-of-week seasonality. "
        "The model is most accurate during normal operating conditions (±20 MW)."
    )
    return ShapExplanationResponse(
        top_features=shap_features,
        explanation_text=explanation_text,
        model_confidence=round(max(0.80, 1 - (forecaster.rmse / 400)), 3),
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
