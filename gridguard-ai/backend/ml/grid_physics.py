import random
from typing import Dict, Any

class GridPhysicsModel:
    def __init__(self):
        self.bess_charge_pct = 50.0 # Battery Energy Storage System starts at 50%
        self.bess_capacity_mwh = 500.0 # Huge grid-scale battery
        self.max_charge_discharge_rate_mw = 100.0
        self.islanding_active = False

    def simulate_grid_state(self, current_load_mw: float, solar_mw: float, wind_mw: float, severity_flag: int) -> Dict[str, Any]:
        """
        Simulate BESS behavior (charge on solar surplus, discharge on load peak) and Microgrid Islanding.
        """
        total_renewable = solar_mw + wind_mw
        
        # Determine battery action
        bess_action = "IDLE"
        mw_flow = 0.0
        
        if total_renewable > current_load_mw * 0.4 and self.bess_charge_pct < 98.0:
            # Lots of renewables, charge the battery
            mw_flow = min(self.max_charge_discharge_rate_mw, (total_renewable - current_load_mw*0.4))
            charge_added_mwh = mw_flow * 0.25 # Assume 15 min tick
            self.bess_charge_pct += (charge_added_mwh / self.bess_capacity_mwh) * 100
            bess_action = "CHARGING"
        elif current_load_mw > 1000.0 and self.bess_charge_pct > 10.0:
            # High load, discharge battery to help
            mw_flow = min(self.max_charge_discharge_rate_mw, current_load_mw - 1000.0)
            charge_removed_mwh = mw_flow * 0.25
            self.bess_charge_pct -= (charge_removed_mwh / self.bess_capacity_mwh) * 100
            bess_action = "DISCHARGING"
            
        # Determine Islanding (if severity > 3 or extreme load)
        if severity_flag >= 3 or current_load_mw > 1200:
            self.islanding_active = True
        elif severity_flag <= 1 and current_load_mw < 900:
             self.islanding_active = False
             
        # Mock weather radar risk
        storm_distance = random.uniform(10, 500) if severity_flag >= 2 else 999
             
        return {
            "bess": {
                "state_of_charge_pct": round(self.bess_charge_pct, 1),
                "action": bess_action,
                "flow_mw": round(mw_flow, 1),
                "capacity_mwh": self.bess_capacity_mwh
            },
            "islanding": {
                "active": self.islanding_active,
                "status": "Sub-Grid Alpha Disconnected for Safety" if self.islanding_active else "Grid Fully Synchronized"
            },
            "weather_radar": {
                "active_threat": severity_flag >= 2,
                "threat_type": random.choice(["Severe Thunderstorm", "Cyclonic Wind", "Geomagnetic Storm"]) if severity_flag >=2 else "None",
                "distance_km": round(storm_distance, 1)
            }
        }
