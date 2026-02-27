"""
GridGuard AI — FastAPI Backend Entry Point
Production-grade smart grid load forecasting and optimization platform.
"""
import os
import sys
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("gridguard")

# ── App Lifespan (startup / shutdown) ─────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("⚡ GridGuard AI starting up …")
    
    # Initialize database
    try:
        from database import init_db
        init_db()
        logger.info("✅ Database initialized and seeded.")
    except Exception as e:
        logger.warning(f"⚠️  Database init failed (non-fatal): {e}")

    # Pre-load ML model (trains if no cache)
    try:
        from ml.forecaster import get_forecaster
        fc = get_forecaster()
        logger.info(f"✅ XGBoost model ready. MAE={fc.mae:.1f} MW")
    except Exception as e:
        logger.error(f"❌ ML model load failed: {e}")

    yield
    logger.info("🔌 GridGuard AI shutting down.")


# ── FastAPI App ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="GridGuard AI",
    description="AI-powered Smart Grid Load Forecasting & Optimization Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from routers import auth, forecast, risk, simulate, recommendations, dashboard, chat, ws, advanced, zones, operations

app.include_router(auth.router)
app.include_router(forecast.router)
app.include_router(risk.router)
app.include_router(simulate.router)
app.include_router(recommendations.router)
app.include_router(dashboard.router)
app.include_router(chat.router)
app.include_router(ws.router)
app.include_router(advanced.router)
app.include_router(zones.router)
app.include_router(operations.router)


# ── Health & Root ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "GridGuard AI",
        "version": "1.0.0",
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "⚡ GridGuard AI API",
        "docs": "/docs",
        "health": "/health"
    }


# ── Global Exception Handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."}
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("APP_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
