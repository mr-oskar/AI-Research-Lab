import { useCallback, useEffect, useState } from "react";
import { researchApi, type ResearchSession } from "@/lib/researchApi";
import { useResearchWebSocket } from "@/hooks/useResearchWebSocket";
import NeuralNetworkCanvas from "@/components/NeuralNetworkCanvas";
import AgentDebateTerminal from "@/components/AgentDebateTerminal";
import FormulaPanel from "@/components/FormulaPanel";
import AnalyticsHub from "@/components/AnalyticsHub";
import ControlPanel from "@/components/ControlPanel";

export default function LabPage() {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [localThreshold, setLocalThreshold] = useState(0.85);
  const [thresholdTimeout, setThresholdTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const {
    messages, metrics, network, formulas, isConnected, sessionStatus, iteration, send
  } = useResearchWebSocket(activeSessionId);

  const loadSessions = useCallback(async () => {
    try {
      const data = await researchApi.listSessions();
      setSessions(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  const handleCreateSession = useCallback(async (name: string, hypothesis: string) => {
    setIsCreating(true);
    try {
      const session = await researchApi.createSession({ name, hypothesis, perceptionThreshold: localThreshold });
      setSessions((prev) => [...prev, session]);
      setActiveSessionId(session.id);
      setActiveSession(session);
      setLocalThreshold(session.perceptionThreshold);
    } catch (e) {
      console.error("Failed to create session", e);
    } finally {
      setIsCreating(false);
    }
  }, [localThreshold]);

  const handleSelectSession = useCallback(async (id: string) => {
    setActiveSessionId(id);
    try {
      const session = await researchApi.getSession(id);
      setActiveSession(session);
      setLocalThreshold(session.perceptionThreshold);
    } catch {
      // silent
    }
  }, []);

  const handleStopSession = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      const session = await researchApi.stopSession(activeSessionId);
      setActiveSession(session);
      setSessions((prev) => prev.map((s) => s.id === session.id ? session : s));
    } catch (e) {
      console.error("Failed to stop session", e);
    }
  }, [activeSessionId]);

  const handleInjectStream = useCallback(async (type: string, intensity: number) => {
    if (!activeSessionId) return;
    try {
      await researchApi.injectDataStream(activeSessionId, { streamType: type as ResearchSession["status"] extends string ? never : string as unknown as "normal", intensity, label: `${type} injection` });
    } catch (e) {
      console.error("Failed to inject stream", e);
    }
  }, [activeSessionId]);

  const handleSetThreshold = useCallback((value: number) => {
    setLocalThreshold(value);
    if (thresholdTimeout) clearTimeout(thresholdTimeout);
    const t = setTimeout(async () => {
      if (!activeSessionId) return;
      try {
        await researchApi.setThreshold(activeSessionId, { threshold: value });
      } catch {
        // silent
      }
    }, 500);
    setThresholdTimeout(t);
  }, [activeSessionId, thresholdTimeout]);

  const handleIntervene = useCallback(async (message: string, type: string) => {
    if (!activeSessionId) return;
    try {
      await researchApi.humanIntervene(activeSessionId, {
        message,
        type: type as "directive" | "question" | "halt",
      });
    } catch (e) {
      console.error("Failed to send intervention", e);
    }
  }, [activeSessionId]);

  const handleAddNode = useCallback((nodeType: string) => {
    if (!activeSessionId) return;
    send({ type: "add_node", nodeType });
  }, [activeSessionId, send]);

  const handleRemoveNode = useCallback((nodeId: string) => {
    if (!activeSessionId) return;
    send({ type: "remove_node", nodeId });
  }, [activeSessionId, send]);

  return (
    <div className="h-screen w-screen bg-gray-950 text-gray-100 overflow-hidden flex flex-col">
      <header className="flex items-center gap-4 px-4 py-2 border-b border-gray-800 flex-shrink-0 bg-gray-950">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 8px #06b6d4" }} />
          <span className="font-mono font-bold text-cyan-400 tracking-widest text-sm">AGI RESEARCH LAB</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-xs font-mono">
          {activeSession && (
            <>
              <span className="text-gray-500">{activeSession.name}</span>
              <span className="text-gray-700">|</span>
              <span className="text-gray-400">ITER <span className="text-cyan-400">{iteration}</span></span>
              <span className="text-gray-700">|</span>
              <span className="text-gray-400">
                AGENTS: <span className="text-emerald-400">{activeSession.activeAgents?.length || 3}</span>
              </span>
            </>
          )}
          <span className="text-gray-700">|</span>
          <span className={isConnected ? "text-emerald-400" : "text-gray-600"}>
            {isConnected ? "WS CONNECTED" : "WS OFFLINE"}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-hidden grid" style={{ gridTemplateColumns: "240px 1fr 320px", gridTemplateRows: "1fr" }}>
        <aside className="border-r border-gray-800 overflow-hidden flex flex-col bg-gray-950">
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

        <main className="overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="h-full grid" style={{ gridTemplateRows: "1fr 1fr" }}>
              <div className="border-b border-gray-800 overflow-hidden relative bg-gray-950">
                <div className="absolute top-2 left-2 z-10">
                  <span className="text-xs font-mono text-gray-500 bg-gray-950 px-1">NEURAL NETWORK VISUALIZER</span>
                </div>
                <NeuralNetworkCanvas
                  network={network}
                  onAddNode={handleAddNode}
                  onRemoveNode={handleRemoveNode}
                />
              </div>
              <div className="overflow-hidden bg-gray-950">
                <AgentDebateTerminal messages={messages} isConnected={isConnected} />
              </div>
            </div>
          </div>
        </main>

        <aside className="border-l border-gray-800 overflow-hidden flex flex-col">
          <div style={{ height: "45%" }} className="border-b border-gray-800 overflow-hidden bg-gray-950">
            <FormulaPanel formulas={formulas} />
          </div>
          <div style={{ height: "55%" }} className="overflow-hidden bg-gray-950">
            <AnalyticsHub metrics={metrics} currentIteration={iteration} />
          </div>
        </aside>
      </div>
    </div>
  );
}
