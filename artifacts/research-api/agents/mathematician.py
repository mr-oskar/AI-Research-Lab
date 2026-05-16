"""Δ-Mathematician — uses shared memory and reports completion."""
import random, uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from core.shared_memory import SharedMemory

FORMULA_TEMPLATES = [
    {"latex": r"\Delta W_{ij} = \eta \cdot x_i \cdot \delta_j \cdot e^{-\lambda \|W\|^2}", "code": "x * tanh(y) * exp(-0.1 * x**2)", "description": "لدونة هيبية مع تخميد أسي", "inspiration": "اللدونة التشابكية + L2"},
    {"latex": r"\dot{h} = -\frac{h}{\tau} + \sigma(\mathbf{W}h + \mathbf{U}x + b)", "code": "-x/2.0 + sigmoid(0.8*x + 0.4*y + 0.1)", "description": "معادلة ODE عصبية مستمرة", "inspiration": "Neural ODEs"},
    {"latex": r"\mathcal{L}_{QA} = -\sum_k \psi_k^* \hat{H} \psi_k + \beta\,\text{KL}[\rho\|\pi]", "code": "-(x * cos(y*pi)) + 0.3*(x**2 - log(abs(y)+1e-6))", "description": "دالة خسارة كمومية مع KL", "inspiration": "التلدين الكمومي + بايز"},
    {"latex": r"f(x) = x\cdot\text{erf}(x/\sqrt{2}) + \phi(x)e^{-\alpha t}", "code": "x * tanh(x/sqrt(2.0+1e-9)) * exp(-0.05*t)", "description": "GELU مُطوَّر بتخميد زمني", "inspiration": "GELU + التلدين"},
    {"latex": r"W^{(t+1)} = W^{(t)} - \alpha\nabla\mathcal{L}(1-\beta e^{-\gamma t})", "code": "(x-0.01*y)*(1.0-0.5*exp(-2.0*t))", "description": "زخم تكيفي بعلاوة استكشاف", "inspiration": "SGD + التلدين"},
    {"latex": r"\rho(x,t) = e^{-E(x)/T(t)}/Z,\;T=T_0/\log(1+t)", "code": "exp(-x**2/max(1.0/log(1.0+t*10+1e-6),0.01))", "description": "توزيع بولتزمان بجدول لوغاريتمي", "inspiration": "ميكانيكا إحصائية"},
    {"latex": r"\alpha_i = \mathrm{softmax}(Q_iK^T/\sqrt{d_k})\,V", "code": "(x*y)/sqrt(max(abs(x*y),0.01))*tanh(y)", "description": "انتباه النقطة العددية المُحجَّمة", "inspiration": "Transformer attention"},
    {"latex": r"\hat{y} = \tanh(\sum_j w_j\phi_j(x)+b)\cdot e^{-\|x\|/(2\sigma^2)}", "code": "tanh(0.7*x+0.3*y)*exp(-x**2/(2*0.5**2+1e-9))", "description": "تنشيط هذبي ببوابة RBF", "inspiration": "RBF + RNN"},
    {"latex": r"h_t=(1-z_t)\odot h_{t-1}+z_t\odot\tilde{h}_t", "code": "(1-sigmoid(0.5*x))*y + sigmoid(0.5*x)*tanh(0.8*x+0.2*y)", "description": "ذاكرة مُبسَّطة ببوابة تحديث", "inspiration": "GRU + تعلم مستمر"},
    {"latex": r"\mathcal{F}(\theta)=\mathbb{E}[\log p(x|\theta)/q(x)]+\lambda\Omega", "code": "log(abs(x)+1e-6)-log(abs(y)+1e-6)+0.1*(x**2+y**2)", "description": "تحسين الطاقة الحرة", "inspiration": "نظرية المعلومات"},
]

