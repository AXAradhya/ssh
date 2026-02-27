import random
import uuid
from datetime import datetime
from typing import Dict, Any, List

class DynamicPricer:
    def __init__(self, base_rate_usd: float = 45.0):
        self.base_rate = base_rate_usd

    def calculate_live_price(self, current_load_mw: float, renewable_pct: float) -> Dict[str, Any]:
        """
        Calculate real-time power price.
        High load = high price. High renewables = low price.
        """
        # Exaggerated volatility curve for demo purposes
        load_multiplier = 1.0 + ((current_load_mw / 1000.0) ** 2) * 0.5 
        renewable_discount = 1.0 - (renewable_pct * 0.8) # Up to 80% discount if fully green
        
        volatile_factor = random.uniform(0.95, 1.05)
        
        live_price = self.base_rate * load_multiplier * renewable_discount * volatile_factor
        
        return {
            "current_price_usd_per_mwh": round(live_price, 2),
            "trend": "UP" if live_price > self.base_rate else "DOWN",
            "load_multiplier": round(load_multiplier, 2),
            "renewable_discount_pct": round((1.0 - renewable_discount) * 100, 1)
        }

from database import SessionLocal, LedgerTransactionModel

class CarbonLedger:
    def __init__(self):
        pass

    def generate_block(self, green_mwh_produced: float, producer_id: str = None, consumer_id: str = None) -> Dict[str, Any]:
        """
        Simulate a blockchain-like ledger transaction for carbon credits and save to DB.
        """
        # 1 MWh green energy = ~0.4 tonnes CO2 offset = ~1 carbon credit
        credits_earned = green_mwh_produced * 0.4
        usd_value = credits_earned * 85.0 # Assume $85/tonne social cost of carbon or market rate
        
        tx_id_str = str(uuid.uuid4())
        producer_str = producer_id or random.choice(["Solar Farm North", "Wind Park Alpha", "Residential VPP"])
        consumer_str = consumer_id or random.choice(["Industrial Zone A", "EV Fleet Node", "Datacenter US-East"])

        db = SessionLocal()
        try:
            tx = LedgerTransactionModel(
                tx_id=tx_id_str,
                producer=producer_str,
                consumer=consumer_str,
                energy_mwh=round(green_mwh_produced, 2),
                carbon_credits=round(credits_earned, 3),
                market_value_usd=round(usd_value, 2)
            )
            db.add(tx)
            db.commit()
            db.refresh(tx)
            
            return {
                "tx_id": tx.tx_id,
                "timestamp": tx.timestamp.isoformat() if tx.timestamp else datetime.now().isoformat(),
                "producer": tx.producer,
                "consumer": tx.consumer,
                "energy_mwh": tx.energy_mwh,
                "carbon_credits": tx.carbon_credits,
                "market_value_usd": tx.market_value_usd
            }
        except Exception as e:
            db.rollback()
            print(f"Failed to generate ledger block: {e}")
            return {}
        finally:
            db.close()
        
    def get_recent_transactions(self, limit: int = 10) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            records = db.query(LedgerTransactionModel).order_by(LedgerTransactionModel.timestamp.desc()).limit(limit).all()
            return [
                {
                    "tx_id": r.tx_id,
                    "timestamp": r.timestamp.isoformat() if r.timestamp else "",
                    "producer": r.producer,
                    "consumer": r.consumer,
                    "energy_mwh": r.energy_mwh,
                    "carbon_credits": r.carbon_credits,
                    "market_value_usd": r.market_value_usd
                }
                for r in records
            ]
        finally:
            db.close()
