from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Intervention
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/api/interventions", tags=["Interventions"])


class InterventionCreate(BaseModel):
    type: str
    category: str
    text: str
    priority: str = "medium"
    icon: str = "⚡"


@router.get("")
def get_interventions(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get all interventions, optionally filtered by status."""
    query = db.query(Intervention).order_by(Intervention.created_at.desc())
    if status:
        query = query.filter(Intervention.status == status)
    rows = query.all()
    return {
        "interventions": [{
            "id": r.id,
            "type": r.type,
            "category": r.category,
            "text": r.text,
            "priority": r.priority,
            "icon": r.icon,
            "status": r.status,
            "timestamp": _time_ago(r.created_at),
            "createdAt": r.created_at.isoformat(),
        } for r in rows]
    }


@router.post("")
def create_intervention(item: InterventionCreate, db: Session = Depends(get_db)):
    """Create a new intervention."""
    record = Intervention(
        type=item.type,
        category=item.category,
        text=item.text,
        priority=item.priority,
        icon=item.icon,
        status="active",
        created_at=datetime.now(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "status": "created"}


@router.put("/{intervention_id}/resolve")
def resolve_intervention(intervention_id: int, db: Session = Depends(get_db)):
    """Mark an intervention as resolved."""
    record = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not record:
        return {"error": "Not found"}, 404
    record.status = "resolved"
    db.commit()
    return {"id": record.id, "status": "resolved"}


def _time_ago(dt: datetime) -> str:
    diff = datetime.now() - dt
    minutes = int(diff.total_seconds() / 60)
    if minutes < 1:
        return "just now"
    if minutes < 60:
        return f"{minutes} min ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    return f"{hours // 24}d ago"
