from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import math
import random
from datetime import datetime

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    await websocket.accept()
    try:
        tick = 0
        while True:
            now = datetime.utcnow()
            h = now.hour
            base_load = 400 + 60 * math.sin(math.pi * (h - 9) / 24)
            current_load = round(base_load + random.uniform(-15, 15), 2)
            solar = round(max(0, 60 * math.sin(math.pi * (h - 6) / 12)) + random.uniform(-5, 5), 2) if 6 <= h <= 18 else 0.0
            wind = round(max(0, 40 + random.uniform(-10, 10)), 2)
            freq = round(50.0 + random.uniform(-0.08, 0.08), 3)
            risk = round(min(100, max(0, (current_load / 480) * 100)), 1)

            payload = {
                "type": "live_update",
                "timestamp": now.isoformat() + "Z",
                "current_load_mw": current_load,
                "solar_mw": solar,
                "wind_mw": wind,
                "frequency_hz": freq,
                "risk_score": risk,
                "tick": tick
            }
            await websocket.send_text(json.dumps(payload))
            tick += 1
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
