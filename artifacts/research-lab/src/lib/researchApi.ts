export type ResearchSessionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface ResearchSession {
  id: string;
  name: string;
  status: ResearchSessionStatus;
  hypothesis: string;
  perceptionThreshold: number;
  createdAt: string;
  updatedAt: string;
  currentIteration: number;
  activeAgents: string[];
}

export interface SessionInput {
  name: string;
  hypothesis: string;
  perceptionThreshold?: number;
}

export type InterventionInputType = 'directive' | 'question' | 'halt';

export interface InterventionInput {
  message: string;
  type: InterventionInputType;
}

export interface InterventionResult {
  acknowledged: boolean;
  agentResponse: string;
}

export type DataStreamInputStreamType = 'normal' | 'drift' | 'ood' | 'adversarial' | 'catastrophic';

export interface DataStreamInput {
  streamType: DataStreamInputStreamType;
  intensity: number;
  label?: string;
}

export interface DataStreamResult {
  injected: boolean;
  streamId: string;
  impact: string;
}

export interface ThresholdInput {
  threshold: number;
}

export type NetworkNodeType = 'input' | 'hidden' | 'output' | 'attention' | 'memory';

export interface NetworkNode {
  id: string;
  label: string;
  type: NetworkNodeType;
  x: number;
  y: number;
  activation: number;
  connections: number;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  active: boolean;
}

export interface NetworkTopology {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  totalParams: number;
  depth: number;
}

export type NetworkMutationInputAction = 'add_node' | 'remove_node' | 'add_edge' | 'remove_edge' | 'modify_weight';

export interface NetworkMutationInput {
  action: NetworkMutationInputAction;
  nodeId?: string | null;
  nodeType?: string | null;
  sourceId?: string | null;
  targetId?: string | null;
  weight?: number | null;
}

export interface MetricPoint {
  iteration: number;
  convergenceSpeed: number;
  generalizationIndex: number;
  synapticStability: number;
  loss: number;
  timestamp: string;
}

export interface MetricsHistory {
  sessionId: string;
  metrics: MetricPoint[];
}

export type FormulaStatus = 'proposed' | 'testing' | 'approved' | 'rejected';

export interface Formula {
  id: string;
  latex: string;
  description: string;
  proposedBy: string;
  status: FormulaStatus;
  testScore?: number | null;
  createdAt: string;
}

export interface AgentMessage {
  type: string;
  agent: string;
  agentRole: string;
  color: string;
  messageType: string;
  content: string;
  formula?: string;
  timestamp: string;
}

const BASE_URL = '/research';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  return response.json();
}

export interface UserCommand {
  command: string;
  type: 'directive' | 'question' | 'analysis' | 'request';
}

export interface SharedMemoryContext {
  hypothesis: string;
  objective: string;
  phase: string;
  iteration: number;
  approvedCount: number;
  rejectedCount: number;
  bestScore: number;
  keyFindings: string[];
  openQuestions: string[];
  userDirectives: string[];
  streamContext: string;
  convergenceTrend: number[];
}

export const researchApi = {
  listSessions: () => fetchApi<ResearchSession[]>('/sessions'),
  createSession: (data: SessionInput) => fetchApi<ResearchSession>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  getSession: (id: string) => fetchApi<ResearchSession>(`/sessions/${id}`),
  deleteSession: (id: string) => fetchApi<void>(`/sessions/${id}`, { method: 'DELETE' }),
  stopSession: (id: string) => fetchApi<ResearchSession>(`/sessions/${id}/stop`, { method: 'POST' }),
  humanIntervene: (id: string, data: InterventionInput) => fetchApi<InterventionResult>(`/sessions/${id}/intervene`, { method: 'POST', body: JSON.stringify(data) }),
  sendCommand: (id: string, data: UserCommand) => fetchApi<{ queued: boolean; command: string }>(`/sessions/${id}/command`, { method: 'POST', body: JSON.stringify(data) }),
  injectDataStream: (id: string, data: DataStreamInput) => fetchApi<DataStreamResult>(`/sessions/${id}/inject-stream`, { method: 'POST', body: JSON.stringify(data) }),
  setThreshold: (id: string, data: ThresholdInput) => fetchApi<ResearchSession>(`/sessions/${id}/threshold`, { method: 'POST', body: JSON.stringify(data) }),
  getNetwork: (id: string) => fetchApi<NetworkTopology>(`/sessions/${id}/network`),
  mutateNetwork: (id: string, data: NetworkMutationInput) => fetchApi<NetworkTopology>(`/sessions/${id}/network`, { method: 'POST', body: JSON.stringify(data) }),
  getMetrics: (id: string) => fetchApi<MetricsHistory>(`/sessions/${id}/metrics`),
  getFormulas: (id: string) => fetchApi<Formula[]>(`/sessions/${id}/formulas`),
  getMemory: (id: string) => fetchApi<SharedMemoryContext>(`/sessions/${id}/memory`),
};
