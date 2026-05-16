import type { Formula } from "@/lib/researchApi";

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  proposed: { color: "#f59e0b", bg: "#f59e0b18", label: "PROPOSED" },
  testing: { color: "#60a5fa", bg: "#60a5fa18", label: "TESTING" },
  approved: { color: "#10b981", bg: "#10b98118", label: "APPROVED" },
  rejected: { color: "#ef4444", bg: "#ef444418", label: "REJECTED" },
};

const AGENT_COLORS: Record<string, string> = {
  "Δ-Mathematician": "#60a5fa",
  "Σ-Physicist": "#f59e0b",
  "Ω-Director": "#a78bfa",
};

interface Props {
  formulas: Formula[];
}

export default function FormulaPanel({ formulas }: Props) {
  const approved = formulas.filter((f) => f.status === "approved");
  const other = formulas.filter((f) => f.status !== "approved");
  const sorted = [...approved, ...other];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-mono text-gray-400">MATHEMATICAL FORMULAS</span>
        <div className="flex-1" />
        <span className="text-xs font-mono text-gray-600">
          {approved.length}/{formulas.length} approved
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3" data-testid="formula-panel">
        {sorted.length === 0 && (
          <div className="text-gray-600 text-xs text-center py-8 font-mono">
            No formulas proposed yet...
          </div>
        )}
        {sorted.map((formula) => {
          const status = STATUS_STYLES[formula.status] || STATUS_STYLES.proposed;
          const agentColor = AGENT_COLORS[formula.proposedBy] || "#6b7280";
          return (
            <div
              key={formula.id}
              className="rounded border bg-gray-900 p-3 space-y-2"
              style={{ borderColor: `${status.color}44` }}
              data-testid={`formula-${formula.id}`}
            >
              <div className="flex items-start gap-2 flex-wrap">
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-mono font-bold"
                  style={{ color: status.color, background: status.bg, border: `1px solid ${status.color}44` }}
                >
                  {status.label}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-mono"
                  style={{ color: agentColor, background: `${agentColor}18`, border: `1px solid ${agentColor}44` }}
                >
                  {formula.proposedBy}
                </span>
                {formula.testScore !== null && formula.testScore !== undefined && (
                  <span className="text-xs font-mono ml-auto" style={{ color: status.color }}>
                    score: {formula.testScore.toFixed(4)}
                  </span>
                )}
              </div>

              <pre
                className="text-xs rounded p-2 overflow-x-auto font-mono leading-relaxed"
                style={{
                  background: "#0d1117",
                  border: "1px solid #21262d",
                  color: "#e6edf3",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {formula.latex}
              </pre>

              <p className="text-xs text-gray-400 leading-relaxed" dir="auto">
                {formula.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
