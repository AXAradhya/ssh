import math
import random
from typing import List, Dict, Any

class EVScheduler:
    def __init__(self):
        # Time intervals in 24h format (e.g. 0-23)
        self.hours = list(range(24))

    def optimize_fleet_charging(self, base_load_mw: float, solar_mw: float, active_evs: int = 5000) -> Dict[str, Any]:
        """
        Simulate an optimization routine that shifts EV charging demand.
        Goal: Shift charging to hours with high solar generation and low base load.
        """
        # Baseline: Unmanaged charging usually peaks between 17:00 and 21:00 (when people get home)
        baseline_profile = []
        for h in self.hours:
            if 17 <= h <= 21:
                intensity = random.uniform(0.7, 1.0)
            else:
                intensity = random.uniform(0.1, 0.3)
            # Each EV roughly uses 7kW when charging fast, but we average it out.
            mw_demand = (active_evs * intensity * 5) / 1000.0 # MW
            baseline_profile.append({"hour": h, "demand_mw": round(mw_demand, 1)})
            
        # Optimization logic: Shift demand to mid-day (10:00 - 15:00) when solar is high
        # or deep night (1:00 - 4:00) when base load is lowest.
        optimized_profile = []
        total_energy = sum(p["demand_mw"] for p in baseline_profile)
        
        # Create a "desirability" score for each hour to distribute the energy
        # Higher score = better to charge
        scores = []
        for h in self.hours:
            score = 1.0
            if 10 <= h <= 15: # High solar proxy
                score += 3.0
            if 1 <= h <= 4: # Deep night, low load
                score += 2.0
            if 17 <= h <= 21: # Peak hours, bad time to charge
                score = 0.2
            scores.append(score)
            
        total_score = sum(scores)
        
        for i, h in enumerate(self.hours):
            # Allocate the total energy proportionally to the desirability score
            allocated_mw = total_energy * (scores[i] / total_score)
            # Add a bit of realistic noise
            allocated_mw *= random.uniform(0.9, 1.1)
            optimized_profile.append({"hour": h, "demand_mw": round(allocated_mw, 1)})
            
        # Calculate impact
        baseline_peak = max(p["demand_mw"] for p in baseline_profile)
        optimized_peak = max(p["demand_mw"] for p in optimized_profile)
        peak_reduction_pct = ((baseline_peak - optimized_peak) / baseline_peak) * 100 if baseline_peak > 0 else 0
        
        return {
            "total_evs": active_evs,
            "baseline_peak_mw": round(baseline_peak, 1),
            "optimized_peak_mw": round(optimized_peak, 1),
            "peak_reduction_pct": round(peak_reduction_pct, 1),
            "schedule": [
                {
                    "hour": h,
                    "baseline_mw": baseline_profile[h]["demand_mw"],
                    "optimized_mw": optimized_profile[h]["demand_mw"]
                }
                for h in self.hours
            ]
        }
