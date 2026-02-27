from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
from dotenv import load_dotenv
import os

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "gridguard")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

DATABASE_URL = "sqlite:///./gridguard.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum("admin", "grid_operator", "analyst", name="user_role"), default="analyst")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)


class ForecastHistoryModel(Base):
    __tablename__ = "forecast_history"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    forecast_type = Column(String(20))  # 'load' | 'renewable'
    hours_ahead = Column(Integer)
    peak_detected = Column(Boolean, default=False)
    peak_risk_score = Column(Float, nullable=True)
    requested_by = Column(String(50), nullable=True)
    parameters_json = Column(Text, nullable=True)


class GridZoneModel(Base):
    __tablename__ = "grid_zones"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(String(10), unique=True)
    zone_name = Column(String(100))
    capacity_mw = Column(Float)
    current_load_mw = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    region = Column(String(50))


class LedgerTransactionModel(Base):
    __tablename__ = "ledger_transactions"

    id = Column(Integer, primary_key=True, index=True)
    tx_id = Column(String(100), unique=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    producer = Column(String(100))
    consumer = Column(String(100))
    energy_mwh = Column(Float)
    carbon_credits = Column(Float)
    market_value_usd = Column(Float)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables and seed initial data."""
    Base.metadata.create_all(bind=engine)
    seed_initial_data()


def seed_initial_data():
    """Seed demo users and grid zones."""
    from auth import get_password_hash
    
    db = SessionLocal()
    try:
        # Seed users if not exist
        demo_users = [
            {"username": "admin", "email": "admin@gridguard.ai", "password": "admin123", "role": "admin"},
            {"username": "operator1", "email": "operator@gridguard.ai", "password": "operator123", "role": "grid_operator"},
            {"username": "analyst1", "email": "analyst@gridguard.ai", "password": "analyst123", "role": "analyst"},
        ]
        for u in demo_users:
            existing = db.query(UserModel).filter(UserModel.username == u["username"]).first()
            if not existing:
                user = UserModel(
                    username=u["username"],
                    email=u["email"],
                    hashed_password=get_password_hash(u["password"]),
                    role=u["role"]
                )
                db.add(user)

        # Seed grid zones if not exist
        zones = [
            {"zone_id": "ZN-A1", "zone_name": "Industrial North", "capacity_mw": 450.0, "current_load_mw": 312.0, "region": "North"},
            {"zone_id": "ZN-A2", "zone_name": "Residential East", "capacity_mw": 280.0, "current_load_mw": 195.0, "region": "East"},
            {"zone_id": "ZN-B1", "zone_name": "Commercial Central", "capacity_mw": 520.0, "current_load_mw": 410.0, "region": "Central"},
            {"zone_id": "ZN-B2", "zone_name": "Solar Farm South", "capacity_mw": 180.0, "current_load_mw": 88.0, "region": "South"},
            {"zone_id": "ZN-C1", "zone_name": "Wind Corridor West", "capacity_mw": 240.0, "current_load_mw": 142.0, "region": "West"},
            {"zone_id": "ZN-C2", "zone_name": "Mixed Use SE", "capacity_mw": 310.0, "current_load_mw": 223.0, "region": "Southeast"},
        ]
        for z in zones:
            existing = db.query(GridZoneModel).filter(GridZoneModel.zone_id == z["zone_id"]).first()
            if not existing:
                zone = GridZoneModel(**z)
                db.add(zone)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Seeding error (non-fatal): {e}")
    finally:
        db.close()
