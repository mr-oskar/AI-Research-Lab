import type { Formula } from "@/lib/researchApi";

const STATUS: Record<string, { color: string; label: string }> = {
  proposed: { color: "#ffb700", label: "PROPOSED" },
  testing:  { color: "#00a2ff", label: "TESTING"  },
  approved: { color: "#00ffaa", label: "APPROVED" },
  rejected: { color: "#ff2a85", label: "REJECTED" },
};

const AGENT_COLOR: Record<string, string> = {
  "Δ-Mathematician": "#00a2ff",
  "Σ-Physicist":     "#ffb700",
  "Ω-Director":      "#bd00ff",
  "Χ-Orchestrator":  "#00ffaa",
};

interface Props { formulas: Formula[]; }

export default function FormulaPanel({ formulas }: Props) {
  const approved = formulas.filter(f => f.status === "approved");
  const other    = formulas.filter(f => f.status !== "approved");
  const sorted   = [...approved, ...other];

  return (
    <div className="flex flex-col h-full" style={{ background: "rgba(6,6,10,0.97)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0 border-b" style={{ borderColor: "#14141f" }}>
        <span style={{ fontSize: 10, color: "#444", fontFamily: "monospace", letterSpacing: "0.12em" }}>
          المعادلات الرياضية / MATHEMATICAL FORMULAS
        </span>
        <div className="flex-1" />
        <span style={{ fontSize: 10, color: "#00ffaa", fontFamily: "monospace" }}>
          {approved.length}/{formulas.length} approved
        </span>
      </div>

      {/* Formula list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sorted.length === 0 && (
          <div style={{ color: "#333", fontFamily: "monospace", fontSize: 11, textAlign: "center", paddingTop: 32 }}>
            No formulas proposed yet...
          </div>
        )}

        {sorted.map(f => {
          const s = STATUS[f.status] || STATUS.proposed;
          const ac = AGENT_COLOR[f.proposedBy] || "#555";
          const isApproved = f.status === "approved";

          return (
            <div key={f.id}
              style={{
                background: isApproved ? "rgba(0,255,170,0.04)" : "#020204",
                border: `1px solid ${s.color}33`,
                borderLeft: `3px solid ${s.color}`,
                borderRadius: 3, padding: "10px 10px 8px",
                boxShadow: isApproved ? `0 0 12px ${s.color}18` : "none",
              }}>

              {/* Badge row */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <span style={{
                  fontSize: 9, fontFamily: "monospace", fontWeight: "bold",
                  color: s.color, background: `${s.color}18`,
                  border: `1px solid ${s.color}44`, borderRadius: 2, padding: "1px 5px",
                }}>
                  {s.label}
                </span>
                <span style={{
                  fontSize: 9, fontFamily: "monospace",
                  color: ac, background: `${ac}18`,
                  border: `1px solid ${ac}44`, borderRadius: 2, padding: "1px 5px",
                }}>
                  {f.proposedBy}
                </span>
                {f.testScore != null && (
                  <span style={{ fontSize: 9, fontFamily: "monospace", color: s.color, marginLeft: "auto" }}>
                    {f.testScore.toFixed(4)}
                  </span>
                )}
              </div>

              {/* Formula */}
              <pre style={{
                background: "#000", border: "1px solid #14141f",
                borderRadius: 2, padding: "6px 8px", fontSize: 10,
                fontFamily: "monospace", color: "#e4e4e7",
                whiteSpace: "pre-wrap", wordBreak: "break-all",
                overflowX: "auto", margin: "0 0 6px",
                boxShadow: isApproved ? `inset 0 0 8px ${s.color}10` : "none",
              }}>
                {f.latex}
              </pre>

              {/* Description */}
              {f.description && (
                <p style={{ fontSize: 9, color: "#555", lineHeight: 1.5 }} dir="auto">
                  {f.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
