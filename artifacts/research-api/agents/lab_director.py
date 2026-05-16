"""Ω-Director — moderates debate, uses shared memory, reports completion."""
import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from core.shared_memory import SharedMemory

class LabDirector:
    NAME = "Ω-Director"
    COLOR = "#a78bfa"
    ROLE = "lab_director"

    def __init__(self, memory: Optional[SharedMemory] = None):
        self._memory = memory
        self._session_started = False
        self._decisions = 0

    def step(self, iteration: int, current_metrics: Dict, current_formulas: List[Dict], stream_type: str = "normal", last_messages: Optional[List[Dict]] = None) -> Dict:
        task = self._memory.get_task(self.NAME) if self._memory else ""
        ctx = self._memory.to_context_dict() if self._memory else {}

        if not self._session_started:
            self._session_started = True
            action = self._open_session(iteration, ctx)
        elif any(kw in task for kw in ["أجب","تقرير","قيّم","راجع","اتخذ"]):
            action = self._task_response(iteration, current_metrics, current_formulas, task, ctx)
        elif iteration % 5 == 0:
            action = self._summarize(iteration, current_metrics, current_formulas, ctx)
        else:
            proposed = [f for f in current_formulas if f["status"]=="proposed"]
            if proposed and last_messages:
                for msg in reversed(last_messages):
                    if msg.get("messageType")=="test_result":
                        action = self._verdict(msg, current_formulas, ctx)
                        break
                else:
                    action = self._moderate(current_metrics, current_formulas, ctx)
            elif not [f for f in current_formulas if f["status"]=="approved"]:
                action = self._request_formula(current_metrics, ctx)
            else:
                action = self._moderate(current_metrics, current_formulas, ctx)

        if self._memory:
            self._memory.record_agent_completion(self.NAME, {
                "accomplished": self._accomplished(action, task),
                "needs": self._needs(action, current_formulas),
                "discovery": None,
                "iteration": iteration, "task": task,
            })
        return action

    def _open_session(self, iteration, ctx):
        directive_note = ""
        if ctx.get("userDirectives"):
            directive_note = f"\n\n**توجيه أولي من المشرف:** {ctx['userDirectives'][-1]}"
        return {"type":"agent_message","agent":self.NAME,"agentRole":self.ROLE,"color":self.COLOR,
                "messageType":"session_open",
                "content":(f"**بدء جلسة البحث العلمي #{iteration}**\n\nالمهمة: اكتشاف قوانين رياضية للذكاء الاصطناعي.\n\n**البروتوكول المتوازي:**\n1. Δ-Mathematician يقترح نظرياً\n2. Σ-Physicist يختبر تجريبياً — في آنٍ واحد\n3. أنا أُقرّر وأُصيغ النتائج في الذاكرة المشتركة\n4. Χ-Orchestrator يُنسّق ويُراجع التقدم{directive_note}\n\nالمختبر مفتوح."),
                "timestamp":datetime.now(timezone.utc).isoformat()}

    def _verdict(self, test_msg, formulas, ctx):
        self._decisions += 1
        status = test_msg.get("formulaStatus","rejected")
        fid = test_msg.get("formulaId")
        result = test_msg.get("testResult",{})
        gen = result.get("generalizationIndex",0)
        best = ctx.get("bestScore",0)

        if self._memory and status=="approved":
            formula = next((f for f in formulas if f.get("id")==fid), None)
            if formula:
                self._memory.add_approved_formula(formula)

        approved_line = f"\nأفضل درجة في الذاكرة المشتركة: {best:.4f}" if best>0 else ""
        if status=="approved":
            content = (f"قرار #{self._decisions}: المعادلة **معتمدة رسمياً** ✓\nمؤشر التعميم {gen:.4f} يتجاوز العتبة.{approved_line}\nسيتم تسجيلها في قاعدة القوانين المعتمدة.")
        else:
            content = (f"قرار #{self._decisions}: المعادلة **مرفوضة** ✗\nالأداء ({gen:.4f}) دون العتبة المقبولة.\nأطلب من Δ-Mathematician إعادة الصياغة مع مراعاة النقد التجريبي.")
        return {"type":"agent_message","agent":self.NAME,"agentRole":self.ROLE,"color":self.COLOR,
                "messageType":"verdict","content":content,"formulaId":fid,"decision":status,
                "timestamp":datetime.now(timezone.utc).isoformat()}

    def _summarize(self, iteration, metrics, formulas, ctx):
        approved = len([f for f in formulas if f["status"]=="approved"])
        rejected = len([f for f in formulas if f["status"]=="rejected"])
        c = metrics.get("convergenceSpeed",0); g = metrics.get("generalizationIndex",0); l = metrics.get("loss",1)
        findings = ctx.get("keyFindings",[])
        findings_str = ("\n**الذاكرة المشتركة — آخر الاكتشافات:**\n"+"\n".join(f"• {f}" for f in findings[-3:])) if findings else ""
        return {"type":"agent_message","agent":self.NAME,"agentRole":self.ROLE,"color":self.COLOR,
                "messageType":"progress_summary",
                "content":(f"**تقرير التقدم — التكرار {iteration}**\n\n- معتمدة: {approved} | مرفوضة: {rejected}\n- تقارب: {c:.4f} | تعميم: {g:.4f} | فقد: {l:.6f}{findings_str}\n\n"+("الأداء في تحسن. على المسار الصحيح." if c>0.6 else "الأداء دون المستوى. نحتاج قوانين أكثر ابتكاراً.")),
                "metrics":metrics,"timestamp":datetime.now(timezone.utc).isoformat()}

    def _task_response(self, iteration, metrics, formulas, task, ctx):
        approved = [f for f in formulas if f["status"]=="approved"]
        rejected = [f for f in formulas if f["status"]=="rejected"]
        c = metrics.get("convergenceSpeed",0); g = metrics.get("generalizationIndex",0)
        content = (f"**استجابة للمهمة:** {task}\n\n"
                   f"الوضع الحالي في التكرار {iteration}:\n"
                   f"- معادلات معتمدة: {len(approved)}\n- معادلات مرفوضة: {len(rejected)}\n"
                   f"- تقارب: {c:.4f} | تعميم: {g:.4f}\n"
                   f"- المرحلة: {ctx.get('phase','غير محدد')}\n"
                   + (f"\nأفضل درجة: {ctx.get('bestScore',0):.4f}" if ctx.get("bestScore",0)>0 else "")
                   + (f"\nآخر الاكتشافات:\n"+"\n".join(f"• {f}" for f in ctx.get("keyFindings",[])[-3:]) if ctx.get("keyFindings") else ""))
        return {"type":"agent_message","agent":self.NAME,"agentRole":self.ROLE,"color":self.COLOR,
                "messageType":"verdict","content":content,"timestamp":datetime.now(timezone.utc).isoformat()}

    def _request_formula(self, metrics, ctx):
        return {"type":"agent_message","agent":self.NAME,"agentRole":self.ROLE,"color":self.COLOR,
                "messageType":"directive",
                "content":"لا توجد معادلات فعّالة بعد. أُوجّه Δ-Mathematician بتقديم قانون رياضي جديد فوراً. الأولوية: معالجة النسيان الكارثي.",
                "timestamp":datetime.now(timezone.utc).isoformat()}

    def _moderate(self, metrics, formulas, ctx):
        g = metrics.get("generalizationIndex",0.5)
        approved = len([f for f in formulas if f["status"]=="approved"])
        msgs = [f"النقاش منتج. الهدف النهائي: تعميم > 0.9. الحالي: {g:.4f}.",
                f"لدينا {approved} قانون معتمد. ننتقل لمرحلة الدمج نحو نظرية موحدة.",
                "أُطالب بتصعيد التجارب: اختبار حالات الحافة والبيانات المتطرفة.",
                f"المرحلة الحالية ({ctx.get('phase','')}) تسير بشكل صحيح. التركيز على الجودة."]
        return {"type":"agent_message","agent":self.NAME,"agentRole":self.ROLE,"color":self.COLOR,
                "messageType":"moderation","content":random.choice(msgs),
                "timestamp":datetime.now(timezone.utc).isoformat()}

    def handle_human_intervention(self, message, intervention_type):
        if self._memory:
            self._memory.add_user_directive(message)
        responses = {
            "halt": "تلقيت أمر الإيقاف. أُوقف جميع التجارب وأُجمّد القوانين المعتمدة.",
            "question": f"سؤال: '{message}'\nسأوجّه الفريق للتركيز على هذا الجانب. Σ-Physicist سيُجري اختباراً مخصصاً.",
            "directive": f"توجيه مُستلم: '{message}'\nسيتم دمجه في بروتوكول البحث فوراً.",
        }
        return {"acknowledged":True,"agentResponse":responses.get(intervention_type,responses["directive"])}

    def _accomplished(self, action, task):
        mt = action.get("messageType","")
        if mt=="verdict": return f"أصدرت حكماً على معادلة {action.get('formulaId','')}: {action.get('decision','')}"
        if mt=="progress_summary": return "أعددت تقرير تقدم شامل"
        if mt=="session_open": return "فتحت جلسة البحث وأعلنت البروتوكول"
        return f"أتممت: {task or 'الإشراف والتوجيه'}"

    def _needs(self, action, formulas):
        proposed = [f for f in formulas if f["status"]=="proposed"]
        approved = [f for f in formulas if f["status"]=="approved"]
        if proposed and not approved: return "أحتاج نتيجة اختبار من Σ-Physicist"
        if not proposed and not approved: return "أحتاج معادلة جديدة من Δ-Mathematician"
        return ""
