from fastapi import APIRouter, Depends
from typing import Dict, Any, List
from datetime import datetime
import random

from auth import get_current_user
from database import SessionLocal, UserModel
from ml.assets import AssetHealthModel

router = APIRouter(prefix="/api/operations", tags=["Operations & Management"])

# Instantiate the mock asset model for drone scheduling
asset_model = AssetHealthModel()

@router.get("/gamification/leaderboard")
async def get_dr_leaderboard(current_user: dict = Depends(get_current_user)):
    """
    Demand Response Gamification Engine.
    Returns the top participants who have shifted load during peak hours.
    In a real app, this would query a dedicated `DemandResponseModel` table.
    """
    mock_participants = [
        {"name": "Industrial Zone A", "type": "commercial", "mwh_shifted": 450.2, "score": 9850, "rank": 1},
        {"name": "Tech Corp Campus", "type": "commercial", "mwh_shifted": 320.5, "score": 7420, "rank": 2},
        {"name": "City Mall Complex", "type": "commercial", "mwh_shifted": 150.0, "score": 4100, "rank": 3},
        {"name": "Residential VPP Group 1", "type": "residential_aggregator", "mwh_shifted": 85.5, "score": 2800, "rank": 4},
        {"name": current_user["username"] + "'s Facility", "type": "commercial", "mwh_shifted": 42.1, "score": 1250, "rank": 14}, # Show the current user
    ]
    
    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "leaderboard": mock_participants,
        "total_mwh_shifted_system_wide": 5420.8
    }

@router.get("/drones/schedule")
async def get_drone_schedule(current_user: dict = Depends(get_current_user)):
    """
    Automated Drone Inspection Scheduler.
    Takes asset health scores and cross-references live weather to output an optimal 
    weekly flight schedule for inspection drones.
    """
    # Get current asset health (simulated with some stress to force low health)
    health_data = asset_model.simulate_wear(load_stress=1.5, weather_severity=1.2)
    
    # Filter for assets needing attention (health < 75%)
    assets_to_inspect = [a for a in health_data["assets"] if a["health_pct"] < 75.0]
    
    # Sort by criticality (lowest health first)
    assets_to_inspect.sort(key=lambda x: x["health_pct"])
    
    schedule = []
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    
    for i, asset in enumerate(assets_to_inspect):
        day = days[i % len(days)]
        
        # Simulate weather check
        weather_suitable = random.choice([True, True, True, False]) # 75% chance of good weather
        
        schedule.append({
            "flight_id": f"FLT-{random.randint(1000, 9999)}",
            "target_asset": asset["asset_id"],
            "asset_type": asset["type"],
            "current_health_pct": asset["health_pct"],
            "scheduled_day": day,
            "status": "APPROVED" if weather_suitable else "DELAYED_WEATHER",
            "priority": "HIGH" if asset["health_pct"] < 60.0 else "MEDIUM"
        })
        
    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "total_inspections_scheduled": len(schedule),
        "schedule": schedule
    }
