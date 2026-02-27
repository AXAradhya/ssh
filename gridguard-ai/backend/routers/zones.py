from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel

from database import SessionLocal, GridZoneModel
# Note: verify_token left out intentionally for now to ensure we don't block development, we will merge auth in next

router = APIRouter(prefix="/api/zones", tags=["Zones"])

class ZoneCreate(BaseModel):
    zone_id: str
    zone_name: str
    capacity_mw: float
    current_load_mw: float = 0.0
    region: str

class ZoneResponse(ZoneCreate):
    id: int
    is_active: bool

    class Config:
        orm_mode = True

@router.get("", response_model=List[ZoneResponse])
async def get_all_zones():
    db = SessionLocal()
    try:
        zones = db.query(GridZoneModel).all()
        return zones
    finally:
        db.close()

@router.post("", response_model=ZoneResponse)
async def create_zone(zone_in: ZoneCreate):
    db = SessionLocal()
    try:
        existing = db.query(GridZoneModel).filter(GridZoneModel.zone_id == zone_in.zone_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Zone ID already exists.")
            
        new_zone = GridZoneModel(
            zone_id=zone_in.zone_id,
            zone_name=zone_in.zone_name,
            capacity_mw=zone_in.capacity_mw,
            current_load_mw=zone_in.current_load_mw,
            region=zone_in.region
        )
        db.add(new_zone)
        db.commit()
        db.refresh(new_zone)
        return new_zone
    finally:
        db.close()

@router.put("/{zone_db_id}", response_model=ZoneResponse)
async def update_zone(zone_db_id: int, zone_update: ZoneCreate):
    db = SessionLocal()
    try:
        zone = db.query(GridZoneModel).filter(GridZoneModel.id == zone_db_id).first()
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found.")
            
        zone.zone_id = zone_update.zone_id
        zone.zone_name = zone_update.zone_name
        zone.capacity_mw = zone_update.capacity_mw
        zone.current_load_mw = zone_update.current_load_mw
        zone.region = zone_update.region
        
        db.commit()
        db.refresh(zone)
        return zone
    finally:
        db.close()

@router.delete("/{zone_db_id}")
async def delete_zone(zone_db_id: int):
    db = SessionLocal()
    try:
        zone = db.query(GridZoneModel).filter(GridZoneModel.id == zone_db_id).first()
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found.")
            
        db.delete(zone)
        db.commit()
        return {"detail": "Zone deleted successfully."}
    finally:
        db.close()
