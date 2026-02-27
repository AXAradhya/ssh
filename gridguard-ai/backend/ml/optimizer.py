"""
Peak risk analyzer and load optimization engine.
"""
from typing import List, Dict
from ml.forecaster import PEAK_THRESHOLD_MW


def analyze_peak_risk(forecasts: List[Dict]) -> Dict:
    """
    Given a list of hourly forecasts, compute peak risk score and
    return optimization suggestions.
    """
    if not forecasts:
        return {}

    loads = [f["load_mw"] for f in forecasts]
    max_load = max(loads)
    peak_idx = loads.index(max_load)
    peak_ts = forecasts[peak_idx]["timestamp"]

    # Risk score: 0–100 based on how close max load is to threshold
    overage_ratio = max_load / PEAK_THRESHOLD_MW
    if overage_ratio >= 1.15:
        risk_score = min(100, 80 + (overage_ratio - 1.15) * 200)
        risk_level = "critical"
    elif overage_ratio >= 1.0:
        risk_score = 60 + (overage_ratio - 1.0) * 133
        risk_level = "high"
    elif overage_ratio >= 0.85:
        risk_score = 30 + (overage_ratio - 0.85) * 200
        risk_level = "medium"
    else:
        risk_score = max(0, overage_ratio * 35)
        risk_level = "low"

    risk_score = round(risk_score, 1)
    excess_mw = max(0, max_load - PEAK_THRESHOLD_MW)

    # ── Optimization Suggestions ──────────────────────────────────────
    suggestions = []
    industrial_reduction_pct = 0.0
    ev_delay_minutes = 0
    battery_discharge_pct = 0.0
    estimated_savings_mwh = 0.0

    if risk_level in ("high", "critical"):
        industrial_reduction_pct = min(20.0, (excess_mw / max_load) * 100 * 1.5)
        suggestions.append({
            "type": "demand_response",
            "description": f"Reduce industrial load by {industrial_reduction_pct:.1f}% during peak hours",
            "impact_mw": round(max_load * industrial_reduction_pct / 100, 1),
            "priority": "high"
        })

        ev_delay_minutes = 120 if risk_level == "critical" else 60
        suggestions.append({
            "type": "ev_management",
            "description": f"Delay EV charging by {ev_delay_minutes} minutes (scheduled off-peak)",
            "impact_mw": round(15.0 * (ev_delay_minutes / 60), 1),
            "priority": "high" if risk_level == "critical" else "medium"
        })

        battery_discharge_pct = 80.0 if risk_level == "critical" else 50.0
        suggestions.append({
            "type": "battery_storage",
            "description": f"Discharge battery storage at {battery_discharge_pct:.0f}% capacity",
            "impact_mw": round(50 * battery_discharge_pct / 100, 1),
            "priority": "high"
        })

        estimated_savings_mwh = round(
            (max_load * industrial_reduction_pct / 100
             + 15 * ev_delay_minutes / 60
             + 50 * battery_discharge_pct / 100) * 2,   # over 2-hour peak window
            1
        )

    elif risk_level == "medium":
        suggestions.append({
            "type": "behavioral",
            "description": "Issue voluntary demand reduction advisory to commercial buildings",
            "impact_mw": 20.0,
            "priority": "medium"
        })
        ev_delay_minutes = 30
        suggestions.append({
            "type": "ev_management",
            "description": "Suggest off-peak EV charging to residential users",
            "impact_mw": 8.0,
            "priority": "low"
        })
        estimated_savings_mwh = 35.0

    else:
        suggestions.append({
            "type": "renewable",
            "description": "System operating normally — increase renewable dispatch",
            "impact_mw": 0.0,
            "priority": "low"
        })

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "peak_hour": peak_ts,
        "peak_load_mw": round(max_load, 2),
        "threshold_mw": PEAK_THRESHOLD_MW,
        "suggestions": suggestions,
        "industrial_reduction_pct": round(industrial_reduction_pct, 1),
        "ev_delay_minutes": ev_delay_minutes,
        "battery_discharge_pct": round(battery_discharge_pct, 1),
        "estimated_savings_mwh": estimated_savings_mwh,
    }
