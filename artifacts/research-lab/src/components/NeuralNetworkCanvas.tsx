import { useCallback, useEffect, useRef } from "react";
import type { NetworkTopology } from "@/lib/researchApi";

// ──────────────────────────────────────────────────────
// CONSTANTS & TYPES
// ──────────────────────────────────────────────────────
const BRAIN_RADIUS = 220;
const RESTING_POTENTIAL = -70;
const THRESHOLD = -50;
const REFRACTORY_TIME = 30;
const MAX_IMPULSES = 250;
const CAMERA_FOV = 520;

const COLOR = {
  migrating: "#ffb700",   // amber  — new / unconnected
  firing:    "#ff2a85",   // pink   — just fired
  resting:   "#00a2ff",   // blue   — mature idle
  link:      "#00a2ff",
  impulse:   "#ffffff",
  flash:     "#00ffaa",
};

interface Vec3 { x: number; y: number; z: number; }

interface BrainNode extends Vec3 {
  id: string;
  targetX: number; targetY: number; targetZ: number;
  potential: number;
  lastFire: number;
  state: "migrating" | "mature";
  activation: number;   // from backend (0-1), drives visual intensity
  label: string;
  nodeType: string;
}

interface BrainLink {
  source: BrainNode;
  target: BrainNode;
  weight: number;
  flash: number;         // 0..1 glow intensity that decays
}

interface Impulse {
  link: BrainLink;
  progress: number;      // 0..1 along the link
  speed: number;
}

interface Props {
  network: NetworkTopology | null;
  onAddNode: (type: string) => void;
  onRemoveNode: (id: string) => void;
}

