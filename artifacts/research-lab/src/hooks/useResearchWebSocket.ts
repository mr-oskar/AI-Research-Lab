import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentMessage, Formula, MetricPoint, NetworkTopology } from "@/lib/researchApi";

interface WSState {
  messages: AgentMessage[];
  metrics: MetricPoint[];
  network: NetworkTopology | null;
  formulas: Formula[];
  isConnected: boolean;
  sessionStatus: string;
  iteration: number;
}

export function useResearchWebSocket(sessionId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<WSState>({
    messages: [],
    metrics: [],
    network: null,
    formulas: [],
    isConnected: false,
    sessionStatus: "idle",
    iteration: 0,
  });

  const connect = useCallback(() => {
    if (!sessionId || wsRef.current?.readyState === WebSocket.OPEN) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/${sessionId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((s) => ({ ...s, isConnected: true }));
    };

    ws.onclose = () => {
      setState((s) => ({ ...s, isConnected: false }));
    };

    ws.onerror = () => {
      setState((s) => ({ ...s, isConnected: false }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch {
        // ignore
      }
    };
  }, [sessionId]);

  const handleMessage = (msg: Record<string, unknown>) => {
    const type = msg.type as string;

    if (type === "connected") {
      const state_ = msg.state as Record<string, unknown> | undefined;
      setState((s) => ({
        ...s,
        network: (msg.network as NetworkTopology) || s.network,
        metrics: (msg.metrics as MetricPoint[]) || s.metrics,
        formulas: (msg.formulas as Formula[]) || s.formulas,
        sessionStatus: (state_?.status as string) || s.sessionStatus,
        iteration: (state_?.currentIteration as number) || s.iteration,
      }));
    } else if (type === "agent_message") {
      const agentMsg = msg as unknown as AgentMessage;
      setState((s) => ({
        ...s,
        messages: [...s.messages.slice(-199), agentMsg],
      }));
      if (agentMsg.formula) {
        const f = agentMsg.formula as unknown as Formula;
        setState((s) => ({
          ...s,
          formulas: [...s.formulas.filter((x) => x.id !== f.id), f],
        }));
      }
    } else if (type === "metrics_update") {
      const metrics = msg.metrics as MetricPoint;
      const network = msg.network as NetworkTopology;
      const formulas = msg.formulas as Formula[];
      setState((s) => ({
        ...s,
        metrics: [...s.metrics.slice(-199), metrics],
        network: network || s.network,
        formulas: formulas || s.formulas,
        iteration: metrics?.iteration || s.iteration,
        sessionStatus: "running",
      }));
    } else if (type === "network_mutated") {
      const network = msg.network as NetworkTopology;
      setState((s) => ({ ...s, network: network || s.network }));
    } else if (type === "session_started") {
      setState((s) => ({ ...s, sessionStatus: "running" }));
    } else if (type === "session_stopped") {
      setState((s) => ({ ...s, sessionStatus: "paused", isConnected: false }));
    } else if (type === "human_intervention") {
      const intervention = msg.intervention as Record<string, string>;
      const agentMsg: AgentMessage = {
        type: "agent_message",
        agent: "Human",
        agentRole: "human",
        color: "#10b981",
        messageType: "human_intervention",
        content: `[${intervention.type?.toUpperCase()}] ${intervention.message}\n\nResponse: ${intervention.response}`,
        timestamp: msg.timestamp as string,
      };
      setState((s) => ({ ...s, messages: [...s.messages.slice(-199), agentMsg] }));
    } else if (type === "data_stream_injected") {
      const stream = msg.stream as Record<string, string>;
      const agentMsg: AgentMessage = {
        type: "agent_message",
        agent: "System",
        agentRole: "system",
        color: "#06b6d4",
        messageType: "stream_injection",
        content: `Data stream injected: ${stream.streamType?.toUpperCase()} (impact: ${stream.impact})`,
        timestamp: msg.timestamp as string,
      };
      setState((s) => ({ ...s, messages: [...s.messages.slice(-199), agentMsg] }));
    } else if (type === "threshold_updated") {
      const agentMsg: AgentMessage = {
        type: "agent_message",
        agent: "System",
        agentRole: "system",
        color: "#06b6d4",
        messageType: "threshold_update",
        content: `Perception threshold updated to ${(msg.threshold as number).toFixed(3)}`,
        timestamp: msg.timestamp as string,
      };
      setState((s) => ({ ...s, messages: [...s.messages.slice(-199), agentMsg] }));
    }
  };

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      setState({
        messages: [],
        metrics: [],
        network: null,
        formulas: [],
        isConnected: false,
        sessionStatus: "idle",
        iteration: 0,
      });
      connect();
    }
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sessionId]);

  return { ...state, send };
}
