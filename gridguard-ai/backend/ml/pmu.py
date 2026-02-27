import random
import math
from typing import Dict, Any, List
from datetime import datetime

class PMUDisturbanceMonitor:
    """
    Real-time PMU (Phasor Measurement Unit) Disturbance Monitor.
    Simulates high-speed grid frequency checks at 60Hz. 
    Detects micro-disturbances before they become large faults.
    """
    def __init__(self):
        self.nominal_frequency_hz = 60.0 # US Standard
        self.history_buffer = [] # Store last 100 readings
        
    def analyze_phasor_data(self, current_load_mw: float, wind_penetration_pct: float) -> Dict[str, Any]:
        """
        Simulate high-frequency PMU data analysis for stability.
        High wind penetration increases frequency volatility (low inertia).
        """
        # Base frequency drift
        base_drift = random.uniform(-0.02, 0.02)
        
        # Volatility caused by low-inertia renewables
        inertia_loss_factor = max(0.0, (wind_penetration_pct - 20.0) / 100.0) # Noticeable >20%
        renewable_noise = random.uniform(-0.05, 0.05) * inertia_loss_factor
        
        # Load step change impact (assuming randomly jumping loads)
        load_jump_impact = 0.0
        if random.random() > 0.95: # 5% chance of sudden heavy industrial load kicking on
            load_jump_impact = -0.15 # Hz drop
            
        current_hz = self.nominal_frequency_hz + base_drift + renewable_noise + load_jump_impact
        current_hz = round(current_hz, 4)
        
        # Calculate RoCoF (Rate of Change of Frequency)
        rocof = 0.0
        if self.history_buffer:
            prev_hz = self.history_buffer[-1]
            rocof = (current_hz - prev_hz) / 0.1 # Assume 100ms between PMU samples
            
        self.history_buffer.append(current_hz)
        if len(self.history_buffer) > 100:
            self.history_buffer.pop(0)
            
        # Disturbance Detection Rules
        status = "STABLE"
        alerts = []
        is_disturbance = False
        
        if current_hz < 59.8 or current_hz > 60.2:
            status = "CRITICAL LIMIT BREACH"
            is_disturbance = True
            alerts.append(f"Grid frequency out of bounds: {current_hz} Hz")
            
        if abs(rocof) > 0.5: # 0.5 Hz/s is a standard critical RoCoF limit
            if status != "CRITICAL LIMIT BREACH":
                status = "HIGH RoCoF DETECTED"
            is_disturbance = True
            alerts.append(f"Dangerous Rate of Change of Frequency: {round(rocof, 3)} Hz/s")
            
        if is_disturbance and wind_penetration_pct > 30.0:
            alerts.append("Warning: Low system inertia detected due to high renewable dispatch. Consider engaging fast-frequency response (FFR) batteries.")
            
        return {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "frequency_hz": current_hz,
            "rocof_hz_per_sec": round(rocof, 4),
            "status": status,
            "disturbance_detected": is_disturbance,
            "alerts": alerts,
            "system_inertia": "LOW" if wind_penetration_pct > 25.0 else "NOMINAL"
        }
