"""
Χ-Orchestrator — Chief Orchestrator Agent
Divides research tasks among agents, assigns parallel workloads,
synthesizes findings in shared memory, and responds to user commands.
"""

import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from core.shared_memory import SharedMemory


PHASES = [
    ("exploration", "نستكشف المساحة الرياضية — كل اقتراح يفتح أفقاً جديداً."),
    ("hypothesis_testing", "نختبر الفرضيات الواعدة بصرامة تجريبية."),
    ("refinement", "نُصفّي ونُحسّن القوانين المعتمدة للوصول لأعلى أداء."),
    ("synthesis", "ندمج النتائج في نظرية موحدة."),
    ("validation", "نتحقق من صلابة النظرية عبر تجارب متطرفة."),
]

PARALLEL_TASK_PLANS = [
    {
        "Δ-Mathematician": "اقترح معادلة جديدة مع التركيز على مقاومة النسيان الكارثي",
        "Σ-Physicist": "اختبر آخر معادلة مقترحة على بيانات OOD وسجّل النتائج",
        "Ω-Director": "حلّل الاتجاه العام وحدّد الأولويات للتكرار القادم",
    },
    {
        "Δ-Mathematician": "طوّر تحسيناً للمعادلة الأفضل أداءً مع إضافة حد تنظيم ديناميكي",
        "Σ-Physicist": "شغّل اختبار ضغط على جميع المعادلات المعتمدة بتيار adversarial",
        "Ω-Director": "راجع الفجوات المعرفية وأسجّل الأسئلة المفتوحة",
    },
    {
        "Δ-Mathematician": "ابنِ معادلة مستوحاة من ميكانيكا الكم لتسريع التقارب",
        "Σ-Physicist": "قيس استقرار الشبكة العصبية بعد كل طفرة هيكلية",
        "Ω-Director": "قيّم هل الفرضية الأصلية لا تزال صالحة أم تحتاج مراجعة",
    },
    {
        "Δ-Mathematician": "صِغ قانوناً رياضياً يجمع الاستقرار والمرونة في آن واحد",
        "Σ-Physicist": "حلّل منحنيات الفقد وحدّد نقاط التحول الحرجة",
        "Ω-Director": "اتخذ قرار الاعتماد النهائي لأفضل مرشح وسجّل المبررات",
    },
]


