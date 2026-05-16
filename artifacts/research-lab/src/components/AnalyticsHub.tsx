import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { MetricPoint } from "@/lib/researchApi";

interface Props {
  metrics: MetricPoint[];
  currentIteration: number;
}

interface ChartConfig {
  key: keyof MetricPoint;
  label: string;
  color: string;
  unit: string;
}

const CHARTS: ChartConfig[] = [
  { key: "convergenceSpeed", label: "Convergence Speed", color: "#10b981", unit: "" },
  { key: "generalizationIndex", label: "Generalization Index", color: "#60a5fa", unit: "" },
  { key: "synapticStability", label: "Synaptic Stability", color: "#a78bfa", unit: "" },
];

const CustomTooltip = ({ active, payload, label }: Record<string, unknown>) => {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  const p = payload[0] as Record<string, unknown>;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs font-mono">
      <p className="text-gray-400">iter {String(label)}</p>
      <p style={{ color: String(p.color) }}>{(p.value as number).toFixed(4)}</p>
    </div>
  );
};

export default function AnalyticsHub({ metrics, currentIteration }: Props) {
  const recent = metrics.slice(-50);
  const latest = metrics[metrics.length - 1];

  const currentLoss = latest?.loss ?? 0;
  const currentGen = latest?.generalizationIndex ?? 0;
  const currentConv = latest?.convergenceSpeed ?? 0;
  const currentStab = latest?.synapticStability ?? 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-mono text-gray-400">ANALYTICS HUB</span>
        <div className="flex-1" />
        <span className="text-xs font-mono text-cyan-500">ITER {currentIteration}</span>
      </div>

      <div className="grid grid-cols-4 gap-px bg-gray-800 border-b border-gray-800 flex-shrink-0">
        {[
          { label: "LOSS", value: currentLoss.toFixed(5), color: "#ef4444" },
          { label: "CONV", value: currentConv.toFixed(3), color: "#10b981" },
          { label: "GEN", value: currentGen.toFixed(3), color: "#60a5fa" },
          { label: "STAB", value: currentStab.toFixed(3), color: "#a78bfa" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-950 px-3 py-2 text-center" data-testid={`metric-${label.toLowerCase()}`}>
            <div className="text-xs font-mono text-gray-500">{label}</div>
            <div className="text-sm font-mono font-bold" style={{ color }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3" data-testid="analytics-hub">
        {CHARTS.map(({ key, label, color }) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
              <span className="text-xs font-mono text-gray-400">{label}</span>
              <span className="text-xs font-mono ml-auto" style={{ color }}>
                {(latest?.[key] as number ?? 0).toFixed(4)}
              </span>
            </div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recent} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="iteration"
                    tick={{ fill: "#4b5563", fontSize: 9, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: "#4b5563", fontSize: 9, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey={key as string}
                    stroke={color}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    strokeOpacity={0.9}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
