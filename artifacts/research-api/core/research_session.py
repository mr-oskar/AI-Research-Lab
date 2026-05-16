"""Research Session — orchestrates parallel agent loop with shared memory."""
import asyncio, random, uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from agents.lab_director import LabDirector
from agents.mathematician import TheoreticalMathematician
from agents.physicist import ExperimentalPhysicist
from agents.orchestrator import ChiefOrchestrator
from core.neural_network import NeuralNetwork
from core.shared_memory import SharedMemory
from tools.evaluator import evaluate_formula, generate_dataset


class ResearchSession:
    def __init__(self, session_id: str, name: str, hypothesis: str, perception_threshold: float = 0.85):
        self.id = session_id
        self.name = name
        self.hypothesis = hypothesis
        self.perception_threshold = perception_threshold
        self.status = "idle"
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.updated_at = self.created_at
        self.current_iteration = 0
        self.active_agents = ["Δ-Mathematician","Σ-Physicist","Ω-Director","Χ-Orchestrator"]

        # Shared memory — accessible by all agents
        self.memory = SharedMemory()
        self.memory.hypothesis = hypothesis
        self.memory.current_objective = hypothesis or "Discover mathematical laws for AGI self-learning"

        # Agents — all share the same memory
        self._mathematician = TheoreticalMathematician(self.memory)
        self._physicist = ExperimentalPhysicist(self.memory)
        self._director = LabDirector(self.memory)
        self._orchestrator = ChiefOrchestrator(self.memory)

        self.network = NeuralNetwork()
        self.formulas: List[Dict] = []
        self.metrics_history: List[Dict] = []
        self._current_stream_type = "normal"
        self._last_messages: List[Dict] = []
        self._stop_event = asyncio.Event()
        self._pending_user_commands: List[Dict] = []

    def to_dict(self) -> Dict:
        return {
            "id": self.id, "name": self.name, "status": self.status,
            "hypothesis": self.hypothesis, "perceptionThreshold": self.perception_threshold,
            "createdAt": self.created_at, "updatedAt": self.updated_at,
            "currentIteration": self.current_iteration, "activeAgents": self.active_agents,
            "currentPhase": self.memory.current_phase,
        }

    async def stop(self):
        self.status = "paused"
        self._stop_event.set()
        self.updated_at = datetime.now(timezone.utc).isoformat()

    async def inject_data_stream(self, stream_type: str, intensity: float, label: str) -> Dict:
        self._current_stream_type = stream_type
        self.memory.stream_context = stream_type
        impact_map = {
            "normal": "بيانات اعتيادية — لا أثر سلبي",
            "drift": "انحراف تدريجي في التوزيع — اختبار التكيف",
            "ood": "بيانات خارج التوزيع — اختبار التعميم القصوى",
            "adversarial": "بيانات معادية — اختبار الصلابة",
            "catastrophic": "تيار كارثي — اختبار النسيان الكارثي",
        }
        return {"injected":True,"streamId":str(uuid.uuid4())[:8],"impact":impact_map.get(stream_type,"غير معروف"),
                "streamType":stream_type,"intensity":intensity,"label":label}

    async def handle_human_intervention(self, message: str, intervention_type: str) -> Dict:
        result = self._director.handle_human_intervention(message, intervention_type)
        if intervention_type == "halt":
            await self.stop()
        return result

    def add_user_command(self, command: str, command_type: str = "directive"):
        self._pending_user_commands.append({"command": command, "type": command_type, "timestamp": datetime.now(timezone.utc).isoformat()})
        self.memory.add_user_directive(command)

    async def run_agent_loop(self, broadcast: Callable):
        self.status = "running"
        self.updated_at = datetime.now(timezone.utc).isoformat()
        self._stop_event.clear()

        await broadcast({"type":"session_started","sessionId":self.id,"timestamp":datetime.now(timezone.utc).isoformat()})

        while not self._stop_event.is_set():
            self.current_iteration += 1
            iteration = self.current_iteration
            self.memory.iteration = iteration
            stream_type = self._current_stream_type

            # Compute metrics
            current_metrics = self._compute_current_metrics()
            self.network.evolve(current_metrics.get("convergenceSpeed", 0.5))
            metric_point = {"iteration":iteration,"**":None,**current_metrics,"timestamp":datetime.now(timezone.utc).isoformat()}
            del metric_point["**"]
            self.metrics_history.append(metric_point)
            if len(self.metrics_history) > 200:
                self.metrics_history = self.metrics_history[-200:]

            # Handle pending user commands
            if self._pending_user_commands:
                cmd = self._pending_user_commands.pop(0)
                orch_response = self._orchestrator.handle_user_command(
                    cmd["command"], cmd["type"], current_metrics, self.formulas)
                await broadcast(orch_response)
                await asyncio.sleep(0.5)

            # Orchestrator plans the iteration BEFORE agents run
            orch_plan = self._orchestrator.plan_iteration(iteration, current_metrics, self.formulas)
            await broadcast(orch_plan)
            await asyncio.sleep(0.8)

            if self._stop_event.is_set(): break

            # Run all 3 agents IN PARALLEL using asyncio.gather
            async def run_mathematician():
                try:
                    action = self._mathematician.step(iteration, current_metrics, self.formulas, stream_type)
                    if action.get("formula"):
                        self.formulas.append(action["formula"])
                    await broadcast(action)
                    return action
                except Exception as e:
                    return {"error": str(e)}

            async def run_physicist():
                await asyncio.sleep(0.3)  # slight stagger for realism
                try:
                    action = self._physicist.step(iteration, current_metrics, self.formulas, stream_type)
                    if action.get("formula") and action.get("formulaStatus"):
                        for f in self.formulas:
                            if f["id"] == action.get("formulaId"):
                                f["status"] = action.get("formulaStatus", f["status"])
                                f["testScore"] = action.get("testResult",{}).get("generalizationIndex")
                    await broadcast(action)
                    return action
                except Exception as e:
                    return {"error": str(e)}

            async def run_director():
                await asyncio.sleep(0.6)
                try:
                    action = self._director.step(iteration, current_metrics, self.formulas, stream_type, self._last_messages)
                    await broadcast(action)
                    return action
                except Exception as e:
                    return {"error": str(e)}

            results = await asyncio.gather(run_mathematician(), run_physicist(), run_director(), return_exceptions=True)
            self._last_messages = [r for r in results if isinstance(r, dict) and "type" in r]

            if self._stop_event.is_set(): break

            # Orchestrator synthesizes after agents complete
            synthesis = self._orchestrator.synthesize_iteration(iteration, self._last_messages, current_metrics)
            await broadcast(synthesis)

            # Broadcast metrics + updated state
            await broadcast({"type":"metrics_update","sessionId":self.id,"metrics":metric_point,
                             "network":self.network.to_dict(),"formulas":self.formulas,
                             "phase":self.memory.current_phase,
                             "timestamp":datetime.now(timezone.utc).isoformat()})
            self.updated_at = datetime.now(timezone.utc).isoformat()

            # Wait before next iteration
            delay = random.uniform(2.5, 4.5)
            try:
                await asyncio.wait_for(asyncio.shield(self._stop_event.wait()), timeout=delay)
                break
            except asyncio.TimeoutError:
                pass

        self.status = "paused" if self._stop_event.is_set() else "completed"
        self.updated_at = datetime.now(timezone.utc).isoformat()

    def _compute_current_metrics(self) -> Dict[str, Any]:
        approved = [f for f in self.formulas if f["status"]=="approved"]
        iteration = self.current_iteration
        base_gen = max(approved, key=lambda f: f.get("testScore") or 0).get("testScore") or 0.4 if approved else 0.2
        stream_penalty = {"normal":0.0,"drift":0.1,"ood":0.2,"adversarial":0.25,"catastrophic":0.35}.get(self._current_stream_type,0.0)
        progress = min(1.0, iteration/30)
        noise = random.gauss(0, 0.02)
        convergence = min(0.99, max(0.01, base_gen*progress + 0.3 + noise))
        generalization = min(0.99, max(0.01, base_gen - stream_penalty + noise))
        stability = min(0.99, max(0.01, 0.7 + progress*0.2 + noise - stream_penalty*0.5))
        loss = max(0.0001, 1.0 - convergence + abs(noise)*0.5)
        return {"convergenceSpeed":round(convergence,4),"generalizationIndex":round(generalization,4),
                "synapticStability":round(stability,4),"loss":round(loss,6)}
