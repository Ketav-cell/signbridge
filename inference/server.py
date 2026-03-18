"""
FastAPI WebSocket inference server.

Clients connect to ws://localhost:8000/ws and exchange JSON messages:

  Client → Server:
    { "frame": "<base64-encoded JPEG, no data-URL prefix>" }

  Server → Client:
    { "hand_detected": bool, "letter": str|null, "confidence": float }

Run with:
    uvicorn server:app --host 0.0.0.0 --port 8000 --reload
"""

import json
import os
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from predictor import Predictor

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="SignBridge Inference Server", version="1.0.0")

# Allow the Next.js dev server (and any local origin) to connect.
_allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Lazy-load predictor at startup so we fail fast if model files are missing.
# ---------------------------------------------------------------------------
_predictor: Optional[Predictor] = None


@app.on_event("startup")
async def _startup() -> None:
    global _predictor
    _predictor = Predictor()
    print("✅  Inference server ready.")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "model_loaded": _predictor is not None}


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            frame_b64: str = msg.get("frame", "")

            result = _predictor.predict(frame_b64) if _predictor else {
                "hand_detected": False,
                "letter": None,
                "confidence": 0.0,
                "error": "Model not loaded",
            }

            await websocket.send_text(json.dumps(result))

    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001
        # Send error back instead of crashing the connection handler.
        try:
            await websocket.send_text(
                json.dumps({"hand_detected": False, "letter": None, "confidence": 0.0, "error": str(exc)})
            )
        except Exception:
            pass
