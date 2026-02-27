"""Chatbot + Gemini Analysis routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from database import get_db
from models import ChatMessage, GeminiInsight, LoadData, Forecast, Alert, Intervention, Zone
from gemini_service import chat_with_context, generate_alerts_from_data
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


def build_db_context(db: Session) -> str:
    """Build a context string from current database state for Gemini."""
    now = datetime.now()

    # Load data stats
    total_records = db.query(func.count(LoadData.id)).scalar() or 0
    latest_load = db.query(LoadData).order_by(LoadData.timestamp.desc()).first()
    avg_demand = db.query(func.avg(LoadData.demand_mw)).scalar() or 0
    max_demand = db.query(func.max(LoadData.demand_mw)).scalar() or 0
    min_demand = db.query(func.min(LoadData.demand_mw)).scalar() or 0

    # Recent 24h stats
    day_ago = now - timedelta(hours=24)
    recent_avg = db.query(func.avg(LoadData.demand_mw)).filter(LoadData.timestamp >= day_ago).scalar() or 0
    recent_max = db.query(func.max(LoadData.demand_mw)).filter(LoadData.timestamp >= day_ago).scalar() or 0

    # Forecasts
    upcoming = db.query(Forecast).filter(Forecast.target_time >= now).order_by(Forecast.target_time).limit(6).all()
    forecast_text = "\n".join([
        f"  {f.target_time.strftime('%a %H:%M')}: {f.predicted_demand_mw:.0f} MW (risk: {f.risk_score:.0f}%, carbon: {f.carbon_intensity:.0f} gCO₂/kWh)"
        for f in upcoming
    ]) if upcoming else "  No upcoming forecasts"

    # Alerts
    active_alerts = db.query(Alert).filter(Alert.is_resolved == False).order_by(Alert.created_at.desc()).limit(5).all()
    alerts_text = "\n".join([
        f"  [{a.severity.upper()}] {a.title}: {a.message}"
        for a in active_alerts
    ]) if active_alerts else "  No active alerts"

    # Interventions
    active_interventions = db.query(Intervention).filter(Intervention.status == "active").count()

    # Zones
    zones = db.query(Zone).order_by(Zone.score.desc()).all()
    zones_text = "\n".join([
        f"  {z.name}: {z.grade} ({z.score}% score, {z.green_usage}% green)"
        for z in zones
    ]) if zones else "  No zone data"

    return f"""LIVE DATABASE STATE (as of {now.strftime('%Y-%m-%d %H:%M')}):

📊 Load Data: {total_records} records
  Latest reading: {latest_load.demand_mw:.0f} MW at {latest_load.timestamp.strftime('%Y-%m-%d %H:%M') if latest_load else 'N/A'}
  Overall avg: {avg_demand:.0f} MW | Peak: {max_demand:.0f} MW | Min: {min_demand:.0f} MW
  Last 24h avg: {recent_avg:.0f} MW | Last 24h peak: {recent_max:.0f} MW
  Grid capacity: 5,200 MW

🔮 Upcoming Forecasts (next 6 hours):
{forecast_text}

⚠️ Active Alerts ({len(active_alerts)}):
{alerts_text}

🤖 Active Interventions: {active_interventions}

🏆 Zone Scores:
{zones_text}"""


def _handle_current_load(db: Session) -> str:
    """Build response for 'What is the current load?' from DB."""
    now = datetime.now()
    latest = db.query(LoadData).order_by(LoadData.timestamp.desc()).first()
    avg_demand = db.query(func.avg(LoadData.demand_mw)).scalar() or 0
    max_demand = db.query(func.max(LoadData.demand_mw)).scalar() or 0
    total = db.query(func.count(LoadData.id)).scalar() or 0
    day_ago = now - timedelta(hours=24)
    recent_avg = db.query(func.avg(LoadData.demand_mw)).filter(LoadData.timestamp >= day_ago).scalar() or 0
    recent_max = db.query(func.max(LoadData.demand_mw)).filter(LoadData.timestamp >= day_ago).scalar() or 0
    capacity = 5200

    if not latest:
        return "📊 No load data available yet. Upload a CSV dataset from the Settings page to get started!"

    load_pct = round(latest.demand_mw / capacity * 100, 1)
    status = "🔴 CRITICAL" if load_pct > 90 else "🟡 HIGH" if load_pct > 75 else "🟢 NORMAL"

    return f"""⚡ **Current Grid Status: {status}**

📊 **Latest Reading:** {latest.demand_mw:,.0f} MW
📅 **Timestamp:** {latest.timestamp.strftime('%a, %d %b %Y %H:%M')}
📈 **Grid Utilization:** {load_pct}% of {capacity:,} MW capacity

**Last 24 Hours:**
• Average Load: {recent_avg:,.0f} MW
• Peak Load: {recent_max:,.0f} MW

