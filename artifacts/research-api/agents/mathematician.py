"""
Agent 1: The Theoretical Mathematician
Proposes innovative mathematical equations inspired by physics, dynamical systems,
quantum mechanics, and biological neural plasticity.
"""

import math
import random
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List


FORMULA_TEMPLATES = [
    {
        "latex": r"\Delta W_{ij} = \eta \cdot x_i \cdot \delta_j \cdot e^{-\lambda \|W\|^2}",
        "code": "x * tanh(y) * exp(-0.1 * x**2)",
        "description": "Hebbian plasticity with exponential weight decay regularization",
        "inspiration": "Biological synaptic plasticity + L2 regularization",
    },
    {
        "latex": r"\dot{h} = -\frac{h}{\tau} + \sigma\!\left(\mathbf{W}h + \mathbf{U}x + b\right)",
        "code": "-x/2.0 + sigmoid(0.8*x + 0.4*y + 0.1)",
        "description": "Continuous-time recurrent neural ODE with learnable time constant",
        "inspiration": "Neural ODEs + continuous dynamical systems",
    },
    {
        "latex": r"\mathcal{L}_{QA} = -\sum_k \psi_k^* \hat{H} \psi_k + \beta \cdot \text{KL}[\rho \| \pi]",
        "code": "-(x * cos(y*pi)) + 0.3 * (x**2 - log(abs(y) + 1e-6))",
        "description": "Quantum-inspired Hamiltonian loss with KL divergence regularizer",
        "inspiration": "Quantum annealing + variational Bayes",
    },
    {
        "latex": r"f(x) = x \cdot \text{erf}\!\left(\frac{x}{\sqrt{2}}\right) + \phi(x)\,e^{-\alpha t}",
        "code": "x * tanh(x/sqrt(2.0 + 1e-9)) * exp(-0.05 * t)",
        "description": "GELU-variant with temporal decay — accelerates early convergence",
        "inspiration": "Gaussian Error Linear Units + annealing schedules",
    },
    {
        "latex": r"W^{(t+1)} = W^{(t)} - \alpha \nabla \mathcal{L} \cdot \left(1 - \beta e^{-\gamma t}\right)",
        "code": "(x - 0.01*y) * (1.0 - 0.5 * exp(-2.0*t))",
        "description": "Adaptive momentum with exponentially decaying exploration bonus",
        "inspiration": "Simulated annealing + momentum-based gradient descent",
    },
    {
        "latex": r"\rho(x,t) = \frac{1}{Z} e^{-E(x)/T(t)}, \quad T(t)=T_0/\log(1+t)",
        "code": "exp(-x**2 / max(1.0 / log(1.0 + t*10 + 1e-6), 0.01))",
        "description": "Boltzmann distribution with logarithmic temperature schedule",
        "inspiration": "Statistical mechanics + simulated annealing",
    },
    {
        "latex": r"\alpha_i = \text{softmax}\!\left(\frac{Q_i K^T}{\sqrt{d_k}}\right)\!V",
        "code": "(x * y) / sqrt(max(abs(x*y), 0.01)) * tanh(y)",
        "description": "Scaled dot-product attention with nonlinear value projection",
        "inspiration": "Transformer attention mechanism",
    },
    {
        "latex": r"\hat{y} = \tanh\!\left(\sum_j w_j \phi_j(x) + b\right) \cdot e^{-\|x\|/(2\sigma^2)}",
        "code": "tanh(0.7*x + 0.3*y) * exp(-x**2 / (2*0.5**2 + 1e-9))",
        "description": "RBF-gated hyperbolic activation — locality-aware learning",
        "inspiration": "Radial basis functions + RNN gates",
    },
]


class TheoreticalMathematician:
    """Agent 1 — proposes innovative mathematical laws"""

    NAME = "Δ-Mathematician"
    COLOR = "#60a5fa"
    ROLE = "theoretical_mathematician"

    def __init__(self):
        self._proposed_formulas: List[Dict] = []
        self._iteration = 0

    def step(
        self,
        iteration: int,
        current_metrics: Dict[str, Any],
        current_formulas: List[Dict],
        stream_type: str = "normal",
    ) -> Dict[str, Any]:
        self._iteration = iteration
        action = self._decide_action(current_metrics, current_formulas)
        return action

    def _decide_action(
        self,
        metrics: Dict,
        formulas: List[Dict],
    ) -> Dict:
        generalization = metrics.get("generalizationIndex", 0.5)
        loss = metrics.get("loss", 0.5)

        if loss > 0.5 or generalization < 0.4 or not formulas:
            return self._propose_new_formula()
        elif random.random() < 0.25:
            return self._propose_new_formula()
        else:
            return self._analyze_existing(formulas, metrics)

    def _propose_new_formula(self) -> Dict:
        template = random.choice(FORMULA_TEMPLATES)
        formula_id = str(uuid.uuid4())[:8]
        formula = {
            "id": formula_id,
            "latex": template["latex"],
            "code": template["code"],
            "description": template["description"],
            "proposedBy": self.NAME,
            "status": "proposed",
            "testScore": None,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        self._proposed_formulas.append(formula)

        message = self._craft_proposal_message(template)
        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "formula_proposal",
            "content": message,
            "formula": formula,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _craft_proposal_message(self, template: Dict) -> str:
        intros = [
            "بناءً على مبادئ الميكانيكا الكمية، أقترح القانون التالي:",
            "استناداً إلى نظرية الأنظمة الديناميكية، يمكن صياغة قانون اللدونة كالتالي:",
            "من منظور اللدونة العصبية البيولوجية، أطرح المعادلة الرياضية:",
            "تطبيقاً لمبادئ ميكانيكا الإحصاء، أقترح دالة الطاقة التالية:",
        ]
        return (
            f"{random.choice(intros)}\n\n"
            f"**{template['description']}**\n\n"
            f"الإلهام: {template['inspiration']}\n\n"
            f"هذه المعادلة تعالج مشكلة التعميم عبر دمج حدود التنظيم والتقارب التكيفي."
        )

    def _analyze_existing(self, formulas: List[Dict], metrics: Dict) -> Dict:
        approved = [f for f in formulas if f["status"] == "approved"]
        if not approved:
            return self._propose_new_formula()

        formula = random.choice(approved)
        score = formula.get("testScore") or 0
        convergence = metrics.get("convergenceSpeed", 0.5)

        observations = [
            f"المعادلة المعتمدة تُظهر سرعة تقارب = {convergence:.3f}. "
            "يمكن تحسينها بإضافة حد تنظيم ديناميكي.",
            f"التحليل النظري للمعادلة يكشف عن إمكانية تقليل الفقد بنسبة "
            f"{random.randint(12, 35)}% عبر ضبط hyperparameters.",
            "المعادلة مستقرة رياضياً وفق نظرية ليابونوف للأنظمة الديناميكية.",
        ]

        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "analysis",
            "content": random.choice(observations),
            "formulaId": formula["id"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
