import { useEffect, useRef, useState, useCallback } from "react";
import type { AgentMessage } from "@/lib/researchApi";

const MSG_STYLES: Record<string, { label: string; color: string }> = {
  formula_proposal:  { label: "FORMULA",   color: "#60a5fa" },
  test_result:       { label: "TEST",      color: "#f59e0b" },
  critique:          { label: "CRITIQUE",  color: "#ef4444" },
  verdict:           { label: "VERDICT",   color: "#a78bfa" },
  progress_summary:  { label: "SUMMARY",   color: "#06b6d4" },
  analysis:          { label: "ANALYSIS",  color: "#34d399" },
  observation:       { label: "OBS",       color: "#6b7280" },
  moderation:        { label: "DIR",       color: "#a78bfa" },
  session_open:      { label: "START",     color: "#10b981" },
  stress_test:       { label: "STRESS",    color: "#f97316" },
  directive:         { label: "DIRECT",    color: "#a78bfa" },
  human_intervention:{ label: "HUMAN",     color: "#10b981" },
  stream_injection:  { label: "STREAM",    color: "#06b6d4" },
  threshold_update:  { label: "THRESH",    color: "#06b6d4" },
  task_assignment:   { label: "ASSIGN",    color: "#06b6d4" },
  synthesis:         { label: "SYNTH",     color: "#8b5cf6" },
  user_command_ack:  { label: "CMD-ACK",   color: "#10b981" },
};

const AGENT_COMPLETION_TYPES = new Set(["synthesis"]);

interface Props {
  messages: AgentMessage[];
  isConnected: boolean;
  onSendCommand: (command: string, type: string) => void;
  sessionActive: boolean;
}

export default function AgentDebateTerminal({ messages, isConnected, onSendCommand, sessionActive }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [cmd, setCmd] = useState("");
  const [cmdType, setCmdType] = useState("directive");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  const handleSend = useCallback(() => {
    if (!cmd.trim()) return;
    onSendCommand(cmd.trim(), cmdType);
    setCmd("");
    setAutoScroll(true);
  }, [cmd, cmdType, onSendCommand]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const fmtTime = (ts: string) => {
    try { return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
    catch { return ""; }
  };

  const QUICK_CMDS = [
    { label: "اختبر الآن", cmd: "اختبر جميع المعادلات المعتمدة الآن", type: "directive" },
    { label: "أرني النتائج", cmd: "أرني تقريراً كاملاً بالنتائج والإحصائيات", type: "question" },
    { label: "ركّز على التقارب", cmd: "ركّز كل الجهود على تحسين سرعة التقارب", type: "directive" },
    { label: "معادلة جديدة", cmd: "اقترح معادلة جديدة مُبتكرة الآن", type: "directive" },
    { label: "حلّل الأداء", cmd: "حلّل الأداء الحالي وحدّد نقاط الضعف", type: "analysis" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 flex-shrink-0">
        <span className="text-xs font-mono text-gray-400">AGENT DEBATE TERMINAL</span>
        <span className="text-xs font-mono text-gray-700">·</span>
        <span className="text-xs font-mono text-gray-600">{messages.length} msgs</span>
        <div className="flex-1" />
        {!autoScroll && (
          <button onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}
            className="text-xs font-mono text-cyan-500 hover:text-cyan-400 px-2 py-0.5 border border-cyan-800 rounded">
            ↓ END
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "animate-pulse" : ""}`}
            style={{ background: isConnected ? "#34d399" : "#374151", boxShadow: isConnected ? "0 0 6px #34d399" : "none" }} />
          <span className={`text-xs font-mono ${isConnected ? "text-emerald-400" : "text-gray-600"}`}>
            {isConnected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-sm min-h-0">
        {messages.length === 0 && (
          <div className="text-gray-600 text-xs text-center py-8">
            انتظر بث الوكلاء...
          </div>
        )}
        {messages.map((msg, i) => {
          const style = MSG_STYLES[msg.messageType] || { label: msg.messageType?.toUpperCase() || "MSG", color: "#6b7280" };
          const agentColor = msg.color || "#6b7280";
          const isSynthesis = AGENT_COMPLETION_TYPES.has(msg.messageType);
          return (
            <div key={i}
              className={`rounded border p-2.5 space-y-1.5 ${isSynthesis ? "bg-purple-950 border-purple-700" : "bg-gray-900 border-gray-800"}`}
              style={{ borderLeftColor: agentColor, borderLeftWidth: 3 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ color: agentColor, background: `${agentColor}18`, border: `1px solid ${agentColor}44` }}>
                  {msg.agent}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded"
                  style={{ color: style.color, background: `${style.color}18`, border: `1px solid ${style.color}33` }}>
                  {style.label}
                </span>
                {isSynthesis && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900 text-purple-300 border border-purple-700">
                    COMPLETION REPORT
                  </span>
                )}
                <span className="text-gray-600 text-xs ml-auto">{fmtTime(msg.timestamp)}</span>
              </div>
              <div className="text-gray-200 text-xs whitespace-pre-wrap leading-relaxed" dir="auto">
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick command buttons */}
      {sessionActive && (
        <div className="flex-shrink-0 border-t border-gray-800 px-2 py-1.5 flex gap-1 overflow-x-auto">
          {QUICK_CMDS.map(({ label, cmd: c, type }) => (
            <button key={label} onClick={() => { onSendCommand(c, type); setAutoScroll(true); }}
              className="text-xs font-mono px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-300 whitespace-nowrap flex-shrink-0 transition-colors">
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Command input */}
      {sessionActive && (
        <div className="flex-shrink-0 border-t border-gray-800 p-2 space-y-1.5">
          <div className="flex gap-1.5">
            <select value={cmdType} onChange={e => setCmdType(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs font-mono text-gray-400 focus:outline-none focus:border-cyan-700 flex-shrink-0">
              <option value="directive">توجيه</option>
              <option value="question">سؤال</option>
              <option value="analysis">تحليل</option>
              <option value="request">طلب</option>
            </select>
            <textarea value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={handleKey}
              placeholder="اكتب أمرك للوكلاء... (Enter للإرسال)" rows={2}
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-700 resize-none"
              dir="auto" />
            <button onClick={handleSend} disabled={!cmd.trim()}
              className="px-3 py-1.5 rounded bg-cyan-900 hover:bg-cyan-800 border border-cyan-700 text-cyan-300 text-xs font-mono font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 self-stretch">
              إرسال
            </button>
          </div>
          <p className="text-xs text-gray-600 font-mono">Χ-Orchestrator يستقبل أوامرك ويوزعها على الوكلاء</p>
        </div>
      )}
    </div>
  );
}
