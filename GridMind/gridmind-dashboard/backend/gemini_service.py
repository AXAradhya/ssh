"""
GridMind Gemini Service — Reusable AI module for CSV analysis and chatbot.
Uses google-generativeai SDK with retry logic for rate limits.
"""
import os
import json
import time
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Initialize the SDK
_model = None

def get_model():
    global _model
    if _model is None:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _model = genai.GenerativeModel("gemini-2.0-flash")
    return _model


def _call_gemini(prompt: str, max_retries: int = 3) -> str:
    """Call Gemini with retry logic for rate limits."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        return ""

    model = get_model()
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
                wait_time = (attempt + 1) * 5  # 5s, 10s, 15s
                print(f"⏳ Gemini rate limit hit, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})...")
                time.sleep(wait_time)
                continue
            raise e
    raise Exception("Gemini API rate limit exceeded after retries. Please wait a moment and try again.")


def analyze_csv_data(csv_summary: dict, sample_rows: list, domain_context: str = "smart grid energy load") -> dict:
    """Send CSV data summary to Gemini for analysis."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        return {"error": "Gemini API key not configured", "insights": []}

    prompt = f"""You are GridMind, an AI analyst for {domain_context} management.

Analyze this uploaded dataset and provide actionable insights.

**Dataset Summary:**
- Filename: {csv_summary.get('filename', 'unknown')}
- Total rows: {csv_summary.get('total_rows', 0)}
- Columns: {csv_summary.get('columns', [])}
- Date range: {csv_summary.get('date_range', 'N/A')}
- Avg demand: {csv_summary.get('avg_demand', 'N/A')} MW
- Peak demand: {csv_summary.get('peak_demand', 'N/A')} MW
- Min demand: {csv_summary.get('min_demand', 'N/A')} MW

**Sample rows (first 5):**
{json.dumps(sample_rows[:5], indent=2, default=str)}

Provide your analysis as JSON with this exact structure:
{{
  "summary": "2-3 sentence overview of the dataset",
  "patterns": ["pattern 1", "pattern 2", "pattern 3"],
  "anomalies": ["anomaly 1 if any"],
  "predictions": ["prediction 1", "prediction 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "risk_level": "low|medium|high",
  "key_metrics": {{
    "avg_load": number,
    "peak_load": number,
    "load_factor": number,
    "volatility": "low|medium|high"
  }}
}}

Return ONLY valid JSON, no markdown formatting."""

    try:
        text = _call_gemini(prompt)
        # Clean markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
        return json.loads(text)
    except json.JSONDecodeError:
        return {"summary": text, "patterns": [], "anomalies": [], "predictions": [], "recommendations": [], "risk_level": "unknown", "key_metrics": {}}
    except Exception as e:
        return {"error": str(e), "insights": []}


def chat_with_context(user_message: str, db_context: str, chat_history: list = None) -> str:
    """Chatbot powered by Gemini with database context."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        return "⚠️ Gemini API key not configured. Please add your key to backend/.env file.\nGet one free at: https://aistudio.google.com/apikey"

    system_prompt = f"""You are GridMind AI Assistant — an intelligent chatbot for smart grid energy management.

You have access to the following LIVE database state:
{db_context}

Your capabilities:
1. Answer questions about the grid data, load patterns, forecasts, and alerts
2. Provide proactive notifications about anomalies or threshold breaches
3. Suggest energy optimization strategies
4. Explain trends and patterns in the data

Rules:
- Always reference actual data from the database context above
- Be concise but informative (max 200 words)
- Use emoji sparingly for clarity (⚡🔋⚠️✅)
- If asked about data not in the context, say so honestly
- Format numbers nicely (e.g., 4,200 MW instead of 4200)"""

    history_text = ""
    if chat_history:
        for msg in chat_history[-6:]:
            role = "User" if msg.get("role") == "user" else "GridMind"
            history_text += f"\n{role}: {msg.get('content', '')}"

    full_prompt = f"{system_prompt}\n\nConversation history:{history_text}\n\nUser: {user_message}\n\nGridMind:"

    try:
        return _call_gemini(full_prompt)
    except Exception as e:
        return f"⚠️ {str(e)}"


def generate_alerts_from_data(db_context: str) -> list:
    """Generate proactive alerts from current database state."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        return []

    prompt = f"""You are GridMind's alert engine. Based on this LIVE grid data, generate 1-3 proactive alerts.

{db_context}

Return ONLY a JSON array of alerts with this structure:
[
  {{
    "severity": "critical|warning|info",
    "title": "Short alert title",
    "message": "Detailed explanation with actual numbers from the data"
  }}
]

Only generate alerts if data actually warrants them. If everything looks normal, return an empty array [].
Return ONLY valid JSON, no markdown."""

    try:
        text = _call_gemini(prompt)
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
        return json.loads(text)
    except Exception:
        return []
