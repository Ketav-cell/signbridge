import json
import os
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from predictor import Predictor

app = FastAPI(title="SignBridge", version="1.0.0")

_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_predictor: Optional[Predictor] = None


@app.on_event("startup")
async def startup() -> None:
    global _predictor
    _predictor = Predictor()
    print("server ready.")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "model_loaded": _predictor is not None}


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket) -> None:
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
                "error": "model not loaded",
            }

            await websocket.send_text(json.dumps(result))

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_text(
                json.dumps({"hand_detected": False, "letter": None, "confidence": 0.0, "error": str(exc)})
            )
        except Exception:
            pass
