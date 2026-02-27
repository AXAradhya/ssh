import random
from typing import Dict, Any, List

class WholesaleMarketBiddingAgent:
    """
    Wholesale Market Bidding Agent.
    An algorithmic trading bot that uses forecast data to buy power from neighboring
    grids or sell excess renewable power for profit.
    """
    def __init__(self):
        self.risk_tolerance = "moderate" # Option: 'aggressive', 'moderate', 'conservative'
        self.market_prices_usd_mwh = {
            "peak": 150.0,
            "off_peak": 40.0,
            "super_off_peak": 10.0
        }
    
    def calculate_optimal_bid(self, current_hour: int, forecasted_load_mw: float, forecasted_renewable_mw: float, battery_soc_mwh: float) -> Dict[str, Any]:
        """
        Calculates whether to buy, sell, or hold power based on forecasts and current pricing.
        """
        # Determine market tier
        if 16 <= current_hour <= 21:
            tier = "peak"
        elif 0 <= current_hour <= 6:
            tier = "super_off_peak"
        else:
            tier = "off_peak"
            
        current_price = self.market_prices_usd_mwh[tier] * random.uniform(0.9, 1.1)
        
        # Calculate net position
        net_power_mw = forecasted_renewable_mw - forecasted_load_mw
        
        action = "HOLD"
        trade_volume_mw = 0.0
        expected_profit_usd = 0.0
        
        # Simple Logic formulation
        if net_power_mw > 50.0:
            # We have excess power. Sell it or store it.
            if current_price > 80.0:
                action = "SELL"
                trade_volume_mw = net_power_mw * 0.8 # Keep 20% buffer
            else:
                action = "STORE" # Store in battery if price is too low
                
        elif net_power_mw < -100.0:
            # We are short on power. Buy it or discharge.
            if current_price < 60.0 or battery_soc_mwh < 50.0:
                action = "BUY"
                trade_volume_mw = abs(net_power_mw) * 1.1 # Buy 10% extra buffer
            else:
                action = "DISCHARGE" # Discharge from battery if price is too high
                
        # Risk tolerance adjustments
        if self.risk_tolerance == "aggressive":
            if action == "SELL": trade_volume_mw *= 1.2
            elif action == "BUY": trade_volume_mw *= 0.8
        elif self.risk_tolerance == "conservative":
            if action == "SELL": trade_volume_mw *= 0.8
            elif action == "BUY": trade_volume_mw *= 1.2
            
        if action in ["BUY", "SELL"]:
            expected_profit_usd = (trade_volume_mw * current_price) if action == "SELL" else -(trade_volume_mw * current_price)
            
        return {
            "hour": current_hour,
            "recommended_action": action,
            "trade_volume_mw": round(trade_volume_mw, 2),
            "expected_profit_usd": round(expected_profit_usd, 2),
            "market_price_usd_mwh": round(current_price, 2),
            "confidence_score": round(random.uniform(0.7, 0.95), 2)
        }
