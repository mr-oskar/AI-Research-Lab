"""
AGI Research Lab - FastAPI Backend
Multi-Agent Scientific Research Environment with WebSockets
"""

import asyncio
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from core.session_manager import SessionManager
from core.websocket_manager import WebSocketManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

session_manager = SessionManager()
ws_manager = WebSocketManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AGI Research Lab backend starting up...")
    yield
    logger.info("AGI Research Lab backend shutting down...")
    await session_manager.shutdown_all()


app = FastAPI(
    title="AGI Research Lab API",
    description="Multi-Agent Scientific Research Environment",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/research/healthz")
async def health_check():
    return {"status": "ok", "service": "agi-research-lab", "agents": 3}


@app.get("/research/sessions")
async def list_sessions():
    return session_manager.list_sessions()


@app.post("/research/sessions", status_code=201)
async def create_session(body: dict):
    name = body.get("name", "Unnamed Session")
    hypothesis = body.get("hypothesis", "")
    threshold = body.get("perceptionThreshold", 0.85)
    session = session_manager.create_session(name, hypothesis, threshold)
    return session.to_dict()


@app.get("/research/sessions/{session_id}")
async def get_session(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        return {"error": "Session not found"}, 404
    return session.to_dict()


@app.delete("/research/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str):
    session_manager.delete_session(session_id)
    return None


@app.post("/research/sessions/{session_id}/stop")
async def stop_session(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        return {"error": "Session not found"}
    await session.stop()
    await ws_manager.broadcast(session_id, {
        "type": "session_stopped",
        "sessionId": session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return session.to_dict()


@app.post("/research/sessions/{session_id}/intervene")
async def human_intervene(session_id: str, body: dict):
    session = session_manager.get_session(session_id)
    if not session:
        return {"error": "Session not found"}
    message = body.get("message", "")
    intervention_type = body.get("type", "directive")
    result = await session.handle_human_intervention(message, intervention_type)
    await ws_manager.broadcast(session_id, {
        "type": "human_intervention",
        "intervention": {
            "message": message,
            "type": intervention_type,
            "response": result["agentResponse"],
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return result


@app.post("/research/sessions/{session_id}/inject-stream")
async def inject_data_stream(session_id: str, body: dict):
    session = session_manager.get_session(session_id)
    if not session:
        return {"error": "Session not found"}
    stream_type = body.get("streamType", "normal")
    intensity = body.get("intensity", 1.0)
    label = body.get("label", f"{stream_type} stream")
    result = await session.inject_data_stream(stream_type, intensity, label)
    await ws_manager.broadcast(session_id, {
        "type": "data_stream_injected",
        "stream": result,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return result


@app.post("/research/sessions/{session_id}/threshold")
async def set_threshold(session_id: str, body: dict):
    session = session_manager.get_session(session_id)
    if not session:
        return {"error": "Session not found"}
    threshold = body.get("threshold", 0.85)
    session.perception_threshold = threshold
    await ws_manager.broadcast(session_id, {
        "type": "threshold_updated",
        "threshold": threshold,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return session.to_dict()


@app.get("/research/sessions/{session_id}/network")
async def get_network(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        return {"error": "Session not found"}
    return session.network.to_dict()


@app.post("/research/sessions/{session_id}/network")
async def mutate_network(session_id: str, body: dict):
    session = session_manager.get_session(session_id)
    if not session:
        return {"error": "Session not found"}
    result = session.network.mutate(body)
    await ws_manager.broadcast(session_id, {
        "type": "network_mutated",
        "network": result,
        "mutation": body,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return result


@app.get("/research/sessions/{session_id}/metrics")
async def get_metrics(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        return {"error": "Session not found"}
    return {
        "sessionId": session_id,
        "metrics": session.metrics_history,
    }


@app.get("/research/sessions/{session_id}/formulas")
async def get_formulas(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        return {"error": "Session not found"}
    return session.formulas


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await ws_manager.connect(session_id, websocket)
    session = session_manager.get_session(session_id)
    if session:
        await ws_manager.broadcast(session_id, {
            "type": "connected",
            "sessionId": session_id,
            "state": session.to_dict(),
            "network": session.network.to_dict(),
            "metrics": session.metrics_history,
            "formulas": session.formulas,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        if session.status == "idle":
            asyncio.create_task(
                session.run_agent_loop(
                    lambda msg: ws_manager.broadcast(session_id, msg)
                )
            )
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            await handle_ws_message(session_id, session, msg)
    except WebSocketDisconnect:
        ws_manager.disconnect(session_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
        ws_manager.disconnect(session_id, websocket)


async def handle_ws_message(session_id: str, session: Any, msg: dict):
    msg_type = msg.get("type", "")
    if msg_type == "ping":
        await ws_manager.broadcast(session_id, {"type": "pong"})
    elif msg_type == "add_node" and session:
        node_type = msg.get("nodeType", "hidden")
        result = session.network.add_node(node_type)
        await ws_manager.broadcast(session_id, {
            "type": "network_mutated",
            "network": session.network.to_dict(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    elif msg_type == "remove_node" and session:
        node_id = msg.get("nodeId")
        if node_id:
            session.network.remove_node(node_id)
            await ws_manager.broadcast(session_id, {
                "type": "network_mutated",
                "network": session.network.to_dict(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
