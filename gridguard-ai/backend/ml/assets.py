import random
from typing import Dict, Any

class AssetHealthModel:
    def __init__(self):
        # Base health for mock assets
        self.assets = {
            "TX-North": {"type": "Transformer", "health": 100.0, "wear_rate": 0.05, "critical_threshold": 60.0},
            "WT-Alpha": {"type": "Wind Turbine", "health": 100.0, "wear_rate": 0.08, "critical_threshold": 70.0},
            "TX-South": {"type": "Transformer", "health": 100.0, "wear_rate": 0.04, "critical_threshold": 55.0},
            "SOL-Desert": {"type": "Solar Inverter", "health": 100.0, "wear_rate": 0.02, "critical_threshold": 80.0},
        }

    def simulate_wear(self, load_stress: float, weather_severity: float) -> Dict[str, Any]:
        """
        Simulate accelerated wear and tear based on high load (stress) and extreme weather.
        Returns the health status of all assets.
        """
        results = []
        for asset_id, data in self.assets.items():
            # Formula: Base wear + (Load Stress factor) + (Weather severity factor) + random volatility
            stress_factor = (load_stress ** 1.5) * 0.1
            weather_factor = (weather_severity ** 2.0) * 0.2
            
            total_wear = data["wear_rate"] + stress_factor + weather_factor + random.uniform(0.01, 0.1)
            
            # Degrade health
            data["health"] -= total_wear
            data["health"] = max(0.0, data["health"]) # Floor at 0
            
            status = "Normal"
            if data["health"] < data["critical_threshold"]:
                status = "Critical Repair Needed"
            elif data["health"] < (data["critical_threshold"] + 15):
                status = "Warning: Approaching Threshold"
                
            results.append({
                "asset_id": asset_id,
                "type": data["type"],
                "health_pct": round(data["health"], 2),
                "status": status,
                "estimated_days_to_failure": int(data["health"] / max(total_wear, 0.01))
            })
            
        return {"assets": results}

class TransformerDigitalTwin:
    """
    Physics-informed ML model tracking internal thermal temperature of transformers.
    Calculates insulation 'loss-of-life' based on ambient weather and loading.
    """
    def __init__(self, name: str, rated_capacity_mw: float = 100.0):
        self.name = name
        self.rated_capacity = rated_capacity_mw
        self.top_oil_temp = 40.0 # deg C, initial
        self.hot_spot_temp = 50.0 # deg C, initial
        self.baseline_life_hours = 150000.0 # Standard insulation life
        self.accumulated_loss_of_life = 0.0

    def calculate_thermal_aging(self, current_load_mw: float, ambient_temp_c: float, elapsed_hours: float = 1.0) -> Dict[str, Any]:
        """
        Calculates transformer top-oil temperature, hot-spot temperature, and aging rate.
        Simulates IEEE C57.91 standard thermal calculations.
        """
        # Load ratio (K)
        k = current_load_mw / self.rated_capacity
        
        # Simplified Top-Oil calculation (tau_oil ~ 2.5 hours)
        steady_state_top_oil_rise = 50.0 * (k ** 1.6) # Assume 50C rise at full load
        target_top_oil = ambient_temp_c + steady_state_top_oil_rise
        
        # Exponential step towards target (simplified differential equation)
        time_constant_oil = 2.5 
        step = min(1.0, elapsed_hours / time_constant_oil)
        self.top_oil_temp += (target_top_oil - self.top_oil_temp) * step
        
        # Hot-spot temperature calculation
        steady_state_grad = 30.0 * (k ** 1.6) # Gradiant between top-oil and winding hot-spot
        self.hot_spot_temp = self.top_oil_temp + steady_state_grad
        
        # Aging Acceleration Factor (FAA) based on Arrhenius equation for insulation
        # Reference temp is typically 110C for 1.0 aging rate
        reference_temp_k = 110.0 + 273.15
        hot_spot_k = self.hot_spot_temp + 273.15
        
        # Standard constants for Kraft paper insulation
        B = 15000.0 
        
        if self.hot_spot_temp < 50.0:
            faa = 0.0 # Negligible aging
        else:
            faa = math.exp((B / reference_temp_k) - (B / hot_spot_k))
            
        # Add random noise mimicking sensor inaccuracies 
        self.hot_spot_temp += random.uniform(-1.0, 1.0)
        
        # Update lifetime
        loss_this_step = faa * elapsed_hours
        self.accumulated_loss_of_life += loss_this_step
        remaining_life_pct = max(0.0, 100.0 * (1.0 - (self.accumulated_loss_of_life / self.baseline_life_hours)))
        
        return {
            "transformer_id": self.name,
            "ambient_temp_c": ambient_temp_c,
            "load_ratio_pct": round(k * 100, 1),
            "top_oil_temp_c": round(self.top_oil_temp, 1),
            "hot_spot_temp_c": round(self.hot_spot_temp, 1),
            "aging_acceleration_factor": round(faa, 3),
            "remaining_life_pct": round(remaining_life_pct, 2)
        }
