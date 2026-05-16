import { useEffect, useRef } from "react";
import type { AgentMessage } from "@/lib/researchApi";

const MSG_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  formula_proposal: { label: "FORMULA", color: "#60a5fa" },
  test_result: { label: "TEST", color: "#f59e0b" },
  critique: { label: "CRITIQUE", color: "#ef4444" },
  verdict: { label: "VERDICT", color: "#a78bfa" },
  progress_summary: { label: "SUMMARY", color: "#06b6d4" },
  analysis: { label: "ANALYSIS", color: "#34d399" },
  observation: { label: "OBS", color: "#6b7280" },
  moderation: { label: "DIR", color: "#a78bfa" },
  session_open: { label: "START", color: "#10b981" },
  stress_test: { label: "STRESS", color: "#f97316" },
  directive: { label: "DIRECTIVE", color: "#a78bfa" },
  human_intervention: { label: "HUMAN", color: "#10b981" },
  stream_injection: { label: "STREAM", color: "#06b6d4" },
  threshold_update: { label: "THRESHOLD", color: "#06b6d4" },
};

interface Props {
  messages: AgentMessage[];
  isConnected: boolean;
}

export default function AgentDebateTerminal({ messages, isConnected }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-mono text-gray-400">AGENT DEBATE TERMINAL</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-gray-600"}`}
            style={isConnected ? { boxShadow: "0 0 6px #34d399" } : {}}
          />
          <span className={`text-xs font-mono ${isConnected ? "text-emerald-400" : "text-gray-500"}`}>
            {isConnected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-sm" data-testid="debate-terminal">
        {messages.length === 0 && (
          <div className="text-gray-600 text-xs text-center py-8">
            Waiting for agent transmissions...
          </div>
        )}
        {messages.map((msg, i) => {
          const typeInfo = MSG_TYPE_LABELS[msg.messageType] || { label: msg.messageType?.toUpperCase() || "MSG", color: "#6b7280" };
          const agentColor = msg.color || "#6b7280";
          return (
            <div
              key={i}
              className="rounded border border-gray-800 bg-gray-900 p-2.5 space-y-1"
              style={{ borderLeftColor: agentColor, borderLeftWidth: 3 }}
              data-testid={`message-${i}`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ color: agentColor, background: `${agentColor}18`, border: `1px solid ${agentColor}44` }}
                >
                  {msg.agent}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ color: typeInfo.color, background: `${typeInfo.color}18`, border: `1px solid ${typeInfo.color}33` }}
                >
                  {typeInfo.label}
                </span>
                <span className="text-gray-600 text-xs ml-auto">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="text-gray-200 text-xs whitespace-pre-wrap leading-relaxed" dir="auto">
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
