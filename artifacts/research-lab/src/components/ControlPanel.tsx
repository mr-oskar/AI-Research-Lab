import { useState } from "react";
import type { ResearchSession } from "@/lib/researchApi";

const S = {
  panel:   { background: "rgba(6,6,10,0.97)", borderColor: "#14141f" },
  h2:      { fontSize: 10, color: "#00a2ff", textTransform: "uppercase" as const, letterSpacing: "0.12em", fontFamily: "monospace", borderBottom: "1px solid #1a1a24", paddingBottom: 4, marginTop: 6 },
  input:   { background: "#020204", border: "1px solid #1f1f2e", color: "#e4e4e7", fontFamily: "monospace", fontSize: 11, borderRadius: 3, padding: "6px 8px", width: "100%", outline: "none" },
  select:  { background: "#020204", border: "1px solid #1f1f2e", color: "#e4e4e7", fontFamily: "monospace", fontSize: 11, borderRadius: 3, padding: "6px 8px", width: "100%", outline: "none" },
  label:   { fontSize: 10, color: "#666", fontFamily: "monospace" },
  value:   { fontSize: 10, color: "#e4e4e7", fontFamily: "monospace" },
};

const STATUS_COLOR: Record<string, string> = {
  idle: "#555", running: "#00ffaa", paused: "#ffb700", completed: "#00a2ff", error: "#ff2a85",
};

const STREAMS = [
  { type: "normal",       label: "Normal Stream",       color: "#00ffaa" },
  { type: "drift",        label: "Data Drift",          color: "#ffb700" },
  { type: "ood",          label: "Out-of-Distribution", color: "#ff9900" },
  { type: "adversarial",  label: "Adversarial Attack",  color: "#ff2a85" },
  { type: "catastrophic", label: "Catastrophic Stream", color: "#ff0000" },
];

interface Props {
  sessions: ResearchSession[];
  activeSession: ResearchSession | null;
  sessionStatus: string;
  perceptionThreshold: number;
  onCreateSession: (name: string, hypothesis: string) => void;
  onSelectSession: (id: string) => void;
  onStopSession: () => void;
  onInjectStream: (type: string, intensity: number) => void;
  onSetThreshold: (value: number) => void;
  onIntervene: (message: string, type: string) => void;
  isLoading?: boolean;
}

