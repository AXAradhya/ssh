from fastapi import APIRouter, Depends
from models import WhatIfRequest, WhatIfResponse
from ml.forecaster import get_forecaster
from ml.optimizer import analyze_peak_risk
from ml.renewable import forecast_renewables
from auth import get_current_user

router = APIRouter(prefix="/api/simulate", tags=["What-If Simulator"])

CARBON_FACTOR = 0.45    # tonnes CO₂ / MWh
PRICE_PER_MWH = 120.0   # USD


@router.post("/what-if", response_model=WhatIfResponse)
async def what_if_simulation(request: WhatIfRequest, current_user: dict = Depends(get_current_user)):
    forecaster = get_forecaster()

    # Baseline
    baseline = forecaster.forecast(hours=request.hours)

    # Simulated with user-defined perturbations
    simulated_raw = forecaster.forecast(
        hours=request.hours,
        temp_delta=request.temperature_delta,
        industrial_delta_pct=request.industrial_usage_delta_pct
    )

    # Apply renewable boost to simulation
    if request.renewable_boost_pct != 0:
        ren = forecast_renewables(hours=request.hours, renewable_boost_pct=request.renewable_boost_pct)
        for i, (s, r) in enumerate(zip(simulated_raw, ren)):
            net = max(0, s["load_mw"] - r["total_mw"] * 0.5)  # partial offset
            simulated_raw[i] = {**s, "load_mw": round(net, 2), "solar_mw": r["solar_mw"], "wind_mw": r["wind_mw"]}

    baseline_loads = [f["load_mw"] for f in baseline]
    sim_loads = [f["load_mw"] for f in simulated_raw]

    delta_avg = round(
        (sum(sim_loads) / len(sim_loads)) - (sum(baseline_loads) / len(baseline_loads)), 2
    )
    delta_peak = round(max(sim_loads) - max(baseline_loads), 2)
    new_risk = analyze_peak_risk(simulated_raw)
    carbon_impact = round(delta_avg * request.hours * CARBON_FACTOR / 1000, 3)
    cost_impact = round(delta_avg * request.hours * PRICE_PER_MWH / 1000, 2)

    direction = "increase" if delta_avg > 0 else "decrease"
    summary = (
        f"Simulation predicts average load will {direction} by {abs(delta_avg):.1f} MW "
        f"(temp Δ={request.temperature_delta:+.1f}°C, industrial Δ={request.industrial_usage_delta_pct:+.1f}%, "
        f"renewable boost={request.renewable_boost_pct:+.1f}%). "
        f"New risk score: {new_risk['risk_score']:.1f}/100."
    )

    return WhatIfResponse(
        baseline_forecasts=baseline,
        simulated_forecasts=simulated_raw,
        delta_avg_mw=delta_avg,
        delta_peak_mw=delta_peak,
        new_risk_score=new_risk["risk_score"],
        carbon_impact_tonnes=carbon_impact,
        cost_impact_usd=cost_impact,
        summary=summary
    )