// ──────────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────────
export default function NeuralNetworkCanvas({ network, onAddNode, onRemoveNode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const tick = useRef(0);

  // Brain state — lives outside React state for perf
  const brain = useRef<{
    nodes: BrainNode[];
    links: BrainLink[];
    impulses: Impulse[];
    rotY: number;
    rotX: number;
    nodeById: Map<string, BrainNode>;
    syncedIds: Set<string>;
  }>({
    nodes: [],
    links: [],
    impulses: [],
    rotY: 0,
    rotX: -0.12,
    nodeById: new Map(),
    syncedIds: new Set(),
  });

  const networkRef = useRef(network);
  networkRef.current = network;

  // ── helpers ──────────────────────────────────────────
  const brainSurface = (): Vec3 => {
    while (true) {
      const x = Math.random() * 2 - 1;
      const y = (Math.random() * 2 - 1) * 0.82 - 0.08;
      const z = (Math.random() * 2 - 1) * 0.88;
      if (x * x + (y * y) / 0.56 + (z * z) / 0.72 < 1.0) {
        const w = 1 + 0.065 * Math.sin(x * 11) * Math.cos(y * 11);
        return { x: x * BRAIN_RADIUS * w, y: y * BRAIN_RADIUS * w, z: z * BRAIN_RADIUS * w };
      }
    }
  };

  const project = (nx: number, ny: number, nz: number, W: number, H: number) => {
    const b = brain.current;
    const cosY = Math.cos(b.rotY), sinY = Math.sin(b.rotY);
    const x1 = nx * cosY - nz * sinY;
    const z1 = nx * sinY + nz * cosY;
    const cosX = Math.cos(b.rotX), sinX = Math.sin(b.rotX);
    const y2 = ny * cosX - z1 * sinX;
    const z2 = ny * sinX + z1 * cosX;
    const tz = z2 + 620; // camera.z offset
    const scale = CAMERA_FOV / Math.max(0.1, tz);
    return { x: W / 2 + x1 * scale, y: H / 2 + y2 * scale, s: scale };
  };

  // ── sync network from backend prop ──────────────────
  const syncNetwork = useCallback(() => {
    const net = networkRef.current;
    const b = brain.current;
    if (!net) return;

    // ADD new nodes from backend that aren't in brain yet
    net.nodes.forEach(n => {
      if (!b.nodeById.has(n.id)) {
        const surf = brainSurface();
        const bn: BrainNode = {
          id: n.id,
          x: (Math.random() - 0.5) * 10,
          y: (Math.random() - 0.5) * 10,
          z: (Math.random() - 0.5) * 10,
          targetX: surf.x, targetY: surf.y, targetZ: surf.z,
          potential: RESTING_POTENTIAL,
          lastFire: -9999,
          state: "migrating",
          activation: n.activation ?? 0.3,
          label: n.label ?? n.id.slice(-4),
          nodeType: n.type ?? "hidden",
        };
        b.nodes.push(bn);
        b.nodeById.set(n.id, bn);
      } else {
        // update activation from live data
        const bn = b.nodeById.get(n.id)!;
        bn.activation = n.activation ?? bn.activation;
        bn.label = n.label ?? bn.label;
        // high activation triggers a fire
        if (bn.activation > 0.8 && bn.state === "mature" && tick.current - bn.lastFire > REFRACTORY_TIME) {
          bn.potential = THRESHOLD + 1;
        }
      }
    });

    // remove nodes that disappeared from backend
    const backendIds = new Set(net.nodes.map(n => n.id));
    b.nodes = b.nodes.filter(bn => {
      if (!backendIds.has(bn.id)) { b.nodeById.delete(bn.id); return false; }
      return true;
    });

    // ADD links from backend
    net.edges.forEach(e => {
      const src = b.nodeById.get(e.source);
      const tgt = b.nodeById.get(e.target);
      if (!src || !tgt) return;
      if (!b.links.some(l => l.source.id === e.source && l.target.id === e.target)) {
        b.links.push({ source: src, target: tgt, weight: Math.abs(e.weight ?? 0.4), flash: 0 });
      }
    });

    // ensure at least some links between mature nodes
    if (b.links.length < 5 && b.nodes.filter(n => n.state === "mature").length >= 3) {
      const mature = b.nodes.filter(n => n.state === "mature");
      for (let i = 0; i < Math.min(4, mature.length); i++) {
        const src = mature[i];
        const tgt = mature[(i + 1) % mature.length];
        if (!b.links.some(l => l.source === src && l.target === tgt)) {
          b.links.push({ source: src, target: tgt, weight: 0.5 + Math.random() * 0.3, flash: 0 });
        }
      }
    }
  }, []);

  // ── brain physics step ───────────────────────────────
  const stepBrain = () => {
    const b = brain.current;
    tick.current++;
    b.rotY += 0.0015;

    // migrate nodes
    b.nodes.forEach(n => {
      if (n.state === "migrating") {
        n.x += (n.targetX - n.x) * 0.035;
        n.y += (n.targetY - n.y) * 0.035;
        n.z += (n.targetZ - n.z) * 0.035;
        if (Math.hypot(n.targetX - n.x, n.targetY - n.y, n.targetZ - n.z) < 5) {
          n.state = "mature";
          // link to nearest 2-3 neighbours
          const neighbours = b.nodes
            .filter(o => o.state === "mature" && o.id !== n.id)
            .map(o => ({ o, d: Math.hypot(o.x - n.x, o.y - n.y, o.z - n.z) }))
            .sort((a, c) => a.d - c.d).slice(0, 3);
          neighbours.forEach(({ o }) => {
            if (!b.links.some(l => l.source === n && l.target === o)) {
              b.links.push({ source: n, target: o, weight: 0.35 + Math.random() * 0.3, flash: 0 });
            }
          });
        }
      } else {
        // gentle wobble
        n.x = n.targetX + Math.sin(tick.current * 0.003 + n.id.charCodeAt(0)) * 2;
        n.y = n.targetY + Math.cos(tick.current * 0.002 + n.id.charCodeAt(1)) * 2;
        // potential decay back to resting
        n.potential += (RESTING_POTENTIAL - n.potential) * 0.02;
        // fire if above threshold
        if (n.potential >= THRESHOLD && n.state === "mature" && tick.current - n.lastFire > REFRACTORY_TIME) {
          n.potential = RESTING_POTENTIAL - 8;
          n.lastFire = tick.current;
          b.links.filter(l => l.source === n).forEach(l => {
            if (b.impulses.length < MAX_IMPULSES) {
              l.flash = 1.0;
              b.impulses.push({ link: l, progress: 0, speed: 0.025 + Math.random() * 0.02 });
            }
          });
        }
      }
    });

    // move impulses
    for (let i = b.impulses.length - 1; i >= 0; i--) {
      const imp = b.impulses[i];
      imp.progress += imp.speed;
      if (imp.progress >= 1) {
        const tgt = imp.link.target;
        if (tgt.state === "mature" && tick.current - tgt.lastFire > REFRACTORY_TIME) {
          tgt.potential += 18 * imp.link.weight;
        }
        b.impulses.splice(i, 1);
      }
    }

    // decay flashes
    b.links.forEach(l => { if (l.flash > 0) l.flash -= 0.025; });

    // periodic spontaneous firing (keep the brain alive)
    if (tick.current % 45 === 0) {
      const mature = b.nodes.filter(n => n.state === "mature");
      if (mature.length > 0) {
        const seed = mature[Math.floor(Math.random() * mature.length)];
        seed.potential = THRESHOLD + 2;
      }
    }
  };

  // ── render ──────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const b = brain.current;

    // sync live data from backend
    if (tick.current % 12 === 0) syncNetwork();

    stepBrain();

    // ── background ────────────────────────────────────
    ctx.fillStyle = "#030306";
    ctx.fillRect(0, 0, W, H);

    // subtle radial depth gradient
    const radGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
    radGrad.addColorStop(0, "rgba(0,30,50,0.25)");
    radGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, W, H);

    // ── grid lines ────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.018)";
    ctx.lineWidth = 0.5;
    const gs = 38;
    for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    if (b.nodes.length === 0) {
      ctx.fillStyle = "#374151";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Initializing neural fabric...", W / 2, H / 2);
      raf.current = requestAnimationFrame(render);
      return;
    }

    // sort back-to-front for painter's algorithm
    const projected = b.nodes.map(n => {
      const p = project(n.x, n.y, n.z, W, H);
      return { n, p };
    }).sort((a, c) => a.p.s - c.p.s); // smaller scale = farther away

    // ── LINKS ────────────────────────────────────────
    b.links.forEach(l => {
      const p1 = project(l.source.x, l.source.y, l.source.z, W, H);
      const p2 = project(l.target.x, l.target.y, l.target.z, W, H);
      if (l.flash > 0.05) {
        ctx.strokeStyle = `rgba(0,255,170,${l.flash * 0.85})`;
        ctx.lineWidth = 1.1 * p1.s;
        ctx.shadowColor = "#00ffaa";
        ctx.shadowBlur = 8 * l.flash;
      } else {
        ctx.strokeStyle = `rgba(0,162,255,${l.weight * 0.22})`;
        ctx.lineWidth = 0.6;
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });
    ctx.shadowBlur = 0;

    // ── IMPULSES ─────────────────────────────────────
    b.impulses.forEach(imp => {
      const sx = imp.link.source.x + (imp.link.target.x - imp.link.source.x) * imp.progress;
      const sy = imp.link.source.y + (imp.link.target.y - imp.link.source.y) * imp.progress;
      const sz = imp.link.source.z + (imp.link.target.z - imp.link.source.z) * imp.progress;
      const p = project(sx, sy, sz, W, H);
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 6;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.8 * p.s, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // ── NODES ────────────────────────────────────────
    projected.forEach(({ n, p }) => {
      const firing = tick.current - n.lastFire < REFRACTORY_TIME;
      const baseColor = n.state === "migrating" ? COLOR.migrating : firing ? COLOR.firing : COLOR.resting;
      const r = Math.max(2.5, (n.state === "migrating" ? 3.2 : 2.2) * p.s);
      const glowRadius = r * (2.8 + n.activation * 3.5);

      // outer glow
      const glowGrad = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, glowRadius);
      const glowAlpha = n.state === "migrating" ? 0.5 : firing ? 0.8 : 0.3 + n.activation * 0.4;
      glowGrad.addColorStop(0, baseColor + Math.round(glowAlpha * 255).toString(16).padStart(2, "0"));
      glowGrad.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // sphere body (3D light from top-left)
      const bodyGrad = ctx.createRadialGradient(
        p.x - r * 0.38, p.y - r * 0.38, 0,
        p.x, p.y, r
      );
      bodyGrad.addColorStop(0, "rgba(255,255,255,0.92)");
      bodyGrad.addColorStop(0.22, baseColor);
      bodyGrad.addColorStop(0.75, baseColor + "bb");
      bodyGrad.addColorStop(1, baseColor + "33");
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      if (firing) { ctx.shadowColor = COLOR.firing; ctx.shadowBlur = 14; }
      ctx.fill();
      ctx.shadowBlur = 0;

      // activation arc ring
      if (n.activation > 0.08 && r > 3) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 2.5 * p.s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * n.activation);
        ctx.strokeStyle = baseColor + "cc";
        ctx.lineWidth = 1.4 * p.s;
        ctx.stroke();
      }

      // label (only when large enough)
      if (r > 4) {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = `bold ${Math.max(7, 7 * p.s)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(n.label.slice(0, 6), p.x, p.y + r + 11 * p.s);
      }
    });

    raf.current = requestAnimationFrame(render);
  }, [syncNetwork]);

  useEffect(() => {
    raf.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf.current);
  }, [render]);

  // resize
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

  // click interaction
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const W = canvas.width, H = canvas.height;

    const hit = brain.current.nodes.find(n => {
      const p = project(n.x, n.y, n.z, W, H);
      const r = Math.max(10, 14 * p.s);
      return Math.hypot(cx - p.x, cy - p.y) < r;
    });

    if (hit) {
      if (hit.nodeType !== "input" && hit.nodeType !== "output") onRemoveNode(hit.id);
    } else {
      onAddNode("hidden");
    }
  }, [onAddNode, onRemoveNode]);

  // Legend config
  const LEGEND = [
    { color: COLOR.migrating, label: "MIGRATING" },
    { color: COLOR.firing,    label: "FIRING" },
    { color: COLOR.resting,   label: "RESTING" },
  ];

  return (
    <div className="relative w-full h-full" style={{ background: "#030306" }}>
      <canvas ref={canvasRef} onClick={handleClick} className="w-full h-full cursor-crosshair" />

      {/* Node state legend */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 pointer-events-none">
        {LEGEND.map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs font-mono px-1.5 py-0.5 rounded-sm"
            style={{ background: "rgba(3,3,6,0.85)", color, border: `1px solid ${color}44` }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: color, boxShadow: `0 0 5px ${color}` }} />
            {label}
          </span>
        ))}
      </div>

      <div className="absolute bottom-2 left-2 text-xs text-gray-700 font-mono pointer-events-none">
        Click space — add node · Click node — remove
      </div>
    </div>
  );
}
