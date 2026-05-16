import { useCallback, useEffect, useRef } from "react";
import type { NetworkTopology } from "@/lib/researchApi";

const NODE_COLORS: Record<string, string> = {
  input: "#60a5fa",
  hidden: "#a78bfa",
  output: "#34d399",
  attention: "#f59e0b",
  memory: "#f472b6",
};

const NODE_GLOW: Record<string, string> = {
  input: "rgba(96,165,250,0.5)",
  hidden: "rgba(167,139,250,0.5)",
  output: "rgba(52,211,153,0.5)",
  attention: "rgba(245,158,11,0.5)",
  memory: "rgba(244,114,182,0.5)",
};

interface Props {
  network: NetworkTopology | null;
  onAddNode: (type: string) => void;
  onRemoveNode: (id: string) => void;
}

export default function NeuralNetworkCanvas({ network, onAddNode, onRemoveNode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const pulseRef = useRef(0);
  const networkRef = useRef(network);
  networkRef.current = network;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const net = networkRef.current;
    pulseRef.current += 0.05;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!net || net.nodes.length === 0) {
      ctx.fillStyle = "#374151";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Initializing neural network...", canvas.width / 2, canvas.height / 2);
      animFrameRef.current = requestAnimationFrame(draw);
      return;
    }

    const scaleX = canvas.width / 800;
    const scaleY = canvas.height / 500;

    net.edges.forEach((edge) => {
      const src = net.nodes.find((n) => n.id === edge.source);
      const tgt = net.nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) return;
      const sx = src.x * scaleX;
      const sy = src.y * scaleY;
      const tx = tgt.x * scaleX;
      const ty = tgt.y * scaleY;
      const alpha = edge.active ? Math.abs(edge.weight) * 0.7 + 0.1 : 0.05;
      const weight = Math.abs(edge.weight);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = edge.weight > 0
        ? `rgba(96,165,250,${alpha})`
        : `rgba(239,68,68,${alpha})`;
      ctx.lineWidth = Math.max(0.5, weight * 2.5);
      ctx.stroke();
    });

    net.nodes.forEach((node) => {
      const x = node.x * scaleX;
      const y = node.y * scaleY;
      const baseR = 14;
      const pulse = Math.sin(pulseRef.current + node.activation * Math.PI * 2) * 2;
      const r = baseR + pulse * node.activation;

      const glowColor = NODE_GLOW[node.type] || "rgba(255,255,255,0.3)";
      const glowSize = r * 2 + node.activation * 12;
      const glowGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowSize);
      glowGrad.addColorStop(0, glowColor);
      glowGrad.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      const nodeColor = NODE_COLORS[node.type] || "#ffffff";
      const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      grad.addColorStop(0, "white");
      grad.addColorStop(0.3, nodeColor);
      grad.addColorStop(1, `${nodeColor}88`);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = nodeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const actBarH = 3;
      const actBarW = r * 2;
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(x - r, y + r + 3, actBarW, actBarH);
      ctx.fillStyle = nodeColor;
      ctx.fillRect(x - r, y + r + 3, actBarW * node.activation, actBarH);

      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `${Math.max(8, 10 * scaleX)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(node.label, x, y + r + 16);
    });

    animFrameRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => ro.disconnect();
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const net = networkRef.current;
    if (!canvas || !net) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const scaleX = canvas.width / 800;
    const scaleY = canvas.height / 500;

    const clicked = net.nodes.find((node) => {
      const nx = node.x * scaleX;
      const ny = node.y * scaleY;
      return Math.hypot(cx - nx, cy - ny) < 18;
    });

    if (clicked) {
      if (clicked.type !== "input" && clicked.type !== "output") {
        onRemoveNode(clicked.id);
      }
    } else {
      onAddNode("hidden");
    }
  }, [onAddNode, onRemoveNode]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="w-full h-full cursor-crosshair"
        data-testid="neural-network-canvas"
      />
      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
            {type}
          </span>
        ))}
      </div>
      <div className="absolute bottom-2 right-2 text-xs text-gray-500 font-mono">
        Click empty area to add node · Click node to remove
      </div>
    </div>
  );
}