class ChiefOrchestrator:
    """Χ-Orchestrator — divides and assigns parallel research tasks."""

    NAME = "Χ-Orchestrator"
    COLOR = "#06b6d4"
    ROLE = "chief_orchestrator"

    def __init__(self, memory: SharedMemory):
        self._memory = memory
        self._cycle = 0
        self._last_user_directive: Optional[str] = None
        self._phase_index = 0

    def plan_iteration(self, iteration: int, metrics: Dict, formulas: List[Dict]) -> Dict:
        """
        Analyze research state, assign tasks to agents, return orchestration message.
        Called BEFORE agents run each iteration.
        """
        self._cycle = iteration
        self._memory.iteration = iteration

        # Update phase
        approved = [f for f in formulas if f["status"] == "approved"]
        phase = self._determine_phase(iteration, metrics, formulas)
        self._memory.update_phase(phase)

        # Check for user directive
        directive = self._memory.get_latest_directive()

        # Select task plan
        plan = PARALLEL_TASK_PLANS[iteration % len(PARALLEL_TASK_PLANS)]

        # Override tasks based on user directive or metrics
        if directive and directive != self._last_user_directive:
            self._last_user_directive = directive
            plan = self._create_directive_plan(directive, metrics, formulas)

        # Assign tasks in shared memory
        for agent, task in plan.items():
            self._memory.assign_task(agent, task)

        convergence = metrics.get("convergenceSpeed", 0)
        gen_idx = metrics.get("generalizationIndex", 0)

        context = self._memory.to_context_dict()
        findings_summary = ""
        if context["keyFindings"]:
            findings_summary = "\n**آخر المعطيات من الذاكرة المشتركة:**\n" + "\n".join(
                f"• {f}" for f in context["keyFindings"][-3:]
            )

        # Build orchestration message
        phase_label = {
            "exploration": "الاستكشاف",
            "hypothesis_testing": "اختبار الفرضيات",
            "refinement": "التصفية والتحسين",
            "synthesis": "التوليف",
            "validation": "التحقق النهائي",
        }.get(phase, phase)

        directive_section = ""
        if directive and directive != self._last_user_directive:
            directive_section = f"\n**توجيه المشرف البشري:** {directive}\n"

        content = (
            f"**التكرار {iteration} — المرحلة: {phase_label}**\n"
            f"{directive_section}"
            f"الأداء الحالي: تقارب={convergence:.3f} | تعميم={gen_idx:.3f}\n"
            f"معادلات معتمدة: {len(approved)}\n\n"
            f"**تعيين المهام المتوازية:**\n"
            + "\n".join(f"→ **{agent}**: {task}" for agent, task in plan.items())
            + findings_summary
        )

        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "task_assignment",
            "content": content,
            "taskPlan": plan,
            "phase": phase,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def synthesize_iteration(self, iteration: int, agent_reports: List[Dict], metrics: Dict) -> Dict:
        """
        Called AFTER agents complete their tasks. Synthesizes findings.
        """
        # Collect reports from shared memory
        reports = {}
        for agent in ["Δ-Mathematician", "Σ-Physicist", "Ω-Director"]:
            report = self._memory.agent_completion_reports.get(agent)
            if report:
                reports[agent] = report

        # Build synthesis
        completed = []
        needs = []
        discoveries = []
        for agent_name, report in reports.items():
            if report:
                completed.append(f"**{agent_name}**: {report.get('accomplished', '—')}")
                if report.get("needs"):
                    needs.append(f"**{agent_name}** يحتاج: {report['needs']}")
                if report.get("discovery"):
                    discoveries.append(report["discovery"])
                    self._memory.add_finding(report["discovery"])

        # Update convergence trend
        self._memory.update_convergence(metrics.get("convergenceSpeed", 0))

        convergence = metrics.get("convergenceSpeed", 0)
        content = (
            f"**تقرير التوليف — التكرار {iteration}**\n\n"
            "**ما أنجزه كل وكيل:**\n"
            + ("\n".join(completed) if completed else "— لا تقارير بعد —")
            + ("\n\n**احتياجات الوكلاء:**\n" + "\n".join(needs) if needs else "")
            + ("\n\n**اكتشافات جديدة في الذاكرة المشتركة:**\n" + "\n".join(f"★ {d}" for d in discoveries) if discoveries else "")
            + f"\n\n**تقييم الأداء:** تقارب {convergence:.4f} "
            + ("— في تحسن مستمر" if len(self._memory.convergence_trend) > 1 and convergence > self._memory.convergence_trend[-2] else "— بحاجة لتحسين")
        )

        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "synthesis",
            "content": content,
            "agentReports": reports,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def handle_user_command(self, command: str, command_type: str, metrics: Dict, formulas: List[Dict]) -> Dict:
        """
        Process a free-form user command and distribute tasks accordingly.
        """
        self._memory.add_user_directive(command)
        plan = self._create_directive_plan(command, metrics, formulas)

        for agent, task in plan.items():
            self._memory.assign_task(agent, task)

        content = (
            f"**تلقيت طلبك:** \"{command}\"\n\n"
            f"**تعيين المهام الجديدة:**\n"
            + "\n".join(f"→ **{agent}**: {task}" for agent, task in plan.items())
            + "\n\nالوكلاء يعملون الآن على طلبك."
        )

        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "user_command_ack",
            "content": content,
            "taskPlan": plan,
            "userCommand": command,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _determine_phase(self, iteration: int, metrics: Dict, formulas: List[Dict]) -> str:
        approved = [f for f in formulas if f["status"] == "approved"]
        convergence = metrics.get("convergenceSpeed", 0)

        if iteration <= 3:
            return "exploration"
        elif not approved or len(approved) < 2:
            return "hypothesis_testing"
        elif convergence < 0.6:
            return "refinement"
        elif convergence < 0.8:
            return "synthesis"
        else:
            return "validation"

    def _create_directive_plan(self, directive: str, metrics: Dict, formulas: List[Dict]) -> Dict:
        """Create a task plan based on a user directive."""
        directive_lower = directive.lower()

        # Keyword-based routing
        if any(kw in directive_lower for kw in ["اختبر", "test", "فحص", "تجربة"]):
            return {
                "Δ-Mathematician": "أعدّ معادلة مُحسَّنة استعداداً لجولة اختبارات مكثفة",
                "Σ-Physicist": f"نفّذ اختباراً مُخصصاً بناءً على: {directive}",
                "Ω-Director": "راقب نتائج الاختبار وسجّل الملاحظات في الذاكرة المشتركة",
            }
        elif any(kw in directive_lower for kw in ["قانون", "معادلة", "formula", "اقترح"]):
            return {
                "Δ-Mathematician": f"اقترح معادلة جديدة مُوجَّهة بـ: {directive}",
                "Σ-Physicist": "جهّز بيئة الاختبار لتقييم المقترح القادم",
                "Ω-Director": "حدّد معايير القبول للمعادلة المطلوبة",
            }
        elif any(kw in directive_lower for kw in ["نتائج", "results", "تقرير", "report", "أخبرني"]):
            return {
                "Δ-Mathematician": "لخّص كل المعادلات المقترحة وحالتها في تقرير مفصّل",
                "Σ-Physicist": "أعدّ تقرير الأداء الكامل مع الإحصائيات التفصيلية",
                "Ω-Director": f"أجب على سؤال المشرف: {directive}",
            }
        elif any(kw in directive_lower for kw in ["تحقق", "validate", "صحيح", "verify"]):
            return {
                "Δ-Mathematician": "أجرِ تحققاً نظرياً للمعادلات المعتمدة",
                "Σ-Physicist": "شغّل اختبار التحقق النهائي على جميع المعادلات",
                "Ω-Director": "أصدر حكماً نهائياً على صلاحية النتائج الحالية",
            }
        elif any(kw in directive_lower for kw in ["ركّز", "focus", "ركز", "حسّن"]):
            topic = directive
            return {
                "Δ-Mathematician": f"ركّز كل جهدك على: {topic}",
                "Σ-Physicist": f"صمّم تجارب مخصصة لقياس: {topic}",
                "Ω-Director": f"وجّه الفريق نحو: {topic}",
            }
        else:
            # Generic - distribute the directive broadly
            return {
                "Δ-Mathematician": f"استجب للتوجيه التالي بمقترح نظري: {directive}",
                "Σ-Physicist": f"استجب للتوجيه التالي بتجربة عملية: {directive}",
                "Ω-Director": f"استجب للتوجيه التالي بتقييم شامل: {directive}",
            }
