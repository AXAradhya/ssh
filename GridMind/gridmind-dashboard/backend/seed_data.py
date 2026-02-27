"""Seed the GridMind SQLite database with realistic Delhi grid data."""
import datetime
import math
import random
from database import engine, SessionLocal, Base
from models import LoadData, Forecast, Intervention, Zone, Alert, DatasetMeta


def seed_all():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        seed_load_data(db)
        seed_forecasts(db)
        seed_interventions(db)
        seed_zones(db)
        seed_alerts(db)
        seed_dataset_meta(db)
        db.commit()
        print("✅ Database seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        db.close()


def seed_load_data(db):
    """Generate 30 days of 5-minute interval load data."""
    now = datetime.datetime.now().replace(second=0, microsecond=0)
    start = now - datetime.timedelta(days=30)
    current = start
    records = []

    while current <= now:
        hour = current.hour
        minute = current.minute
        day_of_week = current.weekday()
        is_weekend = day_of_week >= 5

        # Realistic Delhi demand pattern (MW)
        base = 3200
        if hour >= 6 and hour < 10:
            base = 3200 + (hour - 6) * 300 + minute * 5
        elif hour >= 10 and hour < 14:
            base = 4400 + math.sin((hour - 10 + minute / 60) * 0.8) * 200
        elif hour >= 14 and hour < 17:
            base = 4200 + (hour - 14) * 100
        elif hour >= 17 and hour < 21:
            base = 4600 + math.sin((hour - 17 + minute / 60) * 0.9) * 600
        elif hour >= 21:
            base = 4200 - (hour - 21) * 300
        else:
            base = 2800 + math.sin(hour * 0.5) * 200

        if is_weekend:
            base *= 0.85

        noise = random.gauss(0, 150)
        demand = max(2000, round(base + noise))

        # Industrial vs residential split
        if hour >= 9 and hour < 18:
            industrial = round(demand * random.uniform(0.50, 0.60))
        else:
            industrial = round(demand * random.uniform(0.18, 0.30))
        residential = demand - industrial

        # Temperature (correlated with demand)
        temp_base = 25 + 10 * math.sin((hour - 6) * math.pi / 12) if 6 <= hour <= 18 else 22
        temperature = round(temp_base + random.gauss(0, 2), 1)

        records.append(LoadData(
            timestamp=current,
            date=current.date(),
            time=current.time(),
            demand_mw=demand,
            industrial_mw=industrial,
            residential_mw=residential,
            temperature_c=temperature,
            is_holiday=False,
            day_type="weekend" if is_weekend else "weekday",
        ))

        current += datetime.timedelta(minutes=5)

        # Batch insert every 2000 records
        if len(records) >= 2000:
            db.bulk_save_objects(records)
            records = []

    if records:
        db.bulk_save_objects(records)
    print(f"  📊 Seeded load_data: ~{30 * 288} records (30 days × 288 intervals)")


def seed_forecasts(db):
    """Generate 72-hour forecast from now."""
    now = datetime.datetime.now().replace(minute=0, second=0, microsecond=0)
    records = []

    for h in range(72):
        target = now + datetime.timedelta(hours=h)
        hour = target.hour

        base = 3200
        if hour >= 6 and hour < 10:
            base = 3200 + (hour - 6) * 300
        elif hour >= 10 and hour < 14:
            base = 4400 + math.sin((hour - 10) * 0.8) * 200
        elif hour >= 14 and hour < 17:
            base = 4200 + (hour - 14) * 100
        elif hour >= 17 and hour < 21:
            base = 4600 + math.sin((hour - 17) * 0.9) * 600
        elif hour >= 21:
            base = 4200 - (hour - 21) * 300
        else:
            base = 2800 + math.sin(hour * 0.5) * 200

        noise = random.gauss(0, 200)
        predicted = max(2000, round(base + noise))
        uncertainty = min(h * 8, 400)

        # Carbon intensity
        if 10 <= hour < 15:
            carbon = 380 + random.uniform(0, 40)
        elif 6 <= hour < 10:
            carbon = 520 + random.uniform(0, 60)
        elif 15 <= hour < 18:
            carbon = 580 + random.uniform(0, 40)
        else:
            carbon = 650 + random.uniform(0, 80)

        # Risk score
        capacity = 5200
        ratio = predicted / capacity
        if ratio > 0.95:
            risk = 95
        elif ratio > 0.9:
            risk = 75 + (ratio - 0.9) * 400
        elif ratio > 0.85:
            risk = 50 + (ratio - 0.85) * 500
        elif ratio > 0.8:
            risk = 25 + (ratio - 0.8) * 500
        else:
            risk = ratio * 30

        records.append(Forecast(
            created_at=now,
            target_time=target,
            horizon_hours=h,
            predicted_demand_mw=predicted,
            upper_bound_mw=predicted + uncertainty,
            lower_bound_mw=max(predicted - uncertainty, 2000),
            model_name="Prophet",
            confidence=0.95,
            carbon_intensity=round(carbon),
            risk_score=round(min(risk, 99)),
        ))

    db.bulk_save_objects(records)
    print(f"  🔮 Seeded forecasts: {len(records)} records (72 hours)")


def seed_interventions(db):
    """Seed AI intervention actions."""
    now = datetime.datetime.now()
    items = [
        {"type": "alert", "category": "PEAK OVERLOAD ALERT",
         "text": "Peak overload risk at 18:47 Thursday — 87% probability. Grid capacity will be stressed by 340 MW above safe threshold.",
         "priority": "critical", "icon": "⚡"},
        {"type": "tariff", "category": "DYNAMIC TARIFF ADJUSTMENT",
         "text": "Increase rate to ₹9.2/kWh from 17:00-20:00 (current: ₹6.5/kWh). Expected demand reduction: 180 MW.",
         "priority": "high", "icon": "💰"},
        {"type": "nudge", "category": "CONSUMER NUDGE — EV CHARGING",
         "text": "Shift EV charging to 02:00-05:00 window. Save ₹47 per charge and avoid 1.2kg CO₂. 2,340 EV owners notified.",
         "priority": "medium", "icon": "🔋"},
        {"type": "curtail", "category": "INDUSTRIAL CURTAILMENT ORDER",
         "text": "Curtail Zone-B foundry cluster by 15% from 17:30-19:30. Estimated savings: ₹2.8L in demand charges. Compliance rate: 94%.",
         "priority": "high", "icon": "🏭"},
        {"type": "green", "category": "GREEN WINDOW IDENTIFIED",
         "text": "Lowest carbon intensity tomorrow 11:00-14:00 (solar peak). Carbon: 380 gCO₂/kWh vs 720 at peak. Shift 45MW of flexible load.",
         "priority": "info", "icon": "🌿"},
        {"type": "nudge", "category": "RESIDENTIAL DEMAND RESPONSE",
         "text": "Pre-cool homes before 17:00. Reduce AC usage during 17:00-20:00 peak. Incentive: ₹15 credit per household. 12,800 homes targeted.",
         "priority": "medium", "icon": "🏠"},
        {"type": "tariff", "category": "OFF-PEAK INCENTIVE",
         "text": "Super off-peak rate ₹3.1/kWh active 01:00-05:00. Industrial water heating and cold storage can save ₹1.2L by shifting loads.",
         "priority": "low", "icon": "🌙"},
        {"type": "alert", "category": "FREQUENCY DEVIATION WARNING",
         "text": "Grid frequency dropped to 49.85 Hz at 19:22. Auto-generation control activated. Monitor for cascading instability.",
         "priority": "critical", "icon": "📡"},
        {"type": "curtail", "category": "COMMERCIAL LOAD REDUCTION",
         "text": "Request 10% load reduction from Zone-A commercial complexes 18:00-20:00. 23 buildings targeted. Compliance incentive: ₹5,200.",
         "priority": "medium", "icon": "🏢"},
        {"type": "green", "category": "WIND GENERATION SURGE",
         "text": "Wind generation ramping up: 1,200 MW expected 01:00-06:00. Schedule energy-intensive processes for this window. Carbon: 280 gCO₂/kWh.",
         "priority": "info", "icon": "🌊"},
    ]
    for i, item in enumerate(items):
        db.add(Intervention(
            created_at=now - datetime.timedelta(minutes=i * 5),
            **item, status="active",
        ))
    print(f"  🤖 Seeded interventions: {len(items)} records")


def seed_zones(db):
    zones = [
        {"name": "Zone A — South Delhi", "grade": "A+", "score": 92, "color": "#10b981", "green_usage": 78, "response_rate": 95},
        {"name": "Zone D — Dwarka", "grade": "A", "score": 85, "color": "#10b981", "green_usage": 71, "response_rate": 88},
        {"name": "Zone E — East Delhi", "grade": "B+", "score": 74, "color": "#06b6d4", "green_usage": 58, "response_rate": 76},
        {"name": "Zone B — Industrial", "grade": "B", "score": 68, "color": "#06b6d4", "green_usage": 45, "response_rate": 70},
        {"name": "Zone F — North Delhi", "grade": "C+", "score": 55, "color": "#f59e0b", "green_usage": 32, "response_rate": 58},
        {"name": "Zone C — Old Delhi", "grade": "D", "score": 38, "color": "#ef4444", "green_usage": 18, "response_rate": 34},
    ]
    for z in zones:
        db.add(Zone(**z))
    print(f"  🏆 Seeded zones: {len(zones)} records")


def seed_alerts(db):
    now = datetime.datetime.now()
    items = [
        {"type": "overload", "severity": "critical", "title": "Peak Demand Overload Risk",
         "message": "Forecasted demand of 5,450 MW exceeds grid capacity of 5,200 MW at 18:47 Thursday. Probability: 87%.",
         "threshold_value": 5200, "actual_value": 5450},
        {"type": "carbon_spike", "severity": "warning", "title": "Carbon Intensity Spike",
         "message": "Carbon intensity reaching 780 gCO₂/kWh during 19:00-21:00. Coal generation at 68% of mix.",
         "threshold_value": 600, "actual_value": 780},
        {"type": "forecast_deviation", "severity": "warning", "title": "Forecast Deviation Detected",
         "message": "Actual demand deviating +8.2% from forecast at 14:00. Adjusting prediction model weights.",
         "threshold_value": 5.0, "actual_value": 8.2},
        {"type": "equipment", "severity": "info", "title": "Transformer Load Warning",
         "message": "Transformer T-42 in Zone B at 89% capacity. Schedule maintenance within 48 hours.",
         "threshold_value": 90, "actual_value": 89},
        {"type": "overload", "severity": "warning", "title": "Regional Grid Stress",
         "message": "Northern grid interconnection at 94% capacity. Cross-border power flow may be curtailed.",
         "threshold_value": 95, "actual_value": 94},
    ]
    for i, item in enumerate(items):
        db.add(Alert(created_at=now - datetime.timedelta(hours=i), **item))
    print(f"  🔔 Seeded alerts: {len(items)} records")


def seed_dataset_meta(db):
    db.add(DatasetMeta(
        name="Delhi SLDC Load Data (Seeded)",
        rows=30 * 288,
        date_range_start=datetime.date.today() - datetime.timedelta(days=30),
        date_range_end=datetime.date.today(),
        source="seed_data.py",
        description="30 days of simulated 5-minute interval load data based on Delhi SLDC patterns.",
    ))
    print(f"  📁 Seeded dataset_meta: 1 record")


if __name__ == "__main__":
    seed_all()
