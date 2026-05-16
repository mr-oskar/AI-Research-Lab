import { useCallback, useEffect, useRef } from "react";
import type { NetworkTopology } from "@/lib/researchApi";

const NODE_CONFIG: Record<string, { color: string; glow: string; label: string }> = {
  input:     { color: "#60a5fa", glow: "rgba(96,165,250,0.6)",   label: "IN" },
  hidden:    { color: "#a78bfa", glow: "rgba(167,139,250,0.5)",  label: "H" },
  output:    { color: "#34d399", glow: "rgba(52,211,153,0.6)",   label: "OUT" },
  attention: { color: "#f59e0b", glow: "rgba(245,158,11,0.55)",  label: "ATT" },
  memory:    { color: "#f472b6", glow: "rgba(244,114,182,0.55)", label: "MEM" },
};

interface Particle {
  edgeId: string;
  progress: number;
  speed: number;
  alpha: number;
}

interface Props {
  network: NetworkTopology | null;
  onAddNode: (type: string) => void;
  onRemoveNode: (id: string) => void;
}

export default function NeuralNetworkCanvas({ network, onAddNode, onRemoveNode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const tickRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const networkRef = useRef(network);
  networkRef.current = network;

  // Spawn particles on active edges
  const spawnParticles = useCallback((net: NetworkTopology) => {
    const activeEdges = net.edges.filter(e => e.active && Math.abs(e.weight) > 0.3);
    if (particlesRef.current.length < 60 && activeEdges.length > 0 && Math.random() < 0.4) {
      const edge = activeEdges[Math.floor(Math.random() * activeEdges.length)];
      particlesRef.current.push({
        edgeId: edge.id,
        progress: 0,
        speed: 0.008 + Math.random() * 0.012,
        alpha: 0.6 + Math.random() * 0.4,
      });
    }
    particlesRef.current = particlesRef.current
      .map(p => ({ ...p, progress: p.progress + p.speed }))
      .filter(p => p.progress < 1);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const net = networkRef.current;
    tickRef.current += 0.04;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Deep space background with subtle grid
    ctx.fillStyle = "#070710";
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.025)";
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x < W; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    if (!net || net.nodes.length === 0) {
      ctx.fillStyle = "#374151";
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Initializing neural network...", W / 2, H / 2);
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    const scaleX = W / 800;
    const scaleY = H / 500;

    // Spawn and update particles
    spawnParticles(net);

    // Build node position map
    const nodeMap = new Map(net.nodes.map(n => [n.id, { ...n, x: n.x * scaleX, y: n.y * scaleY }]));

    // Draw bezier edges
    net.edges.forEach(edge => {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) return;

      const w = Math.abs(edge.weight);
      const alpha = edge.active ? (w * 0.6 + 0.08) : 0.04;
      const color = edge.weight > 0 ? `rgba(96,165,250,${alpha})` : `rgba(239,68,68,${alpha})`;

      // Bezier control points for curved edges
      const dx = tgt.x - src.x, dy = tgt.y - src.y;
      const cx1 = src.x + dx * 0.4 + dy * 0.15;
      const cy1 = src.y + dy * 0.4 - dx * 0.15;
      const cx2 = tgt.x - dx * 0.4 + dy * 0.15;
      const cy2 = tgt.y - dy * 0.4 - dx * 0.15;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, tgt.x, tgt.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.4, w * 2.2);
      ctx.stroke();
    });

    // Draw particles along edges
    particlesRef.current.forEach(particle => {
      const edge = net.edges.find(e => e.id === particle.edgeId);
      if (!edge) return;
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) return;

      const t = particle.progress;
      const dx = tgt.x - src.x, dy = tgt.y - src.y;
      const cx1 = src.x + dx * 0.4 + dy * 0.15;
      const cy1 = src.y + dy * 0.4 - dx * 0.15;
      const cx2 = tgt.x - dx * 0.4 + dy * 0.15;
      const cy2 = tgt.y - dy * 0.4 - dx * 0.15;

      // Cubic bezier interpolation
      const mt = 1 - t;
      const px = mt*mt*mt*src.x + 3*mt*mt*t*cx1 + 3*mt*t*t*cx2 + t*t*t*tgt.x;
      const py = mt*mt*mt*src.y + 3*mt*mt*t*cy1 + 3*mt*t*t*cy2 + t*t*t*tgt.y;

      const srcCfg = NODE_CONFIG[src.type] || NODE_CONFIG.hidden;
      const pGrad = ctx.createRadialGradient(px, py, 0, px, py, 4);
      pGrad.addColorStop(0, `${srcCfg.color}ff`);
      pGrad.addColorStop(1, `${srcCfg.color}00`);
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = pGrad;
      ctx.globalAlpha = particle.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw nodes (3D-like spheres)
    net.nodes.forEach(node => {
      const x = node.x * scaleX;
      const y = node.y * scaleY;
      const cfg = NODE_CONFIG[node.type] || NODE_CONFIG.hidden;

      const pulse = Math.sin(tickRef.current + node.activation * Math.PI * 3) * 0.15 + 1;
      const baseR = 13 * Math.max(0.8, scaleX);
      const r = baseR * pulse;

      // Outer glow halo (scales with activation)
      const haloR = r * (2.5 + node.activation * 2);
      const halo = ctx.createRadialGradient(x, y, r * 0.5, x, y, haloR);
      halo.addColorStop(0, cfg.glow);
      halo.addColorStop(0.5, cfg.glow.replace(/[\d.]+\)$/, "0.15)"));
      halo.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      // Node body — 3D sphere gradient (light from top-left)
      const sphere = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
      sphere.addColorStop(0, "rgba(255,255,255,0.95)");
      sphere.addColorStop(0.2, cfg.color);
      sphere.addColorStop(0.7, cfg.color + "cc");
      sphere.addColorStop(1, cfg.color + "44");
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = sphere;
      ctx.fill();

      // Ring border
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Specular highlight (top-left gleam)
      const spec = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x - r * 0.2, y - r * 0.2, r * 0.55);
      spec.addColorStop(0, "rgba(255,255,255,0.55)");
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = spec;
      ctx.fill();

      // Activation progress arc
      if (node.activation > 0.05) {
        ctx.beginPath();
        ctx.arc(x, y, r + 3.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * node.activation);
        ctx.strokeStyle = cfg.color + "cc";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label
      const fontSize = Math.max(8, 9 * scaleX);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(node.label, x, y + r + 12);

      // Activation value
      ctx.fillStyle = cfg.color + "cc";
      ctx.font = `${Math.max(6, 7 * scaleX)}px monospace`;
      ctx.fillText(node.activation.toFixed(2), x, y + r + 22);
    });

    animRef.current = requestAnimationFrame(draw);
  }, [spawnParticles]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
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
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const scaleX = canvas.width / 800, scaleY = canvas.height / 500;
    const hit = net.nodes.find(n => Math.hypot(cx - n.x * scaleX, cy - n.y * scaleY) < 18);
    if (hit) {
      if (hit.type !== "input" && hit.type !== "output") onRemoveNode(hit.id);
    } else {
      onAddNode("hidden");
    }
  }, [onAddNode, onRemoveNode]);

  return (
    <div className="relative w-full h-full bg-[#070710]">
      <canvas ref={canvasRef} onClick={handleClick} className="w-full h-full cursor-crosshair" />

      {/* Legend */}
      <div className="absolute top-2 left-2 flex flex-wrap gap-1 pointer-events-none">
        {Object.entries(NODE_CONFIG).map(([type, cfg]) => (
          <span key={type} className="flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded-sm"
            style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}44` }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }} />
            {type}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-600 font-mono pointer-events-none">
        Click space to add · Click node to remove
      </div>
    </div>
  );
}