**Overall Stats** ({total:,} records):
• All-time Average: {avg_demand:,.0f} MW
• All-time Peak: {max_demand:,.0f} MW

{'⚠️ Load is approaching grid capacity! Consider activating demand-response measures.' if load_pct > 85 else '✅ Load levels are within safe operating range.'}"""


def _handle_active_alerts(db: Session) -> str:
    """Build response for 'Show active alerts' from DB."""
    active = db.query(Alert).filter(Alert.is_resolved == False).order_by(Alert.created_at.desc()).all()
    resolved_today = db.query(Alert).filter(
        Alert.is_resolved == True,
        Alert.resolved_at >= datetime.now() - timedelta(hours=24)
    ).count()
    total_alerts = db.query(func.count(Alert.id)).scalar() or 0

    if not active:
        return f"""✅ **No Active Alerts — All Clear!**

All systems are operating normally.
• Total alerts in system: {total_alerts}
• Resolved today: {resolved_today}

The grid is stable with no outstanding issues."""

    severity_emoji = {"critical": "🔴", "warning": "🟡", "info": "🔵"}
    lines = []
    for a in active:
        emoji = severity_emoji.get(a.severity, "⚪")
        lines.append(f"{emoji} **[{a.severity.upper()}]** {a.title}\n   ↳ {a.message}")

    return f"""⚠️ **Active Alerts: {len(active)}**

{chr(10).join(lines)}

---
📊 Total alerts: {total_alerts} | Resolved today: {resolved_today}
💡 Visit the Alerts page to resolve or inspect individual alerts."""


def _handle_summarize_today(db: Session) -> str:
    """Build response for 'Summarize today\'s data' from DB."""
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    today_data = db.query(LoadData).filter(LoadData.timestamp >= today_start).all()
    forecasts = db.query(Forecast).filter(Forecast.target_time >= now).limit(12).all()
    active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
    active_interventions = db.query(Intervention).filter(Intervention.status == "active").count()
    zones = db.query(Zone).order_by(Zone.score.desc()).limit(3).all()

    if not today_data:
        # Use all available data if no data from "today"
        total = db.query(func.count(LoadData.id)).scalar() or 0
        avg_all = db.query(func.avg(LoadData.demand_mw)).scalar() or 0
        max_all = db.query(func.max(LoadData.demand_mw)).scalar() or 0
        return f"""📋 **Daily Summary — {now.strftime('%A, %d %b %Y')}**

No new load data recorded today, but here's the overall picture:

📊 **Database:** {total:,} total load records
• Average demand: {avg_all:,.0f} MW
• Peak demand: {max_all:,.0f} MW
⚠️ Active alerts: {active_alerts}
🤖 Active interventions: {active_interventions}

{'🏆 **Top Zones:** ' + ', '.join(f'{z.name} ({z.grade})' for z in zones) if zones else ''}

Upload fresh data via Settings → Upload Dataset for today's analysis."""

    demands = [r.demand_mw for r in today_data if r.demand_mw]
    avg_today = sum(demands) / len(demands) if demands else 0
    max_today = max(demands) if demands else 0
    min_today = min(demands) if demands else 0

    fc_text = ""
    if forecasts:
        fc_demands = [f.predicted_demand_mw for f in forecasts]
        fc_text = f"\n🔮 **Forecast (next {len(forecasts)} intervals):**\n• Predicted avg: {sum(fc_demands)/len(fc_demands):,.0f} MW\n• Predicted peak: {max(fc_demands):,.0f} MW"

    return f"""📋 **Daily Summary — {now.strftime('%A, %d %b %Y')}**

📊 **Today's Load ({len(today_data)} readings):**
• Average: {avg_today:,.0f} MW
• Peak: {max_today:,.0f} MW
• Minimum: {min_today:,.0f} MW
• Grid utilization: {round(max_today / 5200 * 100, 1)}%
{fc_text}

⚠️ Active alerts: {active_alerts}
🤖 Active interventions: {active_interventions}

{'🏆 **Top Zones:** ' + ', '.join(f'{z.name} ({z.grade})' for z in zones) if zones else ''}

{'⚡ Peak load exceeded 85% capacity — demand-response measures recommended.' if max_today > 4420 else '✅ Grid operated within safe limits today.'}"""


