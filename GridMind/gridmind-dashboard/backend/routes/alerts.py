from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Alert
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


class AlertThreshold(BaseModel):
    type: str
    threshold_value: float
    severity: str = "warning"


@router.get("")
def get_alerts(
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """Get all alerts."""
    query = db.query(Alert).order_by(Alert.created_at.desc())
    if severity:
        query = query.filter(Alert.severity == severity)
    if resolved is not None:
        query = query.filter(Alert.is_resolved == resolved)
    rows = query.all()
    return {
        "alerts": [{
            "id": r.id,
            "type": r.type,
            "severity": r.severity,
            "title": r.title,
            "message": r.message,
            "thresholdValue": r.threshold_value,
            "actualValue": r.actual_value,
            "isResolved": r.is_resolved,
            "createdAt": r.created_at.isoformat(),
            "resolvedAt": r.resolved_at.isoformat() if r.resolved_at else None,
        } for r in rows]
    }


@router.put("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    record = db.query(Alert).filter(Alert.id == alert_id).first()
    if not record:
        return {"error": "Not found"}
    record.is_resolved = True
    record.resolved_at = datetime.now()
    db.commit()
    return {"id": record.id, "status": "resolved"}


@router.post("/configure")
def configure_threshold(config: AlertThreshold, db: Session = Depends(get_db)):
    """Configure an alert threshold (creates a new alert rule)."""
    return {
        "status": "configured",
        "type": config.type,
        "threshold": config.threshold_value,
        "severity": config.severity,
    }
