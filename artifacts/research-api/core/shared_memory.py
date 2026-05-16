"""
Shared Memory — the collective knowledge base for all agents.
All agents read from and write to this store each iteration.
"""

import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class SharedMemory:
    """Thread-safe shared knowledge base accessible by all agents."""

    def __init__(self):
        self._lock = threading.Lock()
        self.hypothesis: str = ""
        self.current_objective: str = "Discover mathematical laws for AGI self-learning"
        self.iteration: int = 0

        # Formula knowledge
        self.approved_formulas: List[Dict] = []
        self.rejected_formulas: List[Dict] = []
        self.pending_proposals: List[Dict] = []

        # Agent communication
        self.agent_requests: Dict[str, List[str]] = {
            "Δ-Mathematician": [],
            "Σ-Physicist": [],
            "Ω-Director": [],
        }
        self.agent_completion_reports: Dict[str, Optional[Dict]] = {
            "Δ-Mathematician": None,
            "Σ-Physicist": None,
            "Ω-Director": None,
        }
        self.task_assignments: Dict[str, str] = {}

        # Research findings
        self.key_findings: List[str] = []
        self.open_questions: List[str] = []
        self.user_directives: List[str] = []
        self.stream_context: str = "normal"

        # Performance history
        self.best_score: float = 0.0
        self.best_formula_id: Optional[str] = None
        self.convergence_trend: List[float] = []

        # Phase tracking
        self.current_phase: str = "initialization"
        self.phase_history: List[Dict] = []

    def update_phase(self, phase: str, description: str = ""):
        with self._lock:
            if self.current_phase != phase:
                self.phase_history.append({
                    "phase": self.current_phase,
                    "endedAt": datetime.now(timezone.utc).isoformat(),
                })
            self.current_phase = phase
            if description:
                self.key_findings.append(f"[{phase.upper()}] {description}")

    def add_user_directive(self, directive: str):
        with self._lock:
            self.user_directives.append(directive)
            if len(self.user_directives) > 20:
                self.user_directives = self.user_directives[-20:]

    def get_latest_directive(self) -> Optional[str]:
        with self._lock:
            return self.user_directives[-1] if self.user_directives else None

    def record_agent_completion(self, agent_name: str, report: Dict):
        with self._lock:
            self.agent_completion_reports[agent_name] = report

    def assign_task(self, agent_name: str, task: str):
        with self._lock:
            self.task_assignments[agent_name] = task

    def get_task(self, agent_name: str) -> str:
        with self._lock:
            return self.task_assignments.get(agent_name, "")

    def add_approved_formula(self, formula: Dict):
        with self._lock:
            existing_ids = {f["id"] for f in self.approved_formulas}
            if formula["id"] not in existing_ids:
                self.approved_formulas.append(formula)
            if formula.get("testScore", 0) > self.best_score:
                self.best_score = formula.get("testScore", 0)
                self.best_formula_id = formula["id"]

    def add_finding(self, finding: str):
        with self._lock:
            self.key_findings.append(finding)
            if len(self.key_findings) > 50:
                self.key_findings = self.key_findings[-50:]

    def add_request(self, from_agent: str, to_agent: str, request: str):
        with self._lock:
            if to_agent in self.agent_requests:
                self.agent_requests[to_agent].append(f"[{from_agent}]: {request}")
                if len(self.agent_requests[to_agent]) > 10:
                    self.agent_requests[to_agent] = self.agent_requests[to_agent][-10:]

    def get_requests_for(self, agent_name: str) -> List[str]:
        with self._lock:
            reqs = self.agent_requests.get(agent_name, []).copy()
            self.agent_requests[agent_name] = []
            return reqs

    def update_convergence(self, score: float):
        with self._lock:
            self.convergence_trend.append(score)
            if len(self.convergence_trend) > 30:
                self.convergence_trend = self.convergence_trend[-30:]

    def to_context_dict(self) -> Dict:
        """Return a concise context snapshot for agent prompting."""
        with self._lock:
            return {
                "hypothesis": self.hypothesis,
                "objective": self.current_objective,
                "phase": self.current_phase,
                "iteration": self.iteration,
                "approvedCount": len(self.approved_formulas),
                "rejectedCount": len(self.rejected_formulas),
                "bestScore": self.best_score,
                "keyFindings": self.key_findings[-5:],
                "openQuestions": self.open_questions[-5:],
                "userDirectives": self.user_directives[-3:],
                "streamContext": self.stream_context,
                "convergenceTrend": self.convergence_trend[-5:],
            }
