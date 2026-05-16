import { useCallback, useEffect, useRef, useState } from "react";
import { researchApi, type ResearchSession } from "@/lib/researchApi";
import { useResearchWebSocket } from "@/hooks/useResearchWebSocket";
import NeuralNetworkCanvas from "@/components/NeuralNetworkCanvas";
import AgentDebateTerminal from "@/components/AgentDebateTerminal";
import FormulaPanel from "@/components/FormulaPanel";
import AnalyticsHub from "@/components/AnalyticsHub";
import ControlPanel from "@/components/ControlPanel";

const PHASE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  initialization:     { label: "INIT",    color: "#6b7280", desc: "تهيئة المختبر" },
  exploration:        { label: "EXPLORE", color: "#60a5fa", desc: "استكشاف المساحة الرياضية" },
  hypothesis_testing: { label: "TEST",    color: "#f59e0b", desc: "اختبار الفرضيات" },
  refinement:         { label: "REFINE",  color: "#f97316", desc: "تصفية وتحسين القوانين" },
  synthesis:          { label: "SYNTH",   color: "#a78bfa", desc: "توليف النتائج" },
  validation:         { label: "VALID",   color: "#10b981", desc: "التحقق النهائي" },
};

const ALL_PHASES = ["exploration", "hypothesis_testing", "refinement", "synthesis", "validation"];