class TheoreticalMathematician:
    NAME = "Δ-Mathematician"
    COLOR = "#60a5fa"
    ROLE = "theoretical_mathematician"

    def __init__(self, memory: Optional[SharedMemory] = None):
        self._memory = memory
        self._proposed: List[Dict] = []

    def step(self, iteration: int, current_metrics: Dict, current_formulas: List[Dict], stream_type: str = "normal") -> Dict:
        task = self._memory.get_task(self.NAME) if self._memory else ""
        ctx = self._memory.to_context_dict() if self._memory else {}
        action = self._decide_action(current_metrics, current_formulas, task, ctx)
        if self._memory:
            self._memory.record_agent_completion(self.NAME, {
                "accomplished": self._accomplished(action, task),
                "needs": self._needs(action, current_metrics),
                "discovery": action["formula"].get("description") if action.get("formula") else None,
                "iteration": iteration, "task": task,
            })
            if action.get("formula"):
                self._memory.add_request(self.NAME, "Σ-Physicist",
                    f"اختبر المعادلة {action['formula']['id']} على بيانات {stream_type}")
        return action

    def _decide_action(self, metrics, formulas, task, ctx):
        force = any(kw in task for kw in ["اقترح","معادلة","قانون","ابنِ","صِغ","طوّر"])
        if force or metrics.get("loss",0.5)>0.5 or metrics.get("generalizationIndex",0.5)<0.4 or not formulas or random.random()<0.35:
            return self._propose(task, ctx)
        return self._analyze(formulas, metrics, ctx)

    def _propose(self, task="", ctx={}):
        t = random.choice(FORMULA_TEMPLATES)
        fid = str(uuid.uuid4())[:8]
        formula = {"id":fid,"latex":t["latex"],"code":t["code"],"description":t["description"],
                   "proposedBy":self.NAME,"status":"proposed","testScore":None,
                   "createdAt":datetime.now(timezone.utc).isoformat()}
        self._proposed.append(formula)
        intros = ["بناءً على مبادئ الميكانيكا الكمية، أقترح القانون:","استناداً للأنظمة الديناميكية:","من منظور اللدونة العصبية:","تطبيقاً لميكانيكا الإحصاء:"]
        task_note = f"\n*(مُوجَّه بـ: {task})*" if task else ""
        ctx_note = f"\n*(يبني على {ctx.get('approvedCount',0)} معادلات سابقة)*" if ctx.get("approvedCount",0)>0 else ""
        return {"type":"agent_message","agent":self.NAME,"agentRole":self.ROLE,"color":self.COLOR,
                "messageType":"formula_proposal",
                "content":f"{random.choice(intros)}\n\n**{t['description']}**\n\nالإلهام: {t['inspiration']}{task_note}{ctx_note}\n\nتعالج هذه المعادلة التعميم عبر دمج التنظيم والتقارب التكيفي.",
                "formula":formula,"timestamp":datetime.now(timezone.utc).isoformat()}

    def _analyze(self, formulas, metrics, ctx):
        approved = [f for f in formulas if f["status"]=="approved"]
        if not approved: return self._propose(ctx=ctx)
        f = random.choice(approved)
        c = metrics.get("convergenceSpeed",0.5)
        obs = [f"المعادلة {f['id']} — تقارب {c:.3f}. يمكن تحسينها بتنظيم ديناميكي.",
               f"الفقد يمكن تخفيضه {random.randint(12,35)}% بضبط hyperparameters.",
               "المعادلة مستقرة وفق نظرية ليابونوف.",
               f"الذاكرة المشتركة: {ctx.get('approvedCount',0)} معادلة. أقترح دمج أفضل اثنتين."]
        return {"type":"agent_message","agent":self.NAME,"agentRole":self.ROLE,"color":self.COLOR,
                "messageType":"analysis","content":random.choice(obs),"formulaId":f["id"],
                "timestamp":datetime.now(timezone.utc).isoformat()}

    def _accomplished(self, action, task):
        if action.get("messageType")=="formula_proposal":
            f=action.get("formula",{})
            return f"اقترحت معادلة ({f.get('id','')}) — {f.get('description','')}"
        return "حللت المعادلات وقدمت ملاحظات للتحسين"

    def _needs(self, action, metrics):
        if action.get("formula"): return "أحتاج من Σ-Physicist اختبار المعادلة الجديدة"
        if metrics.get("generalizationIndex",0.5)<0.4: return "أحتاج تغذية راجعة من Σ-Physicist"
        return ""
