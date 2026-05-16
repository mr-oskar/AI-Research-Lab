"""WebSocket connection manager"""

import json
import logging
from collections import defaultdict
from typing import Callable, Dict, List

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self._connections: Dict[str, List[WebSocket]] = defaultdict(list)

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self._connections[session_id].append(websocket)
        logger.info(f"WebSocket connected: session={session_id}, total={len(self._connections[session_id])}")

    def disconnect(self, session_id: str, websocket: WebSocket):
        conns = self._connections.get(session_id, [])
        if websocket in conns:
            conns.remove(websocket)
        logger.info(f"WebSocket disconnected: session={session_id}")

    async def broadcast(self, session_id: str, data: dict):
        connections = self._connections.get(session_id, [])
        dead = []
        for ws in connections:
            try:
                await ws.send_text(json.dumps(data))
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket: {e}")
                dead.append(ws)
        for ws in dead:
            self.disconnect(session_id, ws)

    async def send_to(self, websocket: WebSocket, data: dict):
        try:
            await websocket.send_text(json.dumps(data))
        except Exception as e:
            logger.warning(f"Failed to send: {e}")