export default function LabPage() {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [localThreshold, setLocalThreshold] = useState(0.85);
  const [thresholdTimer, setThresholdTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [currentPhase, setCurrentPhase] = useState("initialization");

  const {
    messages, metrics, network, formulas, isConnected, sessionStatus, iteration, send
  } = useResearchWebSocket(activeSessionId);

  // Load sessions
  const loadSessions = useCallback(async () => {
    try { setSessions(await researchApi.listSessions()); } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadSessions();
    const t = setInterval(loadSessions, 12000);
    return () => clearInterval(t);
  }, [loadSessions]);

  // Track phase from metrics_update messages
  useEffect(() => {
    const last = messages.filter(m => m.messageType === "task_assignment").slice(-1)[0];
    if (last) {
      const match = last.content?.match(/المرحلة: (\S+)/);
      if (match) {
        const phaseMap: Record<string, string> = {
          "الاستكشاف": "exploration",
          "اختبار": "hypothesis_testing",
          "التصفية": "refinement",
          "التوليف": "synthesis",
          "التحقق": "validation",
        };
        for (const [ar, en] of Object.entries(phaseMap)) {
          if (match[1].includes(ar)) { setCurrentPhase(en); break; }
        }
      }
    }
  }, [messages]);

  const handleCreateSession = useCallback(async (name: string, hypothesis: string) => {
    setIsCreating(true);
    try {
      const session = await researchApi.createSession({ name, hypothesis, perceptionThreshold: localThreshold });
      setSessions(prev => [...prev, session]);
      setActiveSessionId(session.id);
      setActiveSession(session);
      setLocalThreshold(session.perceptionThreshold);
      setCurrentPhase("exploration");
    } catch (e) { console.error(e); }
    finally { setIsCreating(false); }
  }, [localThreshold]);

  const handleSelectSession = useCallback(async (id: string) => {
    setActiveSessionId(id);
    try {
      const s = await researchApi.getSession(id);
      setActiveSession(s);
      setLocalThreshold(s.perceptionThreshold);
    } catch { /* silent */ }
  }, []);

  const handleStopSession = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      const s = await researchApi.stopSession(activeSessionId);
      setActiveSession(s);
      setSessions(prev => prev.map(x => x.id === s.id ? s : x));
    } catch (e) { console.error(e); }
  }, [activeSessionId]);

  const handleInjectStream = useCallback(async (type: string, intensity: number) => {
    if (!activeSessionId) return;
    try {
      await researchApi.injectDataStream(activeSessionId, {
        streamType: type as "normal" | "drift" | "ood" | "adversarial" | "catastrophic",
        intensity, label: `${type} injection`
      });
    } catch (e) { console.error(e); }
  }, [activeSessionId]);

  const handleSetThreshold = useCallback((value: number) => {
    setLocalThreshold(value);
    if (thresholdTimer) clearTimeout(thresholdTimer);
    const t = setTimeout(async () => {
      if (!activeSessionId) return;
      try { await researchApi.setThreshold(activeSessionId, { threshold: value }); }
      catch { /* silent */ }
    }, 600);
    setThresholdTimer(t);
  }, [activeSessionId, thresholdTimer]);

  const handleIntervene = useCallback(async (message: string, type: string) => {
    if (!activeSessionId) return;
    try {
      await researchApi.humanIntervene(activeSessionId, {
        message, type: type as "directive" | "question" | "halt"
      });
    } catch (e) { console.error(e); }
  }, [activeSessionId]);

  const handleSendCommand = useCallback(async (command: string, type: string) => {
    if (!activeSessionId) return;
    try {
      // Queue via HTTP so it's processed next iteration
      await researchApi.sendCommand(activeSessionId, {
        command, type: type as "directive" | "question" | "analysis" | "request"
      });
    } catch {
      // Fallback: send via WebSocket
      send({ type: "user_command", command, commandType: type });
    }
  }, [activeSessionId, send]);

  const handleAddNode = useCallback((nodeType: string) => {
    send({ type: "add_node", nodeType });
  }, [send]);

  const handleRemoveNode = useCallback((nodeId: string) => {
    send({ type: "remove_node", nodeId });
  }, [send]);

  const phaseInfo = PHASE_LABELS[currentPhase] || PHASE_LABELS.initialization;
  const phaseIdx = ALL_PHASES.indexOf(currentPhase);
  const approvedCount = formulas.filter(f => f.status === "approved").length;
  const latestMetric = metrics[metrics.length - 1];

  return (
    <div className="h-screen w-screen bg-[#070710] text-gray-100 overflow-hidden flex flex-col">

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 flex-shrink-0 bg-[#070710]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ boxShadow: "0 0 8px #06b6d4" }} />
          <span className="font-mono font-bold text-cyan-400 tracking-widest text-sm">AGI RESEARCH LAB</span>
        </div>

        {/* Phase tracker */}
        {activeSession && (
          <div className="flex items-center gap-1.5 ml-4">
            {ALL_PHASES.map((p, i) => {
              const cfg = PHASE_LABELS[p];
              const done = i < phaseIdx;
              const active = i === phaseIdx;
              return (
                <div key={p} className="flex items-center gap-1">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full"
                      style={{
                        background: active ? cfg.color : done ? "#374151" : "#1f2937",
                        boxShadow: active ? `0 0 6px ${cfg.color}` : "none",
                        border: `1px solid ${active ? cfg.color : done ? "#4b5563" : "#374151"}`
                      }} />
                    <span className="text-xs font-mono mt-0.5" style={{ color: active ? cfg.color : done ? "#6b7280" : "#374151", fontSize: 8 }}>
                      {cfg.label}
                    </span>
                  </div>
                  {i < ALL_PHASES.length - 1 && (
                    <div className="w-4 h-px mb-3" style={{ background: done ? "#4b5563" : "#1f2937" }} />
                  )}
                </div>
              );
            })}
            <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded"
              style={{ color: phaseInfo.color, background: `${phaseInfo.color}18`, border: `1px solid ${phaseInfo.color}44` }}>
              {phaseInfo.desc}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* Stats bar */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {activeSession && (
            <>
              <span className="text-gray-500 truncate max-w-32">{activeSession.name}</span>
              <span className="text-gray-700">|</span>
              <span className="text-gray-400">ITER <span className="text-cyan-400 font-bold">{iteration}</span></span>
              <span className="text-gray-700">|</span>
              <span className="text-gray-400">
                <span className="text-emerald-400 font-bold">{approvedCount}</span> laws
              </span>
              {latestMetric && (
                <>
                  <span className="text-gray-700">|</span>
                  <span className="text-gray-400">
                    CONV <span className="text-emerald-400">{latestMetric.convergenceSpeed.toFixed(3)}</span>
                  </span>
                </>
              )}
              <span className="text-gray-700">|</span>
            </>
          )}
          <span className={isConnected ? "text-emerald-400 font-bold" : "text-gray-600"}>
            {isConnected ? "● LIVE" : "○ OFFLINE"}
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 overflow-hidden grid" style={{ gridTemplateColumns: "230px 1fr 300px" }}>

        {/* Left: Control Panel */}
        <aside className="border-r border-gray-800 overflow-hidden bg-[#070710]">
          <ControlPanel
            sessions={sessions}
            activeSession={activeSession}
            sessionStatus={sessionStatus}
            perceptionThreshold={localThreshold}
            onCreateSession={handleCreateSession}
            onSelectSession={handleSelectSession}
            onStopSession={handleStopSession}
            onInjectStream={handleInjectStream}
            onSetThreshold={handleSetThreshold}
            onIntervene={handleIntervene}
            isLoading={isCreating}
          />
        </aside>

        {/* Center: Network + Terminal */}
        <main className="overflow-hidden flex flex-col">
          {/* Neural Network — top half */}
          <div className="border-b border-gray-800 overflow-hidden relative" style={{ height: "48%" }}>
            <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
              <span className="text-xs font-mono text-gray-600 bg-[#070710] px-1">NEURAL NETWORK VISUALIZER</span>
              {network && (
                <span className="text-xs font-mono text-gray-700">
                  {network.nodes.length}N · {network.edges.length}E · {network.totalParams}P
                </span>
              )}
            </div>
            <NeuralNetworkCanvas
              network={network}
              onAddNode={handleAddNode}
              onRemoveNode={handleRemoveNode}
            />
          </div>

          {/* Agent Terminal — bottom half */}
          <div className="overflow-hidden flex flex-col" style={{ height: "52%" }}>
            <AgentDebateTerminal
              messages={messages}
              isConnected={isConnected}
              onSendCommand={handleSendCommand}
              sessionActive={!!activeSession}
            />
          </div>
        </main>

        {/* Right: Formulas + Analytics */}
        <aside className="border-l border-gray-800 overflow-hidden flex flex-col">
          <div className="overflow-hidden border-b border-gray-800" style={{ height: "45%" }}>
            <FormulaPanel formulas={formulas} />
          </div>
          <div className="overflow-hidden" style={{ height: "55%" }}>
            <AnalyticsHub metrics={metrics} currentIteration={iteration} />
          </div>
        </aside>
      </div>
    </div>
  );
}
