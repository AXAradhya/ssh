# ⚡ GridGuard AI

> **AI-powered Smart Grid Load Forecasting & Optimization Platform**
> Built for real-world energy intelligence — hackathon-grade, investor-demo ready.

---

## 🏗️ Architecture

```
gridguard-ai/
├── frontend/          React (CRA) + TypeScript + Tailwind + Framer Motion
├── backend/           FastAPI + Python
│   ├── ml/            XGBoost · SHAP · Renewable physics models
│   └── routers/       8 REST API + WebSocket endpoints
├── docker/            Dockerfile + docker-compose (MySQL + Backend)
└── docs/              API docs
```

---

## 🚀 Quick Start

### 1. MySQL Setup
Create a database called `gridguard`:
```sql
CREATE DATABASE gridguard;
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Edit .env with your MySQL credentials
uvicorn main:app --reload --port 8000
```
The server auto-trains the XGBoost model on first startup (takes ~60 seconds) and seeds the database with demo users.

### 3. Frontend Setup
```bash
cd frontend
npm start          # http://localhost:3000
```

---

## 🔐 Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Grid Operator | `operator1` | `operator123` |
| Analyst | `analyst1` | `analyst123` |

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | JWT authentication |
| GET | `/api/dashboard/metrics` | Live KPIs + zone data |
| GET | `/api/forecast/load?hours=24` | XGBoost load forecast |
| GET | `/api/forecast/renewable?hours=24` | Solar + wind forecast |
| GET | `/api/risk/peak-analysis` | Risk score (0–100) + suggestions |
| POST | `/api/simulate/what-if` | What-if simulation |
| GET | `/api/recommendations` | AI optimization recommendations |
| GET | `/api/shap/explanation` | SHAP feature importances |
| POST | `/api/chat` | AI chat assistant |
| WS | `/ws/live` | Real-time grid streaming (3s) |

Full interactive docs at: **http://localhost:8000/docs**

---

## 🧠 ML Architecture

- **Dataset**: 2-year synthetic hourly grid data (17,520 records) with realistic seasonal, daily, temperature, and holiday patterns
- **Model**: XGBoost regressor (400 trees, MAE ~18–25 MW)
- **Features**: 14 engineered features including lag-1h, lag-24h, lag-7d, rolling mean
- **Explainability**: SHAP TreeExplainer — top-8 feature importances per forecast
- **Renewable**: Physics-based solar PV model + wind turbine power curve (50×3MW farm)

---

## 🐳 Docker Deployment

```bash
cd docker
docker-compose up -d
# Backend: http://localhost:8000
```

---

## 🎨 Design System

- **Background**: Dark navy (`#0a0e1f`) with animated grid lines
- **Primary**: Neon electric blue (`#00d4ff`) with glow effects
- **Cards**: Glassmorphism (blur + translucent border)
- **Typography**: Inter (UI) + JetBrains Mono (metrics)

---

## ⚙️ Environment Variables

See `.env.example` for full reference.
