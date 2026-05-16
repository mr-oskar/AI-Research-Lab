import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { MetricPoint } from "@/lib/researchApi";

interface Props { metrics: MetricPoint[]; currentIteration: number; }

const CHARTS = [
  { key: "convergenceSpeed",    label: "جودة التعلم / Learning Quality",    color: "#ffb700" },
  { key: "generalizationIndex", label: "دقة التعميم / Generalization",       color: "#00a2ff" },
  { key: "synapticStability",   label: "الاستقرار / Synaptic Stability",     color: "#bd00ff" },
];

const TT = ({ active, payload, label }: Record<string, unknown>) => {
  if (!active || !Array.isArray(payload) || !payload.length) return null;
  const p = payload[0] as Record<string, unknown>;
  return (
    <div style={{ background: "#020204", border: "1px solid #1f1f2e", borderRadius: 3, padding: "4px 8px", fontFamily: "monospace", fontSize: 10 }}>
      <div style={{ color: "#444" }}>iter {String(label)}</div>
      <div style={{ color: String(p.color), fontWeight: "bold" }}>{(p.value as number).toFixed(4)}</div>
    </div>
  );
};

export default function AnalyticsHub({ metrics, currentIteration }: Props) {
  const recent = metrics.slice(-50);
  const latest = metrics[metrics.length - 1];

  const loss  = latest?.loss ?? 0;
  const conv  = latest?.convergenceSpeed ?? 0;
  const gen   = latest?.generalizationIndex ?? 0;
  const stab  = latest?.synapticStability ?? 0;

  const readouts = [
    { label: "LOSS",  value: loss.toFixed(5),  color: "#ff2a85" },
    { label: "CONV",  value: conv.toFixed(3),   color: "#00ffaa" },
    { label: "GEN",   value: gen.toFixed(3),    color: "#00a2ff" },
    { label: "STAB",  value: stab.toFixed(3),   color: "#bd00ff" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "rgba(6,6,10,0.97)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0 border-b" style={{ borderColor: "#14141f" }}>
        <span style={{ fontSize: 10, color: "#444", fontFamily: "monospace", letterSpacing: "0.12em" }}>
          مؤشرات التعلم / ANALYTICS HUB
        </span>
        <div className="flex-1" />
        <span style={{ fontSize: 10, color: "#00a2ff", fontFamily: "monospace", fontWeight: "bold" }}>
          ITER {String(currentIteration).padStart(3, "0")}
        </span>
      </div>

      {/* Key metrics readout bar */}
      <div className="flex-shrink-0 grid grid-cols-4" style={{ borderBottom: "1px solid #14141f" }}>
        {readouts.map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center py-2"
            style={{ background: "#020204", borderRight: "1px solid #14141f" }}>
            <span style={{ fontSize: 9, color: "#444", fontFamily: "monospace" }}>{label}</span>
            <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: "bold", color, marginTop: 1,
              textShadow: `0 0 8px ${color}88` }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {CHARTS.map(({ key, label, color }) => (
          <div key={key}
            style={{ background: "#020204", border: "1px solid #14141f", borderRadius: 3, padding: "8px 6px 4px" }}>
            {/* Chart header */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: color, boxShadow: `0 0 5px ${color}`, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: "#666", fontFamily: "monospace", flex: 1 }}>{label}</span>
              <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: "bold", color,
                textShadow: `0 0 6px ${color}66` }}>
                {((latest?.[key as keyof MetricPoint] as number) ?? 0).toFixed(4)}
              </span>
            </div>
            <div style={{ height: 68 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recent} margin={{ top: 2, right: 2, left: -34, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#0e0e16" />
                  <XAxis dataKey="iteration" hide />
                  <YAxis domain={[0, 1]} tick={{ fill: "#2a2a3a", fontSize: 8, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TT />} />
                  <Line type="monotone" dataKey={key} stroke={color} strokeWidth={1.8}
                    dot={false} isAnimationActive={false}
                    style={{ filter: `drop-shadow(0 0 3px ${color}88)` }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}

        {/* Loss chart */}
        <div style={{ background: "#020204", border: "1px solid #14141f", borderRadius: 3, padding: "8px 6px 4px" }}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#ff2a85", boxShadow: "0 0 5px #ff2a85", flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: "#666", fontFamily: "monospace", flex: 1 }}>Loss / الخسارة</span>
            <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: "bold", color: "#ff2a85",
              textShadow: "0 0 6px #ff2a8566" }}>
              {loss.toFixed(5)}
            </span>
          </div>
          <div style={{ height: 55 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recent} margin={{ top: 2, right: 2, left: -34, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#0e0e16" />
                <XAxis dataKey="iteration" hide />
                <YAxis tick={{ fill: "#2a2a3a", fontSize: 8, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <Tooltip content={<TT />} />
                <Line type="monotone" dataKey="loss" stroke="#ff2a85" strokeWidth={1.5}
                  dot={false} isAnimationActive={false}
                  style={{ filter: "drop-shadow(0 0 3px #ff2a8588)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
