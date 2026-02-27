from sqlalchemy import Column, Integer, Float, String, DateTime, Date, Time, Boolean, Text
from database import Base
import datetime


class LoadData(Base):
    __tablename__ = "load_data"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, index=True)
    date = Column(Date, index=True)
    time = Column(Time)
    demand_mw = Column(Float)
    industrial_mw = Column(Float, nullable=True)
    residential_mw = Column(Float, nullable=True)
    temperature_c = Column(Float, nullable=True)
    is_holiday = Column(Boolean, default=False)
    day_type = Column(String(20))  # weekday / weekend / holiday


class Forecast(Base):
    __tablename__ = "forecasts"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    target_time = Column(DateTime, index=True)
    horizon_hours = Column(Integer)  # 24, 48, 72
    predicted_demand_mw = Column(Float)
    upper_bound_mw = Column(Float)
    lower_bound_mw = Column(Float)
    model_name = Column(String(50), default="Prophet")
    confidence = Column(Float, default=0.95)
    carbon_intensity = Column(Float, nullable=True)  # gCO2/kWh
    risk_score = Column(Float, nullable=True)


class Intervention(Base):
    __tablename__ = "interventions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    type = Column(String(30))  # alert, tariff, nudge, curtail, green
    category = Column(String(100))
    text = Column(Text)
    priority = Column(String(20))  # critical, high, medium, low, info
    icon = Column(String(10))
    status = Column(String(20), default="active")  # active, acknowledged, resolved


class Zone(Base):
    __tablename__ = "zones"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100))
    grade = Column(String(5))
    score = Column(Integer)
    color = Column(String(20))
    green_usage = Column(Integer)
    response_rate = Column(Integer)


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    type = Column(String(50))  # overload, carbon_spike, equipment, forecast_deviation
    severity = Column(String(20))  # critical, warning, info
    title = Column(String(200))
    message = Column(Text)
    threshold_value = Column(Float, nullable=True)
    actual_value = Column(Float, nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)


class DatasetMeta(Base):
    __tablename__ = "dataset_meta"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200))
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    rows = Column(Integer)
    date_range_start = Column(Date, nullable=True)
    date_range_end = Column(Date, nullable=True)
    source = Column(String(200), default="manual_upload")
    description = Column(Text, nullable=True)


class GridStation(Base):
    __tablename__ = "grid_stations"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200))
    station_type = Column(String(50))
    latitude = Column(Float)
    longitude = Column(Float)
    capacity_mw = Column(Float)
    current_load_mw = Column(Float)
    status = Column(String(20), default="online")
    voltage_kv = Column(Float, nullable=True)
    zone = Column(String(100), nullable=True)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    role = Column(String(20))  # user, assistant
    content = Column(Text)
    session_id = Column(String(100), default="default")


class GeminiInsight(Base):
    __tablename__ = "gemini_insights"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    dataset_id = Column(Integer, nullable=True)
    insight_type = Column(String(50))  # csv_analysis, alert, recommendation
    summary = Column(Text)
    details = Column(Text)  # JSON string
    risk_level = Column(String(20), nullable=True)


