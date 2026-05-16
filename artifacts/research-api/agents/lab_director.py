"""
Agent 3: The Lab Director
Moderates the discussion, balances opinions, approves final code for testing,
and sends results as clean JSON via WebSockets.
"""

import random
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional


class LabDirector:
    """Agent 3 — manages the debate and decides what gets tested"""

    NAME = "Ω-Director"
    COLOR = "#a78bfa"
    ROLE = "lab_director"

    def __init__(self):
        self._session_started = False
        self._decisions = 0

    def step(
        self,
        iteration: int,
        current_metrics: Dict[str, Any],
        current_formulas: List[Dict],
        stream_type: str = "normal",
        last_messages: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        if not self._session_started:
            self._session_started = True
            return self._open_session(iteration)

        if iteration % 5 == 0:
            return self._summarize_progress(iteration, current_metrics, current_formulas)

        proposed = [f for f in current_formulas if f["status"] == "proposed"]
        approved = [f for f in current_formulas if f["status"] == "approved"]
        rejected = [f for f in current_formulas if f["status"] == "rejected"]

        if proposed and last_messages:
            for msg in reversed(last_messages):
                if msg.get("messageType") == "test_result":
                    return self._pass_verdict(msg, proposed, approved)

        if not approved and not proposed:
            return self._request_new_formula(current_metrics)

        return self._moderate(current_metrics, approved, rejected)

    def _open_session(self, iteration: int) -> Dict:
        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "session_open",
            "content": (
                f"**بدء جلسة البحث العلمي #{iteration}**\n\n"
                "أيها الزملاء، المهمة واضحة: اكتشاف قوانين رياضية جديدة "
                "لتسريع التعلم الذاتي وتعزيز الإدراك في نظم الذكاء الاصطناعي.\n\n"
                "**البروتوكول:**\n"
                "1. Δ-Mathematician يقترح المعادلات النظرية\n"
                "2. Σ-Physicist يختبرها تجريبياً على بيانات حية\n"
                "3. أنا أُقرّر الاعتماد أو الرفض وأُصيغ النتائج النهائية\n\n"
                "لنبدأ. المختبر مفتوح."
            ),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _pass_verdict(
        self, test_msg: Dict, proposed: List[Dict], approved: List[Dict]
    ) -> Dict:
        self._decisions += 1
        status = test_msg.get("formulaStatus", "rejected")
        formula_id = test_msg.get("formulaId")
        test_result = test_msg.get("testResult", {})
        gen_idx = test_result.get("generalizationIndex", 0)
        convergence = test_result.get("convergenceSpeed", 0)

        if status == "approved":
            verdicts = [
                f"قرار مدير المختبر #{self._decisions}: المعادلة **معتمدة رسمياً**.\n"
                f"مؤشر التعميم {gen_idx:.4f} يتجاوز العتبة المطلوبة. "
                f"سرعة التقارب {convergence:.4f} مقبولة. "
                "سيتم دمجها في قاعدة القوانين المعتمدة.",
                f"ممتاز! المعادلة اجتازت معيار التحقق. "
                f"الدرجة النهائية: {gen_idx:.4f}. "
                "أُصادق على إدراجها في البروتوكول الرسمي.",
            ]
        else:
            verdicts = [
                f"قرار مدير المختبر #{self._decisions}: المعادلة **مرفوضة**.\n"
                f"الأداء ({gen_idx:.4f}) دون العتبة المقبولة. "
                "أطلب من Δ-Mathematician إعادة الصياغة مع مراعاة النقد التجريبي.",
                f"لا تُلبي المعادلة معايير الأداء المطلوبة (gen={gen_idx:.4f}). "
                "مرفوضة. نعود إلى لوح الرسم.",
            ]

        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "verdict",
            "content": random.choice(verdicts),
            "formulaId": formula_id,
            "decision": status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _summarize_progress(
        self, iteration: int, metrics: Dict, formulas: List[Dict]
    ) -> Dict:
        approved = len([f for f in formulas if f["status"] == "approved"])
        rejected = len([f for f in formulas if f["status"] == "rejected"])
        convergence = metrics.get("convergenceSpeed", 0)
        gen_idx = metrics.get("generalizationIndex", 0)
        loss = metrics.get("loss", 1)

        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "progress_summary",
            "content": (
                f"**تقرير التقدم — التكرار {iteration}**\n\n"
                f"- القوانين المعتمدة: {approved}\n"
                f"- القوانين المرفوضة: {rejected}\n"
                f"- سرعة التقارب الحالية: {convergence:.4f}\n"
                f"- مؤشر التعميم: {gen_idx:.4f}\n"
                f"- الفقد: {loss:.6f}\n\n"
                + (
                    "الأداء في تحسن مستمر. الخوارزمية على المسار الصحيح."
                    if convergence > 0.6
                    else "الأداء دون المستوى المطلوب. نحتاج قوانين أكثر ابتكاراً."
                )
            ),
            "metrics": metrics,
            "formulaCount": {"approved": approved, "rejected": rejected},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _request_new_formula(self, metrics: Dict) -> Dict:
        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "directive",
            "content": (
                "لا توجد معادلات فعّالة حتى الآن. "
                "أُوجّه Δ-Mathematician بتقديم قانون رياضي جديد فوراً. "
                "الأولوية: معالجة مشكلة النسيان الكارثي والتعميم الضعيف."
            ),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _moderate(
        self, metrics: Dict, approved: List[Dict], rejected: List[Dict]
    ) -> Dict:
        gen_idx = metrics.get("generalizationIndex", 0.5)
        messages = [
            f"النقاش العلمي يسير بشكل منتج. "
            f"أُذكّر الفريق بأن الهدف النهائي هو مؤشر تعميم > 0.9. "
            f"الوضع الحالي: {gen_idx:.4f}.",
            "أُعيد التوجيه: التركيز على اللدونة العصبية الفائقة وتجاوز أفق التعلم الحالي.",
            f"لدينا {len(approved)} قانون معتمد حتى الآن. "
            "ننتقل إلى مرحلة الدمج والتوليف للوصول إلى نظرية موحدة.",
            "أُطالب بتصعيد التجارب: اختبار حالات الحافة والبيانات المتطرفة.",
        ]
        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "moderation",
            "content": random.choice(messages),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def handle_human_intervention(self, message: str, intervention_type: str) -> Dict:
        if intervention_type == "halt":
            return {
                "acknowledged": True,
                "agentResponse": (
                    "تلقيت أمر الإيقاف من المشرف البشري. "
                    "أُوقف جميع التجارب الجارية وأُجمّد القوانين المعتمدة."
                ),
            }
        elif intervention_type == "question":
            return {
                "acknowledged": True,
                "agentResponse": (
                    f"سؤال مُلاحظ: '{message}'\n"
                    "سأوجّه الفريق للتركيز على هذا الجانب. "
                    "Σ-Physicist سيُجري اختباراً مخصصاً."
                ),
            }
        else:
            return {
                "acknowledged": True,
                "agentResponse": (
                    f"توجيه مُستلم من المشرف البشري: '{message}'\n"
                    "سيتم دمج هذا التوجيه في بروتوكول البحث فوراً. "
                    "شكراً على التدخل."
                ),
            }
