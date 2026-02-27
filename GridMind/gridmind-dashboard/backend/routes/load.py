from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import LoadData
from datetime import datetime, timedelta, date

router = APIRouter(prefix="/api/load", tags=["Load Data"])


@router.get("")
def get_load_data(
    days: int = Query(7, ge=1, le=90),
    resolution: str = Query("hourly", regex="^(5min|hourly|daily)$"),
    db: Session = Depends(get_db),
):
    """Get historical load data."""
    start = datetime.now() - timedelta(days=days)
    query = db.query(LoadData).filter(LoadData.timestamp >= start).order_by(LoadData.timestamp)

    if resolution == "hourly":
        # Get one record per hour (on the hour)
        from sqlalchemy import extract
        query = query.filter(extract("minute", LoadData.time) == 0)
    elif resolution == "daily":
        # Aggregate by date
        results = (
            db.query(
                LoadData.date,
                func.avg(LoadData.demand_mw).label("avg_demand"),
                func.max(LoadData.demand_mw).label("peak_demand"),
                func.min(LoadData.demand_mw).label("min_demand"),
                func.avg(LoadData.industrial_mw).label("avg_industrial"),
                func.avg(LoadData.residential_mw).label("avg_residential"),
                func.avg(LoadData.temperature_c).label("avg_temp"),
            )
            .filter(LoadData.timestamp >= start)
            .group_by(LoadData.date)
            .order_by(LoadData.date)
            .all()
        )
        return {
            "data": [{
                "date": str(r.date),
                "avgDemand": round(r.avg_demand),
                "peakDemand": round(r.peak_demand),
                "minDemand": round(r.min_demand),
                "avgIndustrial": round(r.avg_industrial) if r.avg_industrial else 0,
                "avgResidential": round(r.avg_residential) if r.avg_residential else 0,
                "avgTemp": round(r.avg_temp, 1) if r.avg_temp else None,
            } for r in results],
            "count": len(results),
            "resolution": resolution,
        }

    rows = query.all()
    data = [{
        "timestamp": r.timestamp.isoformat(),
        "date": str(r.date),
        "time": str(r.time),
        "demand": r.demand_mw,
        "industrial": r.industrial_mw,
        "residential": r.residential_mw,
        "temperature": r.temperature_c,
        "dayType": r.day_type,
    } for r in rows]

    return {"data": data, "count": len(data), "resolution": resolution}


@router.get("/split")
def get_load_split(db: Session = Depends(get_db)):
    """Get industrial vs residential load split for today."""
    today = date.today()
    rows = (
        db.query(LoadData)
        .filter(LoadData.date == today, func.extract("minute", LoadData.time) == 0)
        .order_by(LoadData.time)
        .all()
    )
    # If no data for today, use most recent day
    if not rows:
        latest_date = db.query(func.max(LoadData.date)).scalar()
        if latest_date:
            rows = (
                db.query(LoadData)
                .filter(LoadData.date == latest_date, func.extract("minute", LoadData.time) == 0)
                .order_by(LoadData.time)
                .all()
            )

    data = [{
        "hour": r.time.strftime("%H:%M"),
        "industrial": r.industrial_mw or 0,
        "residential": r.residential_mw or 0,
        "total": r.demand_mw,
    } for r in rows]

    return {"data": data, "count": len(data)}


@router.get("/stats")
def get_load_stats(db: Session = Depends(get_db)):
    """Get overall load statistics."""
    total_records = db.query(func.count(LoadData.id)).scalar()
    avg_demand = db.query(func.avg(LoadData.demand_mw)).scalar()
    max_demand = db.query(func.max(LoadData.demand_mw)).scalar()
    min_demand = db.query(func.min(LoadData.demand_mw)).scalar()
    date_range_start = db.query(func.min(LoadData.date)).scalar()
    date_range_end = db.query(func.max(LoadData.date)).scalar()

    return {
        "totalRecords": total_records or 0,
        "avgDemand": round(avg_demand) if avg_demand else 0,
        "maxDemand": round(max_demand) if max_demand else 0,
        "minDemand": round(min_demand) if min_demand else 0,
        "dateRangeStart": str(date_range_start) if date_range_start else None,
        "dateRangeEnd": str(date_range_end) if date_range_end else None,
    }
