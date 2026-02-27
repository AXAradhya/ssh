from fastapi import APIRouter, Depends
from models import PeakRiskResponse, AnomaliesResponse
from ml.forecaster import get_forecaster
from ml.optimizer import analyze_peak_risk
from datetime import datetime
from auth import get_current_user

router = APIRouter(prefix="/api/risk", tags=["Risk Analysis"])

@router.get("/anomalies", response_model=AnomaliesResponse)
async def get_anomalies(hours: int = 24, current_user: dict = Depends(get_current_user)):
    forecaster = get_forecaster()
    anomalies = forecaster.detect_anomalies(recent_hours=hours)
    
    return AnomaliesResponse(
        anomalies=anomalies,
        generated_at=datetime.utcnow().isoformat() + "Z"
    )

@router.get("/peak-analysis", response_model=PeakRiskResponse)
async def get_peak_risk(current_user: dict = Depends(get_current_user)):
    forecaster = get_forecaster()
    forecasts = forecaster.forecast(hours=24)
    result = analyze_peak_risk(forecasts)
    return PeakRiskResponse(**result)
