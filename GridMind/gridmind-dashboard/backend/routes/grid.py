from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import GridStation, LoadData
from datetime import datetime, timedelta
from sqlalchemy import func

router = APIRouter(prefix="/api/grid", tags=["Grid Map"])


@router.get("/stations")
def get_grid_stations(db: Session = Depends(get_db)):
    """Get all grid stations with current load data."""
    stations = db.query(GridStation).all()

    # If no stations exist, seed them
    if not stations:
        seed_grid_stations(db)
        stations = db.query(GridStation).all()

    result = []
    for s in stations:
        load_pct = round(s.current_load_mw / s.capacity_mw * 100, 1) if s.capacity_mw else 0
        result.append({
            "id": s.id,
            "name": s.name,
            "type": s.station_type,
            "lat": s.latitude,
            "lng": s.longitude,
            "capacityMW": s.capacity_mw,
            "currentLoadMW": s.current_load_mw,
            "loadPercent": load_pct,
            "status": s.status,
            "voltageKV": s.voltage_kv,
            "zone": s.zone,
        })
    return {"stations": result}


def seed_grid_stations(db: Session):
    """Seed Delhi grid substations with realistic data."""
    import random
    random.seed(42)

    delhi_stations = [
        {"name": "Pragati Power Station", "type": "generating", "lat": 28.6128, "lng": 77.2510, "cap": 1371, "kv": 220, "zone": "Central Delhi"},
        {"name": "Badarpur Thermal", "type": "generating", "lat": 28.5106, "lng": 77.3024, "cap": 705, "kv": 220, "zone": "South Delhi"},
        {"name": "IPGCL Rajghat", "type": "generating", "lat": 28.6389, "lng": 77.2494, "cap": 135, "kv": 132, "zone": "Central Delhi"},
        {"name": "Rithala Substation", "type": "substation", "lat": 28.7172, "lng": 77.1119, "cap": 400, "kv": 400, "zone": "North-West Delhi"},
        {"name": "Rohini Substation", "type": "substation", "lat": 28.7496, "lng": 77.0643, "cap": 350, "kv": 220, "zone": "North Delhi"},
        {"name": "Mundka Substation", "type": "substation", "lat": 28.6831, "lng": 77.0277, "cap": 320, "kv": 220, "zone": "West Delhi"},
        {"name": "Dwarka Substation", "type": "substation", "lat": 28.5921, "lng": 77.0460, "cap": 450, "kv": 400, "zone": "South-West Delhi"},
        {"name": "Mehrauli Substation", "type": "substation", "lat": 28.5245, "lng": 77.1855, "cap": 380, "kv": 220, "zone": "South Delhi"},
        {"name": "Patparganj Substation", "type": "substation", "lat": 28.6276, "lng": 77.2909, "cap": 360, "kv": 220, "zone": "East Delhi"},
        {"name": "Geeta Colony Dist.", "type": "distribution", "lat": 28.6583, "lng": 77.2750, "cap": 120, "kv": 33, "zone": "East Delhi"},
        {"name": "Lajpat Nagar Dist.", "type": "distribution", "lat": 28.5708, "lng": 77.2375, "cap": 100, "kv": 33, "zone": "South Delhi"},
        {"name": "Karol Bagh Dist.", "type": "distribution", "lat": 28.6519, "lng": 77.1904, "cap": 110, "kv": 33, "zone": "Central Delhi"},
        {"name": "Narela Substation", "type": "substation", "lat": 28.8529, "lng": 77.0929, "cap": 280, "kv": 220, "zone": "North Delhi"},
        {"name": "Harsh Vihar Dist.", "type": "distribution", "lat": 28.7139, "lng": 77.3162, "cap": 90, "kv": 33, "zone": "North-East Delhi"},
        {"name": "Sarita Vihar Dist.", "type": "distribution", "lat": 28.5301, "lng": 77.2891, "cap": 95, "kv": 33, "zone": "South-East Delhi"},
    ]

    for s in delhi_stations:
        load_factor = random.uniform(0.45, 0.92)
        status = "online"
        if load_factor > 0.88:
            status = "overloaded"
        elif random.random() < 0.08:
            status = "maintenance"

        station = GridStation(
            name=s["name"],
            station_type=s["type"],
            latitude=s["lat"],
            longitude=s["lng"],
            capacity_mw=s["cap"],
            current_load_mw=round(s["cap"] * load_factor, 1),
            status=status,
            voltage_kv=s["kv"],
            zone=s["zone"],
        )
        db.add(station)

    db.commit()
