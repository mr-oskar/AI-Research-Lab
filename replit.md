# AGI Research Lab

A real-time multi-agent AGI research platform where three AI scientists (Mathematician, Physicist, Lab Director) collaboratively propose, test, and debate mathematical laws for self-learning algorithms, with live neural network visualization.

## Run & Operate

- `pnpm --filter @workspace/research-lab run dev` — run the React frontend (port 18304)
- `bash artifacts/research-api/start.sh` — run the Python FastAPI backend (port 8000)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS (dark theme)
- Python Backend: FastAPI + WebSockets (uvicorn)
- Charts: Recharts
- Neural Network: Canvas API with requestAnimationFrame

## Where things live

- `artifacts/research-lab/src/` — React frontend
  - `pages/LabPage.tsx` — main page with full lab layout
  - `components/NeuralNetworkCanvas.tsx` — canvas-based neural network visualizer
  - `components/AgentDebateTerminal.tsx` — live agent message feed
  - `components/FormulaPanel.tsx` — mathematical formula cards
  - `components/AnalyticsHub.tsx` — Recharts metrics dashboard
  - `components/ControlPanel.tsx` — session control and human intervention
  - `hooks/useResearchWebSocket.ts` — WebSocket state management
  - `lib/researchApi.ts` — Python API client (hits /research/*)
- `artifacts/research-api/` — Python FastAPI backend
  - `main.py` — API routes and WebSocket handler
  - `core/research_session.py` — session orchestrator + agent loop
  - `core/neural_network.py` — mutable network graph model
  - `core/session_manager.py` — in-memory session registry
  - `core/websocket_manager.py` — WebSocket connection manager
  - `agents/mathematician.py` — Δ-Mathematician agent
  - `agents/physicist.py` — Σ-Physicist agent
  - `agents/lab_director.py` — Ω-Director agent
  - `tools/evaluator.py` — formula evaluator
- `lib/api-spec/` — OpenAPI spec (for Express /api, separate from Python /research)

## Architecture decisions

- Two separate backends: Express at `/api` (Node.js) and FastAPI at `/research` + `/ws` (Python). Both routed via the Replit reverse proxy using path-based routing in `artifact.toml`.
- The Python backend uses in-memory storage only — sessions are lost on restart. This is intentional for a research prototype.
- WebSocket connects at `/ws/{sessionId}` — the proxy routes `/ws` to the Python backend on port 8000.
- Agent loop starts automatically when a WebSocket client connects to a new idle session.
- Neural network evolves autonomously each iteration based on performance metrics.
- Frontend uses direct fetch calls to `/research/*` instead of generated hooks (which target the Express `/api`).

## Product

- Create named research sessions with a scientific hypothesis
- Watch 3 AI agents propose formulas, test them, critique each other, and converge on approved mathematical laws
- Live neural network visualization with pulsing activation animations
- Real-time analytics (convergence speed, generalization index, synaptic stability, loss)
- Human intervention: send directives, questions, or halt commands to agents
- Data stream injection: test network robustness with normal/drift/OOD/adversarial/catastrophic streams
- Perception threshold slider controls how aggressively the network adapts

## User preferences

- Dark mode only — no toggle
- Cinematic, mission-control aesthetic — dense information layout
- Monospace fonts for metrics, formulas, node labels
- No emojis in UI

## Gotchas

- Python binary: `/home/runner/workspace/.pythonlibs/bin/python3` — `python3` is NOT in PATH, must use full path in start.sh
- WebSocket path `/ws` is proxied to the Python backend — do NOT add this to the React Vite proxy config
- The `POST /research/sessions/{id}/network` endpoint handles all mutations (add_node, remove_node, etc.) via the `action` field in the request body
- Session state lives in memory — restarting the Python API loses all sessions
- Agent loop auto-starts on first WebSocket connect to an idle session

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
