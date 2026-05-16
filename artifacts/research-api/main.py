"""AGI Research Lab — FastAPI Backend with parallel agents, shared memory, user commands."""
import asyncio, json, logging, os, uuid
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
    logger.info("Shutting down...")
    await session_manager.shutdown_all()

app = FastAPI(title="AGI Research Lab API", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/research/healthz")
async def health(): return {"status":"ok","service":"agi-research-lab","agents":4,"version":"2.0.0"}

@app.get("/research/sessions")
async def list_sessions(): return session_manager.list_sessions()

@app.post("/research/sessions", status_code=201)
async def create_session(body: dict):
    session = session_manager.create_session(body.get("name","Unnamed"), body.get("hypothesis",""), body.get("perceptionThreshold",0.85))
    return session.to_dict()

@app.get("/research/sessions/{sid}")
async def get_session(sid: str):
    s = session_manager.get_session(sid)
    return s.to_dict() if s else {"error":"not found"}

@app.delete("/research/sessions/{sid}", status_code=204)
async def delete_session(sid: str):
    session_manager.delete_session(sid); return None

@app.post("/research/sessions/{sid}/stop")
async def stop_session(sid: str):
    s = session_manager.get_session(sid)
    if not s: return {"error":"not found"}
    await s.stop()
    await ws_manager.broadcast(sid,{"type":"session_stopped","sessionId":sid,"timestamp":datetime.now(timezone.utc).isoformat()})
    return s.to_dict()

@app.post("/research/sessions/{sid}/intervene")
async def intervene(sid: str, body: dict):
    s = session_manager.get_session(sid)
    if not s: return {"error":"not found"}
    result = await s.handle_human_intervention(body.get("message",""), body.get("type","directive"))
    await ws_manager.broadcast(sid,{"type":"human_intervention","intervention":{"message":body.get("message",""),"type":body.get("type",""),"response":result["agentResponse"]},"timestamp":datetime.now(timezone.utc).isoformat()})
    return result

@app.post("/research/sessions/{sid}/command")
async def user_command(sid: str, body: dict):
    """Direct user command to agents — routed through Χ-Orchestrator."""
    s = session_manager.get_session(sid)
    if not s: return {"error":"not found"}
    command = body.get("command","")
    cmd_type = body.get("type","directive")
    s.add_user_command(command, cmd_type)
    return {"queued":True,"command":command,"sessionId":sid}

@app.post("/research/sessions/{sid}/inject-stream")
async def inject_stream(sid: str, body: dict):
    s = session_manager.get_session(sid)
    if not s: return {"error":"not found"}
    result = await s.inject_data_stream(body.get("streamType","normal"), body.get("intensity",1.0), body.get("label","stream"))
    await ws_manager.broadcast(sid,{"type":"data_stream_injected","stream":result,"timestamp":datetime.now(timezone.utc).isoformat()})
    return result

@app.post("/research/sessions/{sid}/threshold")
async def set_threshold(sid: str, body: dict):
    s = session_manager.get_session(sid)
    if not s: return {"error":"not found"}
    s.perception_threshold = body.get("threshold",0.85)
    await ws_manager.broadcast(sid,{"type":"threshold_updated","threshold":s.perception_threshold,"timestamp":datetime.now(timezone.utc).isoformat()})
    return s.to_dict()

@app.get("/research/sessions/{sid}/network")
async def get_network(sid: str):
    s = session_manager.get_session(sid)
    return s.network.to_dict() if s else {"error":"not found"}

@app.post("/research/sessions/{sid}/network")
async def mutate_network(sid: str, body: dict):
    s = session_manager.get_session(sid)
    if not s: return {"error":"not found"}
    result = s.network.mutate(body)
    await ws_manager.broadcast(sid,{"type":"network_mutated","network":result,"mutation":body,"timestamp":datetime.now(timezone.utc).isoformat()})
    return result

@app.get("/research/sessions/{sid}/metrics")
async def get_metrics(sid: str):
    s = session_manager.get_session(sid)
    return {"sessionId":sid,"metrics":s.metrics_history} if s else {"error":"not found"}

@app.get("/research/sessions/{sid}/formulas")
async def get_formulas(sid: str):
    s = session_manager.get_session(sid)
    return s.formulas if s else []

@app.get("/research/sessions/{sid}/memory")
async def get_memory(sid: str):
    s = session_manager.get_session(sid)
    return s.memory.to_context_dict() if s else {"error":"not found"}

@app.websocket("/ws/{sid}")
async def websocket_endpoint(websocket: WebSocket, sid: str):
    await ws_manager.connect(sid, websocket)
    s = session_manager.get_session(sid)
    if s:
        await ws_manager.broadcast(sid,{"type":"connected","sessionId":sid,"state":s.to_dict(),
            "network":s.network.to_dict(),"metrics":s.metrics_history,"formulas":s.formulas,
            "phase":s.memory.current_phase,"timestamp":datetime.now(timezone.utc).isoformat()})
        if s.status == "idle":
            asyncio.create_task(s.run_agent_loop(lambda msg: ws_manager.broadcast(sid, msg)))
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            await _handle_ws(sid, s, msg)
    except WebSocketDisconnect:
        ws_manager.disconnect(sid, websocket)
    except Exception as e:
        logger.error(f"WS error {sid}: {e}")
        ws_manager.disconnect(sid, websocket)

async def _handle_ws(sid: str, session: Any, msg: dict):
    t = msg.get("type","")
    if t == "ping":
        await ws_manager.broadcast(sid,{"type":"pong"})
    elif t == "user_command" and session:
        session.add_user_command(msg.get("command",""), msg.get("commandType","directive"))
    elif t == "add_node" and session:
        session.network.add_node(msg.get("nodeType","hidden"))
        await ws_manager.broadcast(sid,{"type":"network_mutated","network":session.network.to_dict(),"timestamp":datetime.now(timezone.utc).isoformat()})
    elif t == "remove_node" and session:
        nid = msg.get("nodeId")
        if nid: session.network.remove_node(nid)
        await ws_manager.broadcast(sid,{"type":"network_mutated","network":session.network.to_dict(),"timestamp":datetime.now(timezone.utc).isoformat()})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT",8001)), log_level="info")
