from fastapi import APIRouter, Depends
from datetime import datetime
import json
from google import genai

from models import ChatRequest, ChatResponse
from ml.forecaster import get_forecaster
from ml.optimizer import analyze_peak_risk
from auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["AI Chat"])

# The key provided by the user
client = genai.Client(api_key="AIzaSyDQoRipUSdKQiMb8BntTTe8E_RxqflF8bU")

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    forecaster = get_forecaster()
    forecasts = forecaster.forecast(hours=24)
    risk = analyze_peak_risk(forecasts)
    
    # Generate context so the AI knows the live grid state
    current_load = round(forecasts[0]["load_mw"], 1)
    peak_load = risk.get("peak_load_mw", current_load)
    peak_hour = risk.get("peak_hour", "Unknown")
    risk_score = risk.get("risk_score", 0)
    
    # Calculate renewable coverage %
    avg_load = sum(f["load_mw"] for f in forecasts) / len(forecasts)
    avg_ren = sum(f["solar_mw"] + f["wind_mw"] for f in forecasts) / len(forecasts)
    ren_pct = round((avg_ren / avg_load) * 100, 1)

    system_prompt = (
        "You are GridGuard AI, an expert AI assistant for grid operators and energy analysts. "
        "Use the following real-time data to answer the user's questions clearly, concisely, and professionally.\n"
        "--- LIVE GRID STATE ---\n"
        f"Current Load: {current_load} MW\n"
        f"24h Peak Forecast: {peak_load} MW at {peak_hour}\n"
        f"Risk Score: {risk_score}/100 (Level: {risk.get('risk_level', 'low').upper()})\n"
        f"Renewable Coverage (24h avg): {ren_pct}%\n"
        f"Top Recommendation: {risk['suggestions'][0]['description'] if risk.get('suggestions') else 'Grid is stable'}\n"
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[system_prompt, f"User Question: {request.message}"]
        )
        reply_text = response.text
        confidence = 0.95
    except Exception as e:
        reply_text = f"Sorry, I encountered an error connecting to the AI model: {str(e)}"
        confidence = 0.0

    return ChatResponse(
        reply=reply_text,
        confidence=confidence,
        related_metrics={
            "current_load_mw": current_load,
            "risk_score": risk_score,
            "risk_level": risk.get("risk_level", "low"),
        },
        timestamp=datetime.utcnow().isoformat() + "Z"
    )

