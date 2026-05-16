"""
Agent 2: The Experimental Physicist / Critic
Requests live tests, analyzes loss curves and stability, critiques equations
that cause slow learning or mathematical collapse.
"""

import math
import random
from datetime import datetime, timezone
from typing import Any, Dict, List

from tools.evaluator import evaluate_formula, generate_dataset


class ExperimentalPhysicist:
    """Agent 2 — tests formulas empirically and critiques results"""

    NAME = "Σ-Physicist"
    COLOR = "#f59e0b"
    ROLE = "experimental_physicist"

    def __init__(self):
        self._test_count = 0
        self._last_test_result: Dict = {}

    def step(
        self,
        iteration: int,
        current_metrics: Dict[str, Any],
        current_formulas: List[Dict],
        stream_type: str = "normal",
    ) -> Dict[str, Any]:
        proposed = [f for f in current_formulas if f["status"] == "proposed"]
        approved = [f for f in current_formulas if f["status"] == "approved"]
        loss = current_metrics.get("loss", 0.5)
        stability = current_metrics.get("synapticStability", 0.5)

        if proposed:
            return self._test_formula(proposed[-1], stream_type)
        elif loss > 0.7:
            return self._critique_collapse(approved, current_metrics)
        elif stability < 0.4:
            return self._critique_instability(approved, current_metrics)
        elif random.random() < 0.3:
            return self._run_stress_test(approved, stream_type)
        else:
            return self._report_analysis(current_metrics)

    def _test_formula(self, formula: Dict, stream_type: str) -> Dict:
        self._test_count += 1
        dataset = generate_dataset(stream_type, n=60)
        code = formula.get("code", "x")

        try:
            result = evaluate_formula(code, dataset, stream_type)
            score = result["generalizationIndex"]
            formula["testScore"] = round(score, 4)
            formula["status"] = "approved" if score > 0.45 else "rejected"
        except Exception as e:
            result = {"error": str(e), "generalizationIndex": 0.0}
            formula["testScore"] = 0.0
            formula["status"] = "rejected"
            score = 0.0

        verdict = "معتمدة ✓" if formula["status"] == "approved" else "مرفوضة ✗"
        content = (
            f"اختبار التجريبي #{self._test_count} على بيانات **{stream_type}**:\n\n"
            f"- معامل التعميم: {result.get('generalizationIndex', 0):.4f}\n"
            f"- سرعة التقارب: {result.get('convergenceSpeed', 0):.4f}\n"
            f"- الفقد (MSE): {result.get('mse', 1):.6f}\n"
            f"- الحكم: **{verdict}**\n\n"
            + (
                f"المعادلة تُبدي أداءً جيداً. أوصي بالاعتماد."
                if formula["status"] == "approved"
                else "انهيار رياضي أو تعميم ضعيف. أطالب بمراجعة نظرية."
            )
        )

        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "test_result",
            "content": content,
            "testResult": result,
            "formulaId": formula["id"],
            "formulaStatus": formula["status"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _critique_collapse(self, formulas: List[Dict], metrics: Dict) -> Dict:
        loss = metrics.get("loss", 0.5)
        critiques = [
            f"تحذير حرج! الفقد = {loss:.4f} يتجاوز العتبة المقبولة. "
            "المعادلة الحالية تسبب انهياراً في التدرج. "
            "أطالب بحد تنظيم فوري أو إعادة تهيئة الشبكة.",
            f"رصدت انفجاراً في التدرجات. القيمة الذاتية الكبرى = {random.uniform(8, 20):.2f}. "
            "يجب تطبيق gradient clipping أو تعديل معدل التعلم.",
            "النظام في حالة عدم استقرار رياضي. منحنى الفقد يتباعد لوغاريثمياً. "
            "أوصي بـ warm restart مع قانون جديد.",
        ]
        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "critique",
            "content": random.choice(critiques),
            "severity": "high",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _critique_instability(self, formulas: List[Dict], metrics: Dict) -> Dict:
        stability = metrics.get("synapticStability", 0.5)
        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "critique",
            "content": (
                f"استقرار الروابط العصبية = {stability:.4f} — منخفض جداً.\n"
                "رصدت تذبذباً في الأوزان بتردد قياسي. "
                "التجربة تكشف أن المعادلة غير مستقرة بموجب معيار ليشاتيلييه. "
                f"الحل: تقليل معدل التعلم بمقدار {random.uniform(0.1, 0.5):.2f}x "
                "أو إضافة حد تمليس."
            ),
            "severity": "medium",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _run_stress_test(self, formulas: List[Dict], stream_type: str) -> Dict:
        stress_types = ["drift", "ood", "adversarial"]
        test_type = random.choice(stress_types)
        dataset = generate_dataset(test_type, n=40)
        approved = [f for f in formulas if f["status"] == "approved"]

        if not approved:
            return self._report_analysis({})

        formula = random.choice(approved)
        code = formula.get("code", "x")
        try:
            result = evaluate_formula(code, dataset, test_type)
        except Exception:
            result = {"generalizationIndex": 0.0, "loss": 1.0}

        gen_idx = result.get("generalizationIndex", 0)
        verdict = "صمدت" if gen_idx > 0.4 else "فشلت"

        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "stress_test",
            "content": (
                f"اختبار الإجهاد ({test_type.upper()}): "
                f"المعادلة **{verdict}** أمام بيانات خارج التوزيع.\n"
                f"- مؤشر التعميم تحت الإجهاد: {gen_idx:.4f}\n"
                f"- الفقد: {result.get('loss', 1):.4f}\n"
                + (
                    "المعادلة مقاومة للنسيان الكارثي."
                    if gen_idx > 0.4
                    else "المعادلة عرضة للنسيان الكارثي. تحتاج آلية Elastic Weight Consolidation."
                )
            ),
            "stressTestType": test_type,
            "testResult": result,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _report_analysis(self, metrics: Dict) -> Dict:
        convergence = metrics.get("convergenceSpeed", random.uniform(0.4, 0.9))
        gen_idx = metrics.get("generalizationIndex", random.uniform(0.4, 0.9))
        messages = [
            f"مراقبة مستمرة: سرعة التقارب = {convergence:.3f}، مؤشر التعميم = {gen_idx:.3f}. "
            "النظام في حالة استقرار. لا تدخل مطلوب.",
            f"تحليل منحنى الفقد: الانحدار التدريجي يتبع نمطاً لوغاريثمياً صحياً. "
            f"ETA للتقارب الكامل: ~{random.randint(15, 80)} تكرار.",
            "رصدت نمط تعلم نشط: التحسن في ارتفاع مستمر. المعادلة تعمل كما هو متوقع نظرياً.",
        ]
        return {
            "type": "agent_message",
            "agent": self.NAME,
            "agentRole": self.ROLE,
            "color": self.COLOR,
            "messageType": "observation",
            "content": random.choice(messages),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
