import { useCallback, useEffect, useRef, useState } from "react";
import { researchApi, type ResearchSession } from "@/lib/researchApi";
import { useResearchWebSocket } from "@/hooks/useResearchWebSocket";
import NeuralNetworkCanvas from "@/components/NeuralNetworkCanvas";
import AgentDebateTerminal from "@/components/AgentDebateTerminal";
import FormulaPanel from "@/components/FormulaPanel";
import AnalyticsHub from "@/components/AnalyticsHub";
import ControlPanel from "@/components/ControlPanel";

const PHASES = [
  { key: "exploration",        label: "EXPLORE", color: "#00a2ff", desc: "استكشاف" },
  { key: "hypothesis_testing", label: "TEST",    color: "#ffb700", desc: "اختبار" },
  { key: "refinement",         label: "REFINE",  color: "#ff2a85", desc: "تصفية" },
  { key: "synthesis",          label: "SYNTH",   color: "#bd00ff", desc: "توليف" },
  { key: "validation",         label: "VALID",   color: "#00ffaa", desc: "تحقق" },
];

export default function LabPage() {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [localThreshold, setLocalThreshold] = useState(0.85);
  const thresholdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentPhase, setCurrentPhase] = useState("exploration");
  const [uptime, setUptime] = useState(0);
  const uptimeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  const {
    messages, metrics, network, formulas, isConnected, sessionStatus, iteration, send,
  } = useResearchWebSocket(activeSessionId);

  // uptime counter
  useEffect(() => {
    if (sessionStatus === "running" && !uptimeRef.current) {
      sessionStartRef.current = Date.now();
      uptimeRef.current = setInterval(() => {
        setUptime(Math.floor((Date.now() - (sessionStartRef.current ?? Date.now())) / 1000));
      }, 1000);
    } else if (sessionStatus !== "running" && uptimeRef.current) {
      clearInterval(uptimeRef.current); uptimeRef.current = null;
    }
    return () => { if (uptimeRef.current) { clearInterval(uptimeRef.current); uptimeRef.current = null; } };
  }, [sessionStatus]);

  // load sessions
  const loadSessions = useCallback(async () => {
    try { setSessions(await researchApi.listSessions()); } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadSessions();
    const t = setInterval(loadSessions, 12000);
    return () => clearInterval(t);
  }, [loadSessions]);

  // infer phase from orchestrator task_assignment messages
  useEffect(() => {
    const last = messages.filter(m => m.messageType === "task_assignment").slice(-1)[0];
    if (!last) return;
    const map: Record<string, string> = {
      "الاستكشاف": "exploration", "استكشاف": "exploration",
      "اختبار": "hypothesis_testing", "التصفية": "refinement", "تصفية": "refinement",
      "التوليف": "synthesis", "توليف": "synthesis", "التحقق": "validation",
    };
    for (const [ar, en] of Object.entries(map)) {
      if (last.content?.includes(ar)) { setCurrentPhase(en); break; }
    }
  }, [messages]);

  const handleCreateSession = useCallback(async (name: string, hypothesis: string) => {
    setIsCreating(true);
    try {
      const s = await researchApi.createSession({ name, hypothesis, perceptionThreshold: localThreshold });
      setSessions(prev => [...prev, s]);
      setActiveSessionId(s.id);
      setActiveSession(s);
      setLocalThreshold(s.perceptionThreshold);
      setCurrentPhase("exploration");
      setUptime(0);
      sessionStartRef.current = Date.now();
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
    try { await researchApi.injectDataStream(activeSessionId, { streamType: type as "normal", intensity, label: `${type} injection` }); }
    catch (e) { console.error(e); }
  }, [activeSessionId]);

  const handleSetThreshold = useCallback((value: number) => {
    setLocalThreshold(value);
    if (thresholdTimer.current) clearTimeout(thresholdTimer.current);
    thresholdTimer.current = setTimeout(async () => {
      if (!activeSessionId) return;
      try { await researchApi.setThreshold(activeSessionId, { threshold: value }); }
      catch { /* silent */ }
    }, 600);
  }, [activeSessionId]);

  const handleIntervene = useCallback(async (message: string, type: string) => {
    if (!activeSessionId) return;
    try { await researchApi.humanIntervene(activeSessionId, { message, type: type as "directive" }); }
    catch (e) { console.error(e); }
  }, [activeSessionId]);

  const handleSendCommand = useCallback(async (command: string, type: string) => {
    if (!activeSessionId) return;
    try {
      await researchApi.sendCommand(activeSessionId, { command, type: type as "directive" });
    } catch {
      send({ type: "user_command", command, commandType: type });
    }
  }, [activeSessionId, send]);

  const handleAddNode = useCallback((nodeType: string) => { send({ type: "add_node", nodeType }); }, [send]);
  const handleRemoveNode = useCallback((nodeId: string) => { send({ type: "remove_node", nodeId }); }, [send]);

  // derived
  const phaseIdx = PHASES.findIndex(p => p.key === currentPhase);
  const phaseInfo = PHASES[phaseIdx] ?? PHASES[0];
  const approvedCount = formulas.filter(f => f.status === "approved").length;
  const latestMetric = metrics[metrics.length - 1];
  const avgFitness = latestMetric ? latestMetric.convergenceSpeed * 100 : 0;
  const fmtUptime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${ss.toString().padStart(2,"0")}`;
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ background: "#030306", color: "#e4e4e7", fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>

      {/* ── HEADER ────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center gap-4 px-4 py-2.5 border-b"
        style={{ background: "rgba(6,6,10,0.97)", borderColor: "#14141f", boxShadow: "0 4px 24px rgba(0,0,0,0.8)" }}>

        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#00ffaa", boxShadow: "0 0 10px #00ffaa, 0 0 20px #00ffaa55" }} />
            <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: "#00ffaa" }} />
          </div>
          <div>
            <div className="font-bold tracking-widest text-xs" style={{ color: "#00ffaa", letterSpacing: "0.18em" }}>AGI RESEARCH LAB</div>
            <div className="text-xs" style={{ color: "#444", fontSize: 9, letterSpacing: "0.1em" }}>AUTONOMOUS COGNITIVE MATRIX v2.0</div>
          </div>
        </div>

        {/* Phase progress bar */}
        {activeSession && (
          <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
            {PHASES.map((p, i) => {
              const done = i < phaseIdx, active = i === phaseIdx;
              return (
                <div key={p.key} className="flex items-center gap-1">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-2 h-2 rounded-full transition-all duration-500"
                      style={{
                        background: active ? p.color : done ? "#374151" : "#14141f",
                        boxShadow: active ? `0 0 8px ${p.color}, 0 0 16px ${p.color}55` : "none",
                        border: `1px solid ${active ? p.color : done ? "#374151" : "#1f1f2e"}`,
                      }} />
                    <span style={{ fontSize: 7, color: active ? p.color : done ? "#555" : "#2a2a3a", fontFamily: "monospace", letterSpacing: "0.05em" }}>
                      {p.label}
                    </span>
                  </div>
                  {i < PHASES.length - 1 && (
                    <div className="w-5 h-px mb-3.5 transition-all duration-700" style={{ background: done ? "#374151" : "#1a1a24" }} />
                  )}
                </div>
              );
            })}
            <div className="ml-2 px-2 py-0.5 rounded text-xs font-mono"
              style={{ color: phaseInfo.color, background: `${phaseInfo.color}12`, border: `1px solid ${phaseInfo.color}40` }}>
              {phaseInfo.desc}
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Status readouts */}
        <div className="flex items-center gap-3" style={{ fontFamily: "monospace", fontSize: 11 }}>
          {activeSession && (
            <>
              <span style={{ color: "#444" }}>GENERATION: <span style={{ color: "#ffb700", fontWeight: "bold" }}>{String(Math.floor(iteration / 10) + 1).padStart(3, "0")}</span></span>
              <span style={{ color: "#333" }}>|</span>
              <span style={{ color: "#444" }}>ITER: <span style={{ color: "#00a2ff", fontWeight: "bold" }}>{String(iteration).padStart(3, "0")}</span></span>
              <span style={{ color: "#333" }}>|</span>
              <span style={{ color: "#444" }}>LAWS: <span style={{ color: "#00ffaa", fontWeight: "bold" }}>{approvedCount}</span></span>
              <span style={{ color: "#333" }}>|</span>
              <span style={{ color: "#444" }}>FITNESS: <span style={{ color: "#00ffaa" }}>{avgFitness.toFixed(1)}%</span></span>
              <span style={{ color: "#333" }}>|</span>
              <span style={{ color: "#444" }}>UPTIME: <span style={{ color: "#00ffaa" }}>{fmtUptime(uptime)}</span></span>
              <span style={{ color: "#333" }}>|</span>
            </>
          )}
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "animate-pulse" : ""}`}
              style={{ background: isConnected ? "#bd00ff" : "#374151", boxShadow: isConnected ? "0 0 8px #bd00ff" : "none" }} />
            <span style={{ color: isConnected ? "#bd00ff" : "#555", fontWeight: "bold" }}>
              {isConnected ? "REAL TEST ACTIVE" : "TRAINING PHASE"}
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN GRID ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: "240px 1fr 320px" }}>

        {/* LEFT PANEL */}
        <aside className="flex flex-col overflow-hidden border-r" style={{ borderColor: "#14141f", background: "rgba(6,6,10,0.96)" }}>
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

        {/* CENTER */}
        <main className="flex flex-col overflow-hidden">

          {/* Neural network — 55% of center height */}
          <div className="relative overflow-hidden border-b" style={{ flex: "0 0 55%", borderColor: "#14141f" }}>
            {/* Section label */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-2 pointer-events-none">
              <span className="px-2 py-0.5 rounded text-xs font-mono"
                style={{ background: "rgba(3,3,6,0.88)", color: "#555", border: "1px solid #14141f", letterSpacing: "0.12em" }}>
                NEURAL NETWORK VISUALIZER
              </span>
              {network && (
                <span className="text-xs font-mono" style={{ color: "#2a2a3a" }}>
                  {network.nodes.length}N · {network.edges.length}E · {network.totalParams ?? 0}P
                </span>
              )}
            </div>

            <NeuralNetworkCanvas
              network={network}
              onAddNode={handleAddNode}
              onRemoveNode={handleRemoveNode}
            />
          </div>

          {/* Agent terminal — 45% of center height */}
          <div className="overflow-hidden flex flex-col" style={{ flex: "0 0 45%", background: "rgba(6,6,10,0.96)" }}>
            <AgentDebateTerminal
              messages={messages}
              isConnected={isConnected}
              onSendCommand={handleSendCommand}
              sessionActive={!!activeSession}
            />
          </div>
        </main>

        {/* RIGHT PANEL */}
        <aside className="flex flex-col overflow-hidden border-l" style={{ borderColor: "#14141f", background: "rgba(6,6,10,0.96)" }}>
          <div className="overflow-hidden border-b" style={{ flex: "0 0 44%", borderColor: "#14141f" }}>
            <FormulaPanel formulas={formulas} />
          </div>
          <div className="overflow-hidden" style={{ flex: "0 0 56%" }}>
            <AnalyticsHub metrics={metrics} currentIteration={iteration} />
          </div>
        </aside>
      </div>
    </div>
  );
}
