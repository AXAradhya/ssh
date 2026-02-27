import random
from typing import List, Dict, Any
from datetime import datetime, timezone

class MultiAgentNegotiator:
    def __init__(self):
        self.agents = ['Grid Operator', 'EV Fleet Manager', 'Industrial AI Controller']

    def simulate_negotiation(self, current_load_mw: float, capacity_mw: float) -> Dict[str, Any]:
        """
        Simulate a multi-agent negotiation logic if grid load is approaching absolute capacity.
        Returns a sequence of actions taken by different simulated AI agents.
        """
        load_ratio = current_load_mw / capacity_mw
        
        # Only trigger negotiation if load is critically high (e.g. > 90% capacity)
        if load_ratio < 0.90:
            return {
                "active": False,
                "status": "Grid Stable. Agents dormant.",
                "negotiations": [],
                "final_shed_mw": 0
            }

        # Simulate a crisis negotiation
        required_shedding = current_load_mw - (capacity_mw * 0.85) # Try to get back down to 85% safely
        
        negotiations = []
        time_now = datetime.now(timezone.utc).strftime("%H:%M:%S")

        negotiations.append({
            "agent": "Grid Operator",
            "action": "BROADCAST",
            "message": f"CRITICAL: Load threshold exceeded ({load_ratio*100:.1f}%). Requesting {required_shedding:.1f} MW cumulative reduction immediately.",
            "timestamp": time_now
        })

        # EV Fleet response based on random state of charge
        ev_bid_mw = min(required_shedding * 0.4, random.uniform(20.0, 150.0))
        negotiations.append({
            "agent": "EV Fleet Manager",
            "action": "BID",
            "message": f"Delaying charging cycle for 2,400 vehicles. Can shed {ev_bid_mw:.1f} MW. Impact on user commute: Minimal.",
            "timestamp": time_now
        })

        # Industrial response based on random rigidness
        remaining_shed = required_shedding - ev_bid_mw
        ind_bid_mw = min(remaining_shed, random.uniform(50.0, 300.0))
        negotiations.append({
            "agent": "Industrial AI Controller",
            "action": "BID",
            "message": f"Spinning down Arc Furnace #3 and adjusting HVAC setpoints. Shedding {ind_bid_mw:.1f} MW. Compensation rate requested: $120/MWh.",
            "timestamp": time_now
        })

        total_shed = ev_bid_mw + ind_bid_mw
        resolution = "SUCCESS" if total_shed >= (required_shedding * 0.9) else "PARTIAL_SUCCESS"

        negotiations.append({
            "agent": "Grid Operator",
            "action": "ACCEPT",
            "message": f"Bids accepted. Total load shed secured: {total_shed:.1f} MW. Grid stabilizing to target state.",
            "timestamp": time_now
        })

        return {
            "active": True,
            "status": resolution,
            "negotiations": negotiations,
            "final_shed_mw": total_shed
        }