def _handle_anomalies(db: Session) -> str:
    """Build response for 'Any anomalies detected?' from DB."""
    now = datetime.now()
    capacity = 5200

    # Check for overload episodes
    overload_records = db.query(LoadData).filter(
        LoadData.demand_mw > capacity * 0.9
    ).count()
    total = db.query(func.count(LoadData.id)).scalar() or 0
    overload_pct = round(overload_records / max(total, 1) * 100, 1)

    # Check for sudden spikes (records > 1.5x average)
    avg_demand = db.query(func.avg(LoadData.demand_mw)).scalar() or 0
    spike_threshold = avg_demand * 1.5
    spikes = db.query(LoadData).filter(LoadData.demand_mw > spike_threshold).count()

    # Check for very low loads (potential outage indicators)
    low_threshold = avg_demand * 0.3
    low_loads = db.query(LoadData).filter(
        LoadData.demand_mw < low_threshold,
        LoadData.demand_mw > 0
    ).count()

    # Critical alerts
    critical = db.query(Alert).filter(Alert.severity == "critical", Alert.is_resolved == False).count()

    # High-risk forecasts
    high_risk = db.query(Forecast).filter(Forecast.risk_score > 80, Forecast.target_time >= now).count()

    anomalies_found = []
    if overload_pct > 5:
        anomalies_found.append(f"🔴 **Grid Overload:** {overload_records:,} readings ({overload_pct}%) exceeded 90% capacity ({int(capacity * 0.9):,} MW)")
    if spikes > 0:
        anomalies_found.append(f"⚡ **Demand Spikes:** {spikes:,} readings exceeded 1.5× average ({spike_threshold:,.0f} MW)")
    if low_loads > 0:
        anomalies_found.append(f"📉 **Unusual Low Loads:** {low_loads:,} readings below 30% of average — possible outage or data quality issue")
    if critical > 0:
        anomalies_found.append(f"🚨 **Critical Alerts:** {critical} unresolved critical alerts requiring attention")
    if high_risk > 0:
        anomalies_found.append(f"⚠️ **High-Risk Forecasts:** {high_risk} upcoming intervals with >80% overload risk")

    if not anomalies_found:
        return f"""✅ **No Anomalies Detected**

All {total:,} load records analyzed — no significant anomalies found.

• Average load: {avg_demand:,.0f} MW
• No overload episodes (>{int(capacity * 0.9):,} MW)
• No demand spikes (>{spike_threshold:,.0f} MW)
• No unusual low-load periods
• No unresolved critical alerts

Grid performance is stable and within expected parameters. 👍"""

    return f"""🔍 **Anomaly Analysis ({total:,} records scanned)**

{chr(10).join(anomalies_found)}

---
📊 Baseline avg: {avg_demand:,.0f} MW | Capacity: {capacity:,} MW
💡 Check the Alerts and Forecasts pages for detailed breakdowns."""


# Map of default prompts to their handler functions
DEFAULT_PROMPTS = {
    "what is the current load?": _handle_current_load,
    "show active alerts": _handle_active_alerts,
    "summarize today's data": _handle_summarize_today,
    "any anomalies detected?": _handle_anomalies,
}


@router.post("/send")
def send_message(req: ChatRequest, db: Session = Depends(get_db)):
    """Send a message to the AI chatbot. Default prompts use hardcoded DB queries; custom messages use Gemini."""
    # Save user message
    user_msg = ChatMessage(role="user", content=req.message, session_id=req.session_id)
    db.add(user_msg)
    db.commit()

    # Check if this is a default prompt (case-insensitive match)
    normalized = req.message.strip().lower()
    handler = DEFAULT_PROMPTS.get(normalized)

    if handler:
        # Default prompt → instant DB-driven response (no Gemini call)
        reply = handler(db)
    else:
        # Custom message → call Gemini API
        context = build_db_context(db)
        history = db.query(ChatMessage).filter(
            ChatMessage.session_id == req.session_id
        ).order_by(ChatMessage.created_at.desc()).limit(10).all()
        history_list = [{"role": m.role, "content": m.content} for m in reversed(history)]
        reply = chat_with_context(req.message, context, history_list)

    # Save assistant response
    bot_msg = ChatMessage(role="assistant", content=reply, session_id=req.session_id)
    db.add(bot_msg)
    db.commit()

    return {"reply": reply, "id": bot_msg.id}


@router.get("/history")
def get_history(session_id: str = "default", db: Session = Depends(get_db)):
    """Get chat history for a session."""
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at).limit(50).all()

    return {"messages": [{
        "id": m.id,
        "role": m.role,
        "content": m.content,
        "timestamp": m.created_at.isoformat(),
    } for m in messages]}


@router.delete("/clear")
def clear_history(session_id: str = "default", db: Session = Depends(get_db)):
    """Clear chat history."""
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.commit()
    return {"status": "cleared"}


@router.get("/alerts")
def get_ai_alerts(db: Session = Depends(get_db)):
    """Get AI-generated proactive alerts based on current data."""
    context = build_db_context(db)
    alerts = generate_alerts_from_data(context)
    return {"alerts": alerts}


@router.get("/insights")
def get_insights(db: Session = Depends(get_db)):
    """Get stored Gemini insights."""
    insights = db.query(GeminiInsight).order_by(GeminiInsight.created_at.desc()).limit(10).all()
    return {"insights": [{
        "id": i.id,
        "type": i.insight_type,
        "summary": i.summary,
        "details": json.loads(i.details) if i.details else {},
        "riskLevel": i.risk_level,
        "createdAt": i.created_at.isoformat(),
    } for i in insights]}
