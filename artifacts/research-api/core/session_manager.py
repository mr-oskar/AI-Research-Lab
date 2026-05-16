"""Session Manager - manages all active research sessions"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Optional

from .research_session import ResearchSession


class SessionManager:
    def __init__(self):
        self._sessions: Dict[str, ResearchSession] = {}

    def create_session(
        self, name: str, hypothesis: str, threshold: float = 0.85
    ) -> ResearchSession:
        session_id = str(uuid.uuid4())
        session = ResearchSession(session_id, name, hypothesis, threshold)
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[ResearchSession]:
        return self._sessions.get(session_id)

    def list_sessions(self):
        return [s.to_dict() for s in self._sessions.values()]

    def delete_session(self, session_id: str):
        session = self._sessions.pop(session_id, None)
        if session:
            import asyncio
            asyncio.create_task(session.stop())

    async def shutdown_all(self):
        for session in list(self._sessions.values()):
            await session.stop()
        self._sessions.clear()
