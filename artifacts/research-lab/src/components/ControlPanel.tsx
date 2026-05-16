import { useState } from "react";
import type { ResearchSession } from "@/lib/researchApi";

const STATUS_COLORS: Record<string, string> = {
  idle: "#6b7280",
  running: "#10b981",
  paused: "#f59e0b",
  completed: "#60a5fa",
  error: "#ef4444",
};

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
  sessions,
  activeSession,
  sessionStatus,
  perceptionThreshold,
  onCreateSession,
  onSelectSession,
  onStopSession,
  onInjectStream,
  onSetThreshold,
  onIntervene,
  isLoading,
}: Props) {
  const [newName, setNewName] = useState("");
  const [newHypothesis, setNewHypothesis] = useState("");
  const [interventionMsg, setInterventionMsg] = useState("");
  const [interventionType, setInterventionType] = useState("directive");
  const [threshold, setThreshold] = useState(perceptionThreshold);

  const statusColor = STATUS_COLORS[sessionStatus] || "#6b7280";

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateSession(newName.trim(), newHypothesis.trim());
    setNewName("");
    setNewHypothesis("");
  };

  const handleIntervene = () => {
    if (!interventionMsg.trim()) return;
    onIntervene(interventionMsg.trim(), interventionType);
    setInterventionMsg("");
  };

  const handleThresholdChange = (v: number) => {
    setThreshold(v);
    onSetThreshold(v);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 flex-shrink-0">
        <span className="text-xs font-mono text-gray-400">CONTROL PANEL</span>
        <div className="flex-1" />
        {activeSession && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
            <span className="text-xs font-mono" style={{ color: statusColor }}>
              {sessionStatus.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="p-3 space-y-4">
        <section className="space-y-2">
          <h3 className="text-xs font-mono text-cyan-500 uppercase tracking-wider">New Session</h3>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Session name..."
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600"
            data-testid="input-session-name"
          />
          <textarea
            value={newHypothesis}
            onChange={(e) => setNewHypothesis(e.target.value)}
            placeholder="Research hypothesis..."
            rows={2}
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none"
            data-testid="input-hypothesis"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || isLoading}
            className="w-full py-1.5 rounded text-xs font-mono font-bold bg-cyan-900 hover:bg-cyan-800 text-cyan-300 border border-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            data-testid="button-create-session"
          >
            {isLoading ? "Creating..." : "Launch Session"}
          </button>
        </section>

        {sessions.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-mono text-cyan-500 uppercase tracking-wider">Active Sessions</h3>
            <select
              onChange={(e) => onSelectSession(e.target.value)}
              value={activeSession?.id || ""}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-600"
              data-testid="select-session"
            >
              <option value="" disabled>Select session...</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} [{s.status}]
                </option>
              ))}
            </select>
          </section>
        )}

        {activeSession && (
          <>
            <section className="space-y-1">
              <h3 className="text-xs font-mono text-cyan-500 uppercase tracking-wider">Session Control</h3>
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={onStopSession}
                  className="py-1.5 rounded text-xs font-mono bg-gray-800 hover:bg-red-950 text-red-400 border border-gray-700 hover:border-red-800 transition-colors"
                  data-testid="button-stop-session"
                >
                  Stop Session
                </button>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-mono text-cyan-500 uppercase tracking-wider">Data Injection</h3>
              <div className="grid grid-cols-1 gap-1">
                {[
                  { type: "normal", label: "Normal Stream", color: "#10b981" },
                  { type: "drift", label: "Data Drift", color: "#f59e0b" },
                  { type: "ood", label: "Out-of-Distribution", color: "#f97316" },
                  { type: "adversarial", label: "Adversarial Attack", color: "#ef4444" },
                  { type: "catastrophic", label: "Catastrophic Stream", color: "#dc2626" },
                ].map(({ type, label, color }) => (
                  <button
                    key={type}
                    onClick={() => onInjectStream(type, 1.0)}
                    className="py-1.5 rounded text-xs font-mono bg-gray-900 hover:bg-gray-800 border border-gray-800 transition-colors text-left px-2"
                    style={{ color }}
                    data-testid={`button-inject-${type}`}
                  >
                    Inject {label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono text-cyan-500 uppercase tracking-wider">Perception Threshold</h3>
                <span className="text-xs font-mono text-gray-300">{threshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={threshold}
                onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                className="w-full h-1 appearance-none rounded cursor-pointer"
                style={{ accentColor: "#06b6d4" }}
                data-testid="slider-threshold"
              />
              <div className="flex justify-between text-xs font-mono text-gray-600">
                <span>0.0</span>
                <span>1.0</span>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-mono text-cyan-500 uppercase tracking-wider">Human Intervention</h3>
              <textarea
                value={interventionMsg}
                onChange={(e) => setInterventionMsg(e.target.value)}
                placeholder="Enter directive or question..."
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none"
                data-testid="input-intervention"
                dir="auto"
              />
              <select
                value={interventionType}
                onChange={(e) => setInterventionType(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-600"
                data-testid="select-intervention-type"
              >
                <option value="directive">Directive</option>
                <option value="question">Question</option>
                <option value="halt">Halt</option>
              </select>
              <button
                onClick={handleIntervene}
                disabled={!interventionMsg.trim()}
                className="w-full py-1.5 rounded text-xs font-mono font-bold bg-purple-900 hover:bg-purple-800 text-purple-300 border border-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                data-testid="button-intervene"
              >
                Send Intervention
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