export default function ControlPanel({
  sessions, activeSession, sessionStatus, perceptionThreshold,
  onCreateSession, onSelectSession, onStopSession,
  onInjectStream, onSetThreshold, onIntervene, isLoading,
}: Props) {
  const [newName, setNewName] = useState("");
  const [newHyp, setNewHyp] = useState("");
  const [intMsg, setIntMsg] = useState("");
  const [intType, setIntType] = useState("directive");
  const [thresh, setThresh] = useState(perceptionThreshold);
  const statusColor = STATUS_COLOR[sessionStatus] || "#555";

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={S.panel}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0 border-b" style={{ borderColor: "#14141f" }}>
        <span style={{ fontSize: 10, color: "#444", fontFamily: "monospace", letterSpacing: "0.12em" }}>CONTROL PANEL</span>
        <div className="flex-1" />
        {activeSession && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
            <span style={{ fontSize: 9, color: statusColor, fontFamily: "monospace", fontWeight: "bold" }}>
              {sessionStatus.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="p-3 space-y-3 flex-1">

        {/* NEW SESSION */}
        <div>
          <div style={S.h2}>جلسة جديدة / NEW SESSION</div>
          <div className="space-y-2 mt-2">
            <input style={S.input} placeholder="Session name..." value={newName}
              onChange={e => setNewName(e.target.value)}
              onFocus={e => (e.target.style.borderColor = "#00a2ff")}
              onBlur={e => (e.target.style.borderColor = "#1f1f2e")} />
            <textarea style={{ ...S.input, resize: "none" }} placeholder="Research hypothesis..." rows={2}
              value={newHyp} onChange={e => setNewHyp(e.target.value)} dir="auto"
              onFocus={e => (e.target.style.borderColor = "#00a2ff")}
              onBlur={e => (e.target.style.borderColor = "#1f1f2e")} />
            <button onClick={() => { if (!newName.trim()) return; onCreateSession(newName.trim(), newHyp.trim()); setNewName(""); setNewHyp(""); }}
              disabled={!newName.trim() || isLoading}
              style={{
                width: "100%", padding: "7px 0", fontSize: 11, fontFamily: "monospace", fontWeight: "bold",
                background: isLoading ? "rgba(0,255,170,0.03)" : "rgba(0,255,170,0.06)",
                border: "2px solid #00ffaa44", color: "#fff", borderRadius: 3, cursor: "pointer",
                boxShadow: "0 0 12px rgba(0,255,170,0.1)", transition: "all 0.2s",
                opacity: (!newName.trim() || isLoading) ? 0.4 : 1,
              }}
              onMouseEnter={e => { if (newName.trim() && !isLoading) { (e.target as HTMLButtonElement).style.background = "rgba(0,255,170,0.15)"; (e.target as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(0,255,170,0.3)"; } }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "rgba(0,255,170,0.06)"; (e.target as HTMLButtonElement).style.boxShadow = "0 0 12px rgba(0,255,170,0.1)"; }}>
              {isLoading ? "Initializing..." : "بدء الجلسة / Launch Session"}
            </button>
          </div>
        </div>

        {/* ACTIVE SESSIONS */}
        {sessions.length > 0 && (
          <div>
            <div style={S.h2}>الجلسات النشطة / ACTIVE SESSIONS</div>
            <select style={{ ...S.select, marginTop: 6 }} value={activeSession?.id ?? ""} onChange={e => onSelectSession(e.target.value)}>
              <option value="" disabled>Select session...</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name} [{s.status}]</option>
              ))}
            </select>
          </div>
        )}

        {activeSession && (
          <>
            {/* SESSION INFO */}
            <div style={{ background: "#020204", border: "1px solid #14141f", borderRadius: 3, padding: "8px 10px", borderLeft: "3px solid #00a2ff" }}>
              <div className="flex justify-between" style={{ fontSize: 10, fontFamily: "monospace", color: "#555", marginBottom: 2 }}>الجلسة الحالية</div>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#e4e4e7", fontWeight: "bold" }}>{activeSession.name}</div>
              <div style={{ fontSize: 9, color: "#444", fontFamily: "monospace", marginTop: 2 }}>{activeSession.hypothesis?.slice(0, 60)}...</div>
            </div>

            {/* STOP */}
            <button onClick={onStopSession}
              style={{ width: "100%", padding: "6px 0", fontSize: 11, fontFamily: "monospace",
                background: "rgba(255,42,133,0.05)", border: "1px solid #ff2a8533", color: "#ff2a85",
                borderRadius: 3, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = "rgba(255,42,133,0.15)"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "rgba(255,42,133,0.05)"; }}>
              ايقاف / Stop Session
            </button>

            {/* DATA INJECTION */}
            <div>
              <div style={S.h2}>حقن تيار البيانات / DATA INJECTION</div>
              <div className="space-y-1 mt-2">
                {STREAMS.map(({ type, label, color }) => (
                  <button key={type} onClick={() => onInjectStream(type, 1.0)}
                    style={{ width: "100%", padding: "5px 8px", fontSize: 10, fontFamily: "monospace",
                      background: `${color}08`, border: `1px solid ${color}22`, color,
                      borderRadius: 3, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
                    onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = `${color}20`; (e.target as HTMLButtonElement).style.boxShadow = `0 0 8px ${color}44`; }}
                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = `${color}08`; (e.target as HTMLButtonElement).style.boxShadow = "none"; }}>
                    ▶ Inject {label}
                  </button>
                ))}
              </div>
            </div>

            {/* THRESHOLD */}
            <div>
              <div style={{ ...S.h2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>عتبة الإدراك / PERCEPTION THRESHOLD</span>
                <span style={{ color: "#00ffaa", fontSize: 11 }}>{thresh.toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={1} step={0.01} value={thresh}
                onChange={e => { const v = parseFloat(e.target.value); setThresh(v); onSetThreshold(v); }}
                style={{ width: "100%", margin: "6px 0", accentColor: "#00ffaa", cursor: "pointer" }} />
              <div className="flex justify-between" style={{ fontSize: 9, fontFamily: "monospace", color: "#333" }}>
                <span>0.0</span><span>1.0</span>
              </div>
            </div>

            {/* HUMAN INTERVENTION */}
            <div>
              <div style={S.h2}>التدخل البشري / HUMAN INTERVENTION</div>
              <div className="space-y-2 mt-2">
                <textarea style={{ ...S.input, resize: "none" }} placeholder="توجيه أو سؤال..." rows={2}
                  value={intMsg} onChange={e => setIntMsg(e.target.value)} dir="auto"
                  onFocus={e => (e.target.style.borderColor = "#bd00ff")}
                  onBlur={e => (e.target.style.borderColor = "#1f1f2e")} />
                <select style={S.select} value={intType} onChange={e => setIntType(e.target.value)}>
                  <option value="directive">توجيه / Directive</option>
                  <option value="question">سؤال / Question</option>
                  <option value="halt">ايقاف / Halt</option>
                </select>
                <button onClick={() => { if (!intMsg.trim()) return; onIntervene(intMsg.trim(), intType); setIntMsg(""); }}
                  disabled={!intMsg.trim()}
                  style={{ width: "100%", padding: "6px 0", fontSize: 11, fontFamily: "monospace", fontWeight: "bold",
                    background: "rgba(189,0,255,0.08)", border: "1px solid #bd00ff44", color: "#bd00ff",
                    borderRadius: 3, cursor: "pointer", opacity: !intMsg.trim() ? 0.4 : 1, transition: "all 0.2s" }}>
                  ارسال / Send Intervention
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
