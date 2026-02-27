from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Dict, Any, List
from datetime import datetime
import json
import random
import asyncio

# Removed non-existent services import. If auth is needed later, we'll use the correct path.
from models import (
    AgentNegotiationResponse,
    AssetHealthResponse,
    PricingResponse,
    LedgerResponse,
    GridPhysicsResponse
)

from ml.agents import MultiAgentNegotiator
from ml.assets import AssetHealthModel, TransformerDigitalTwin
from ml.economics import DynamicPricer, CarbonLedger
from ml.grid_physics import GridPhysicsModel
from ml.ev_scheduler import EVScheduler
from ml.nlp_parser import GridNLPParser
from ml.security import GridIDS
from ml.vpp import VPPAggregator
from ml.trading import WholesaleMarketBiddingAgent
from ml.topology import SelfHealingGrid
from ml.pmu import PMUDisturbanceMonitor

router = APIRouter(prefix="/api/advanced", tags=["Advanced Simulation"])

# Global singleton instances for the session
negotiator = MultiAgentNegotiator()
asset_model = AssetHealthModel()
pricer = DynamicPricer()
ledger = CarbonLedger()
physics = GridPhysicsModel()
ev_scheduler = EVScheduler()
nlp_parser = GridNLPParser()

ids_monitor = GridIDS()
transformer_twin = TransformerDigitalTwin("TX-MAIN-001")
vpp_aggregator = VPPAggregator()
market_agent = WholesaleMarketBiddingAgent()
self_healing_grid = SelfHealingGrid()
pmu_monitor = PMUDisturbanceMonitor()

@router.get("/negotiate", response_model=AgentNegotiationResponse)
async def get_negotiation(current_load_mw: float, capacity_mw: float):
    """Simulate multi-agent negotiation if grid load is critical."""
    result = negotiator.simulate_negotiation(current_load_mw, capacity_mw)
    return result

@router.get("/assets", response_model=AssetHealthResponse)
async def get_asset_health(load_stress: float = 1.0, weather_severity: float = 1.0):
    """Get predictive maintenance health of grid assets."""
    result = asset_model.simulate_wear(load_stress, weather_severity)
    return result

@router.get("/eco/price", response_model=PricingResponse)
async def get_live_price(current_load_mw: float, renewable_pct: float):
    """Calculate highly volatile dynamic energy pricing."""
    result = pricer.calculate_live_price(current_load_mw, renewable_pct)
    return result

@router.post("/eco/ledger/mine")
async def mine_carbon_block(producer_id: str, consumer_id: str, mwh_traded: float):
    """Artificially trigger the ledger to mine a block representing carbon credits."""
    tx = ledger.generate_block(mwh_traded, producer_id, consumer_id)
    return tx

@router.get("/eco/ledger", response_model=LedgerResponse)
async def get_ledger(limit: int = 10):
    """Get latest immutable energy ledger transactions."""
    transactions = ledger.get_recent_transactions(limit)
    return {"transactions": transactions}

@router.get("/grid/physics", response_model=GridPhysicsResponse)
async def get_grid_physics(current_load_mw: float, solar_mw: float, wind_mw: float, severity_flag: int = 1):
    """Simulate physical grid attributes like battery storage state and sub-grid islanding."""
    result = physics.simulate_grid_state(current_load_mw, solar_mw, wind_mw, severity_flag)
    return result

@router.get("/ev/schedule")
async def get_ev_schedule(base_load_mw: float = 850, solar_mw: float = 150, ev_count: int = 5000):
    """Optimize EV charging schedules to balance grid load."""
    schedule = ev_scheduler.optimize_fleet_charging(base_load_mw, solar_mw, ev_count)
    return schedule

@router.post("/nlp/query")
async def process_nlp_query(query: str):
    """Process natural language queries related to grid operations."""
    response = nlp_parser.parse_query(query)
    return response

@router.get("/security/ids")
async def get_ids_scan(current_traffic_rate: float = 650.0, failed_auth_attempts: int = 5, foreign_ips_detected: int = 0):
    """Cybersecurity Intrusion Detection System (IDS) scan."""
    result = ids_monitor.analyze_traffic(current_traffic_rate, failed_auth_attempts, foreign_ips_detected)
    return result

@router.get("/assets/transformer")
async def get_transformer_twin(current_load_mw: float = 85.0, ambient_temp_c: float = 35.0, elapsed_hours: float = 1.0):
    """Transformer Digital Twin thermal aging calculation."""
    result = transformer_twin.calculate_thermal_aging(current_load_mw, ambient_temp_c, elapsed_hours)
    return result

@router.get("/vpp/capacity")
async def get_vpp_capacity(current_hour: int = 14, weather_condition: str = "sunny"):
    """Calculate Virtual Power Plant (VPP) aggregated capacity."""
    result = vpp_aggregator.calculate_vpp_capacity(current_hour, weather_condition)
    return result

@router.get("/trading/bid")
async def get_trading_bid(current_hour: int = 14, forecasted_load_mw: float = 500.0, forecasted_renewable_mw: float = 200.0, battery_soc_mwh: float = 50.0):
    """Algorithmic Wholesale Market Bidding Agent."""
    result = market_agent.calculate_optimal_bid(current_hour, forecasted_load_mw, forecasted_renewable_mw, battery_soc_mwh)
    return result

@router.get("/topology/heal")
async def get_topology_heal(failed_node: str = "Substation-C", target_node: str = "Substation-F", required_mw: float = 100.0):
    """Self-Healing Grid Protocol routing optimization."""
    result = self_healing_grid.calculate_reroute(failed_node, target_node, required_mw)
    return result

@router.get("/pmu/monitor")
async def get_pmu_monitor(current_load_mw: float = 500.0, wind_penetration_pct: float = 35.0):
    """PMU Disturbance high-frequency monitoring."""
    result = pmu_monitor.analyze_phasor_data(current_load_mw, wind_penetration_pct)
    return result
