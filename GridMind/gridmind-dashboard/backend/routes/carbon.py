from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Zone
from analysis import compute_impact_metrics, compute_energy_mix, compute_carbon_summary

router = APIRouter(prefix="/api/carbon", tags=["Carbon Intelligence"])


@router.get("/scores")
def get_zone_scores(db: Session = Depends(get_db)):
    """Get zone-wise carbon scores."""
    zones = db.query(Zone).order_by(Zone.score.desc()).all()
    return {
        "zones": [{
            "zone": z.name,
            "grade": z.grade,
            "score": z.score,
            "color": z.color,
            "greenUsage": z.green_usage,
            "responseRate": z.response_rate,
        } for z in zones]
    }


@router.get("/impact")
def get_impact_metrics(db: Session = Depends(get_db)):
    """Get impact metrics — computed from actual DB data."""
    return compute_impact_metrics(db)


@router.get("/energy-mix")
def get_energy_mix(db: Session = Depends(get_db)):
    """Get energy source breakdown — derived from carbon intensity data."""
    return {"energyMix": compute_energy_mix(db)}


@router.get("/summary")
def get_carbon_summary(db: Session = Depends(get_db)):
    """Get carbon intelligence summary metrics — computed from forecast data."""
    return compute_carbon_summary(db)
