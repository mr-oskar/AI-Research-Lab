"""
Research Session — the main orchestrator of the agent loop
"""

import asyncio
import random
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from agents.lab_director import LabDirector
from agents.mathematician import TheoreticalMathematician
from agents.physicist import ExperimentalPhysicist
from core.neural_network import NeuralNetwork
from tools.evaluator import evaluate_formula, generate_dataset


class ResearchSession:
    def __init__(
        self,
        session_id: str,
        name: str,
        hypothesis: str,
        perception_threshold: float = 0.85,
    ):
        self.id = session_id
        self.name = name
        self.hypothesis = hypothesis
        self.perception_threshold = perception_threshold
        self.status = "idle"
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.updated_at = self.created_at
        self.current_iteration = 0
        self.active_agents = [
            TheoreticalMathematician.NAME,
            ExperimentalPhysicist.NAME,
            LabDirector.NAME,
        ]

        self._mathematician = TheoreticalMathematician()
        self._physicist = ExperimentalPhysicist()
        self._director = LabDirector()

        self.network = NeuralNetwork()
        self.formulas: List[Dict] = []
        self.metrics_history: List[Dict] = []
        self._current_stream_type = "normal"
        self._last_messages: List[Dict] = []
        self._stop_event = asyncio.Event()

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "hypothesis": self.hypothesis,
            "perceptionThreshold": self.perception_threshold,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "currentIteration": self.current_iteration,
            "activeAgents": self.active_agents,
        }

    async def stop(self):
        self.status = "paused"
        self._stop_event.set()
        self.updated_at = datetime.now(timezone.utc).isoformat()

    async def inject_data_stream(
        self, stream_type: str, intensity: float, label: str
    ) -> Dict:
        self._current_stream_type = stream_type
        stream_id = str(uuid.uuid4())[:8]
        impact_map = {
            "normal": "لا أثر سلبي — بيانات اعتيادية",
            "drift": "انحراف تدريجي في التوزيع — اختبار التكيف",
            "ood": "بيانات خارج التوزيع — اختبار التعميم القصوى",
            "adversarial": "بيانات معادية — اختبار الصلابة",
            "catastrophic": "تيار كارثي — اختبار النسيان الكارثي",
        }
        return {
            "injected": True,
            "streamId": stream_id,
            "impact": impact_map.get(stream_type, "غير معروف"),
            "streamType": stream_type,
            "intensity": intensity,
            "label": label,
        }

    async def handle_human_intervention(self, message: str, intervention_type: str) -> Dict:
        result = self._director.handle_human_intervention(message, intervention_type)
        if intervention_type == "halt":
            await self.stop()
        return result

    async def run_agent_loop(self, broadcast: Callable):
        self.status = "running"
        self.updated_at = datetime.now(timezone.utc).isoformat()
        self._stop_event.clear()

        await broadcast({
            "type": "session_started",
            "sessionId": self.id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        while not self._stop_event.is_set():
            self.current_iteration += 1
            iteration = self.current_iteration

            current_metrics = self._compute_current_metrics()
            self.network.evolve(current_metrics.get("convergenceSpeed", 0.5))

            metric_point = {
                "iteration": iteration,
                **current_metrics,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            self.metrics_history.append(metric_point)
            if len(self.metrics_history) > 200:
                self.metrics_history = self.metrics_history[-200:]

            stream_type = self._current_stream_type

            messages_this_round = []

            try:
                math_action = self._mathematician.step(
                    iteration, current_metrics, self.formulas, stream_type
                )
                if "formula" in math_action:
                    self.formulas.append(math_action["formula"])
                messages_this_round.append(math_action)
                await broadcast(math_action)
            except Exception:
                pass

            await asyncio.sleep(1.5)

            if self._stop_event.is_set():
                break

            try:
                phys_action = self._physicist.step(
                    iteration, current_metrics, self.formulas, stream_type
                )
                messages_this_round.append(phys_action)
                await broadcast(phys_action)
            except Exception:
                pass

            await asyncio.sleep(1.5)

            if self._stop_event.is_set():
                break

            try:
                director_action = self._director.step(
                    iteration, current_metrics, self.formulas, stream_type,
                    last_messages=self._last_messages
                )
                messages_this_round.append(director_action)
                await broadcast(director_action)
            except Exception:
                pass

            self._last_messages = messages_this_round

            await broadcast({
                "type": "metrics_update",
                "sessionId": self.id,
                "metrics": metric_point,
                "network": self.network.to_dict(),
                "formulas": self.formulas,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            self.updated_at = datetime.now(timezone.utc).isoformat()

            delay = random.uniform(2.0, 4.0)
            try:
                await asyncio.wait_for(
                    asyncio.shield(self._stop_event.wait()), timeout=delay
                )
                break
            except asyncio.TimeoutError:
                pass

        self.status = "paused" if self._stop_event.is_set() else "completed"
        self.updated_at = datetime.now(timezone.utc).isoformat()

    def _compute_current_metrics(self) -> Dict[str, Any]:
        approved = [f for f in self.formulas if f["status"] == "approved"]
        rejected = [f for f in self.formulas if f["status"] == "rejected"]
        iteration = self.current_iteration

        if approved:
            best = max(approved, key=lambda f: f.get("testScore") or 0)
            base_gen = best.get("testScore") or 0.4
        else:
            base_gen = 0.2

        stream_penalty = {
            "normal": 0.0, "drift": 0.1, "ood": 0.2,
            "adversarial": 0.25, "catastrophic": 0.35,
        }.get(self._current_stream_type, 0.0)

        progress_factor = min(1.0, iteration / 30)
        noise = random.gauss(0, 0.02)

        convergence = min(0.99, max(0.01, base_gen * progress_factor + 0.3 + noise))
        generalization = min(0.99, max(0.01, base_gen - stream_penalty + noise))
        stability = min(0.99, max(0.01, 0.7 + progress_factor * 0.2 + noise - stream_penalty * 0.5))
        loss = max(0.0001, 1.0 - convergence + abs(noise) * 0.5)

        return {
            "convergenceSpeed": round(convergence, 4),
            "generalizationIndex": round(generalization, 4),
            "synapticStability": round(stability, 4),
            "loss": round(loss, 6),
        }
