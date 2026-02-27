import random
from typing import Dict, Any, List

class VPPAggregator:
    """
    Virtual Power Plant (VPP) Aggregator Logic.
    Aggregates residential solar, batteries, and smart thermostats to bid into markets
    or provide emergency grid relief.
    """
    def __init__(self):
        self.num_households = 5000
        self.solar_penetration = 0.4  # 40% have solar
        self.battery_penetration = 0.15 # 15% have batteries
        
        self.avg_solar_capacity_kw = 5.0
        self.avg_battery_capacity_kwh = 10.0
        
    def calculate_vpp_capacity(self, current_hour: int, weather_condition: str) -> Dict[str, Any]:
        """
        Calculate total available capacity from the VPP based on time of day and weather.
        """
        # Solar generation profiles
        solar_factor = 0.0
        if 8 <= current_hour <= 18:
            # Simple parabolic curve peaking at noon (12)
            solar_factor = 1.0 - ((current_hour - 13) ** 2) / 25.0
            solar_factor = max(0.0, solar_factor)
            
        if weather_condition.lower() == "cloudy":
            solar_factor *= 0.4
        elif weather_condition.lower() == "rainy":
            solar_factor *= 0.2
            
        total_solar_kw = (self.num_households * self.solar_penetration) * self.avg_solar_capacity_kw * solar_factor
        
        # Battery state of charge (assumes charging during day, discharging evening)
        battery_soc_factor = 0.5 # Default 50%
        if 18 <= current_hour <= 22:
            battery_soc_factor = 0.8 # Peak discharge availability
        elif 10 <= current_hour <= 16:
            battery_soc_factor = 0.2 # low availability (charging)
            
        total_battery_kw = (self.num_households * self.battery_penetration) * self.avg_battery_capacity_kwh * battery_soc_factor
        
        # Demand Response (Smart Thermostats) - Assume 1kW shaving per house
        dr_kw = self.num_households * 0.5 * 1.0 # 50% participation
        
        total_vpp_capacity_mw = (total_solar_kw + total_battery_kw + dr_kw) / 1000.0
        
        # Add random natural fluctuation
        total_vpp_capacity_mw *= random.uniform(0.95, 1.05)
        
        return {
            "total_capacity_mw": round(total_vpp_capacity_mw, 2),
            "solar_contribution_mw": round(total_solar_kw / 1000.0, 2),
            "battery_contribution_mw": round(total_battery_kw / 1000.0, 2),
            "demand_response_mw": round(dr_kw / 1000.0, 2),
            "active_nodes": int(self.num_households * random.uniform(0.8, 0.95))
        }
