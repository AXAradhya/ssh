"""GridMind API — FastAPI Backend for Smart Grid AI Agent."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routes import forecast, load, carbon, interventions, alerts, data_management, grid, chatbot, simulator
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="GridMind API",
    description="Smart Grid AI Agent — Forecast, Detect, Act",
    version="1.0.0",
)

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(forecast.router)
app.include_router(load.router)
app.include_router(carbon.router)
app.include_router(interventions.router)
app.include_router(alerts.router)
app.include_router(data_management.router)
app.include_router(grid.router)
app.include_router(chatbot.router)
app.include_router(simulator.router)


@app.on_event("startup")
def startup():
    init_db()
    # Auto-seed if DB is empty
    from database import SessionLocal
    from models import LoadData
    db = SessionLocal()
    count = db.query(LoadData).count()
    db.close()
    if count == 0:
        print("📦 Empty database detected — seeding with default data...")
        from seed_data import seed_all
        seed_all()
    else:
        print(f"✅ Database has {count} load records — skipping seed.")


@app.get("/")
def root():
    return {
        "name": "GridMind API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}
