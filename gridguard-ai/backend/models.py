from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    grid_operator = "grid_operator"
    analyst = "analyst"


# ─── Auth ────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    expires_in: int


# ─── Forecast ────────────────────────────────────────────────────────────────
class HourlyForecast(BaseModel):
    timestamp: str
    load_mw: float
    confidence_lower: float
    confidence_upper: float
    is_peak: bool
    solar_mw: float
    wind_mw: float
    temperature: float


class LoadForecastResponse(BaseModel):
    forecasts: List[HourlyForecast]
    peak_count: int
    avg_load_mw: float
    max_load_mw: float
    min_load_mw: float
    total_renewable_mw: float
    generated_at: str


# ─── Peak Risk ───────────────────────────────────────────────────────────────
class OptimizationSuggestion(BaseModel):
    type: str
    description: str
    impact_mw: float
    priority: str  # high | medium | low


class PeakRiskResponse(BaseModel):
    risk_score: float = Field(..., ge=0, le=100)
    risk_level: str  # critical | high | medium | low
    peak_hour: Optional[str]
    peak_load_mw: float
    threshold_mw: float
    suggestions: List[OptimizationSuggestion]
    industrial_reduction_pct: float
    ev_delay_minutes: int
    battery_discharge_pct: float
    estimated_savings_mwh: float

class Anomaly(BaseModel):
    timestamp: str
    load_mw: float
    z_score: float
    type: str
    severity: str

class AnomaliesResponse(BaseModel):
    anomalies: List[Anomaly]
    generated_at: str


# ─── Renewable ───────────────────────────────────────────────────────────────
class RenewableHourly(BaseModel):
    timestamp: str
    solar_mw: float
    wind_mw: float
    total_mw: float
    coverage_pct: float   # % of total demand covered


class RenewableForecastResponse(BaseModel):
    forecasts: List[RenewableHourly]
    avg_solar_mw: float
    avg_wind_mw: float
    peak_renewable_mw: float
    carbon_saved_tonnes: float
    cost_saved_usd: float


# ─── What-If Simulator ───────────────────────────────────────────────────────
class WhatIfRequest(BaseModel):
    temperature_delta: float = Field(default=0.0, ge=-10.0, le=10.0, description="°C offset")
    industrial_usage_delta_pct: float = Field(default=0.0, ge=-30.0, le=30.0)
    renewable_boost_pct: float = Field(default=0.0, ge=-50.0, le=50.0)
    hours: int = Field(default=24, ge=1, le=72)


class WhatIfResponse(BaseModel):
    baseline_forecasts: List[HourlyForecast]
    simulated_forecasts: List[HourlyForecast]
    delta_avg_mw: float
    delta_peak_mw: float
    new_risk_score: float
    carbon_impact_tonnes: float
    cost_impact_usd: float
    summary: str


# ─── SHAP / Explainability ───────────────────────────────────────────────────
class ShapFeature(BaseModel):
    feature: str
    importance: float
    direction: str  # positive | negative
    description: str


class ShapExplanationResponse(BaseModel):
    top_features: List[ShapFeature]
    explanation_text: str
    model_confidence: float
    timestamp: str


# ─── Recommendations ─────────────────────────────────────────────────────────
class Recommendation(BaseModel):
    id: str
    category: str  # demand_response | renewable | storage | behavioral
    title: str
    description: str
    impact_mw: float
    cost_savings_usd: float
    priority: str
    icon: str


class RecommendationsResponse(BaseModel):
    recommendations: List[Recommendation]
    total_impact_mw: float
    total_savings_usd: float
    generated_at: str


# ─── Dashboard ───────────────────────────────────────────────────────────────
class ZoneMetric(BaseModel):
    zone_id: str
    zone_name: str
    current_load_mw: float
    capacity_mw: float
    utilization_pct: float
    status: str  # normal | warning | critical
    region: str


class DashboardMetrics(BaseModel):
    current_load_mw: float
    peak_capacity_mw: float
    load_factor_pct: float
    renewable_share_pct: float
    system_health_score: float
    carbon_saved_today_tonnes: float
    cost_saved_today_usd: float
    active_alerts: int
    grid_frequency_hz: float
    zone_metrics: List[ZoneMetric]
    trend_24h: List[Dict[str, Any]]
    timestamp: str


# ─── Chat ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str
    timestamp: str


class ChatResponse(BaseModel):
    reply: str
    confidence: float
    related_metrics: Optional[Dict[str, Any]] = None
    timestamp: str

# 🟩🟩🟩 Advanced Features 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩

class NegotiationMessage(BaseModel):
    agent: str
    action: str
    message: str
    timestamp: str

class AgentNegotiationResponse(BaseModel):
    active: bool
    status: str
    negotiations: List[NegotiationMessage]
    final_shed_mw: float

class AssetHealth(BaseModel):
    asset_id: str
    type: str
    health_pct: float
    status: str
    estimated_days_to_failure: int

class AssetHealthResponse(BaseModel):
    assets: List[AssetHealth]

class PricingResponse(BaseModel):
    current_price_usd_per_mwh: float
    trend: str
    load_multiplier: float
    renewable_discount_pct: float

class LedgerTransaction(BaseModel):
    tx_id: str
    timestamp: str
    producer: str
    consumer: str
    energy_mwh: float
    carbon_credits: float
    market_value_usd: float

class LedgerResponse(BaseModel):
    transactions: List[LedgerTransaction]

class BESSState(BaseModel):
    state_of_charge_pct: float
    action: str
    flow_mw: float
    capacity_mwh: float

class IslandingState(BaseModel):
    active: bool
    status: str

class WeatherRadarState(BaseModel):
    active_threat: bool
    threat_type: str
    distance_km: float

class GridPhysicsResponse(BaseModel):
    bess: BESSState
    islanding: IslandingState
    weather_radar: WeatherRadarState
