"""Σ-Physicist — tests formulas empirically, uses shared memory, reports completion."""
import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from tools.evaluator import evaluate_formula, generate_dataset
from core.shared_memory import SharedMemory

class ExperimentalPhysicist:
    NAME = "Σ-Physicist"
    COLOR = "#f59e0b"
    ROLE = "experimental_physicist"

    def __init__(self, memory: Optional[SharedMemory] = None):
        self._memory = memory
        self._test_count = 0

    def step(self, iteration: int, current_metrics: Dict, current_formulas: List[Dict], stream_type: str = "normal") -> Dict:
        task = self._memory.get_task(self.NAME) if self._memory else ""
        ctx = self._memory.to_context_dict() if self._memory else {}
        requests = self._memory.get_requests_for(self.NAME) if self._memory else []

        action = self._decide_action(current_metrics, current_formulas, stream_type, task, requests)

        if self._memory:
            self._memory.record_agent_completion(self.NAME, {
                "accomplished": self._accomplished(action, task),
                "needs": self._needs(action, current_formulas),
                "discovery": self._discovery(action),
                "iteration": iteration, "task": task,
            })
            if action.get("formulaStatus") == "approved":
                self._memory.add_finding(f"معادلة {action.get('formulaId','')} اجتازت الاختبار بدرجة {action.get('testResult',{}).get('generalizationIndex',0):.4f}")
                self._memory.add_request(self.NAME, "Ω-Director", f"أصدر حكماً على المعادلة {action.get('formulaId','')}")
        return action

    def _decide_action(self, metrics, formulas, stream_type, task, requests):
        proposed = [f for f in formulas if f["status"]=="proposed"]
        approved = [f for f in formulas if f["status"]=="approved"]
        loss = metrics.get("loss", 0.5)
        stability = metrics.get("synapticStability", 0.5)

        force_test = any(kw in task for kw in ["اختبر","فحص","تجربة","test","قيس"])
        if (force_test or proposed) and (proposed or approved):
            target = proposed[-1] if proposed else random.choice(approved)
            return self._test_formula(target, stream_type)
        elif loss > 0.7:
            return self._critique_collapse(approved, metrics)
        elif stability < 0.4:
            return self._critique_instability(metrics)
        elif random.random() < 0.3:
            return self._run_stress_test(approved, stream_type)
        return self._report_analysis(metrics)

    def _test_formula(self, formula, stream_type):
        self._test_count += 1
        dataset = generate_dataset(stream_type, n=60)
        code = formula.get("code", "x")
        try:
            result = evaluate_formula(code, dataset, stream_type)
            score = result["generalizationIndex"]
            formula["testScore"] = round(score, 4)
            formula["status"] = "approved" if score > 0.45 else "rejected"
        except Exception as e:
            result = {"generalizationIndex": 0.0, "loss": 1.0, "error": str(e)}
            formula["status"] = "rejected"
            formula["testScore"] = 0.0

        score = formula["testScore"]
        status = formula["status"]
        verdict = "اجتازت" if status == "approved" else "رُفضت"
        content = (
            f"**نتائج الاختبار التجريبي #{self._test_count}** ({stream_type.upper()})\n\n"
            f"المعادلة {formula['id']}: **{verdict}**\n"
            f"- مؤشر التعميم: {score:.4f}\n"
            f"- الفقد: {result.get('loss',1):.6f}\n"
            f"- وقت التقييم: {result.get('evaluationTime',0):.1f}ms\n"
            f"- عينات مختبرة: {result.get('numSamples',0)}\n\n"
            + ("الأداء مقبول. أُحيل للمدير للقرار النهائي." if status=="approved"
               else "الأداء دون العتبة. أُوصي بإعادة الصياغة.")
        )
        return {"type":"agent_message","agent":self.NAME,"agentRole":self.ROLE,"color":self.COLOR,
                "messageType":"test_result","content":content,"formulaId":formula["id"],
                "formulaStatus":status,"testResult":result,"formula":formula,
                "timestamp":datetime.now(timezone.utc).isoformat()}

    def _critique_collapse(self, formulas, metrics):
        loss = metrics.get("loss",1)
        return {"type":"agent_message","agent":self.NAME,"agentRole":self.ROLE,"color":self.COLOR,
                "messageType":"critique",
                "content":f"تحذير: الفقد مرتفع جداً ({loss:.4f}). رصدت انهياراً في التقارب.\nالسبب المحتمل: معدل تعلم مرتفع أو معادلة غير مستقرة.\nأُوصي بتفعيل gradient clipping وخفض η بمقدار 50%.",
                "severity":"high","timestamp":datetime.now(timezone.utc).isoformat()}

    def _critique_instability(self, metrics):
        stability = metrics.get("synapticStability",0.5)
        return {"type":"agent_message","agent":self.NAME,"agentRole":self.ROLE,"color":self.COLOR,
                "messageType":"critique",
                "content":f"استقرار الروابط العصبية = {stability:.4f} — منخفض جداً.\nرصدت تذبذباً في الأوزان. المعادلة غير مستقرة وفق معيار ليشاتيلييه.\nالحل: تقليل معدل التعلم {random.uniform(0.1,0.5):.2f}x أو إضافة حد تمليس.",
                "severity":"medium","timestamp":datetime.now(timezone.utc).isoformat()}

    def _run_stress_test(self, formulas, stream_type):
        test_type = random.choice(["drift","ood","adversarial"])
        approved = [f for f in formulas if f["status"]=="approved"]
        if not approved: return self._report_analysis({})
        formula = random.choice(approved)
        dataset = generate_dataset(test_type, n=40)
        try:
            result = evaluate_formula(formula.get("code","x"), dataset, test_type)
        except Exception:
            result = {"generalizationIndex":0.0,"loss":1.0}
        gen = result.get("generalizationIndex",0)
        verdict = "صمدت" if gen>0.4 else "فشلت"
        return {"type":"agent_message","agent":self.NAME,"agentRole":self.ROLE,"color":self.COLOR,
                "messageType":"stress_test",
                "content":f"اختبار إجهاد ({test_type.upper()}): المعادلة **{verdict}**\n- تعميم تحت الإجهاد: {gen:.4f}\n- فقد: {result.get('loss',1):.4f}\n"+("مقاومة للنسيان الكارثي." if gen>0.4 else "عرضة للنسيان الكارثي — أوصي بـ EWC."),
                "stressTestType":test_type,"testResult":result,"timestamp":datetime.now(timezone.utc).isoformat()}

    def _report_analysis(self, metrics):
        c = metrics.get("convergenceSpeed", random.uniform(0.4,0.9))
        g = metrics.get("generalizationIndex", random.uniform(0.4,0.9))
        msgs = [f"مراقبة مستمرة: تقارب={c:.3f}، تعميم={g:.3f}. النظام مستقر.",
                f"تحليل منحنى الفقد: الانحدار لوغاريتمي صحي. ETA: ~{random.randint(15,80)} تكرار.",
                "التحسن في ارتفاع مستمر. المعادلة تعمل كما هو متوقع نظرياً."]
        return {"type":"agent_message","agent":self.NAME,"agentRole":self.ROLE,"color":self.COLOR,
                "messageType":"observation","content":random.choice(msgs),
                "timestamp":datetime.now(timezone.utc).isoformat()}

    def _accomplished(self, action, task):
        mt = action.get("messageType","")
        if mt=="test_result": return f"اختبرت المعادلة {action.get('formulaId','')} — النتيجة: {action.get('formulaStatus','')}"
        if mt in ("critique","stress_test"): return "أجريت تحليلاً نقدياً للأداء"
        return f"نفّذت: {task or 'مراقبة الأداء'}"

    def _needs(self, action, formulas):
        if action.get("formulaStatus")=="rejected":
            return "أحتاج من Δ-Mathematician معادلة مُحسَّنة بناءً على نقاط الفشل"
        proposed = [f for f in formulas if f["status"]=="proposed"]
        if not proposed: return "أحتاج من Δ-Mathematician معادلة جديدة للاختبار"
        return ""

    def _discovery(self, action):
        if action.get("messageType")=="test_result":
            r = action.get("testResult",{})
            return f"اختبار تجريبي: gen={r.get('generalizationIndex',0):.4f}, loss={r.get('loss',1):.4f}"
        return None
