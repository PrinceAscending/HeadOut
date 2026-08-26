"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RegionPanelShell } from "./RegionPanelShell";
import { useGame } from "@/lib/game/store";
import { playSound } from "@/lib/audio/sound";
import { Chip, LiveIndicator, SectionTitle, SystemLabel } from "@/components/ui/holo/primitives";
import { EASE_EXPO, fadeUp } from "@/lib/world/motion";

/* ═══════════════════════════════════════════════════════════
   LAB — five experiments, each a small interactive machine.
   Built so new experiments can be dropped in without redesign.
   ═══════════════════════════════════════════════════════════ */

interface ExperimentDef {
  id: string;
  index: string;
  name: string;
  status: "STABLE" | "RUNNING" | "SEALED";
  note: string;
}

const EXPERIMENTS: ExperimentDef[] = [
  { id: "particles", index: "001", name: "PARTICLE FIELD", status: "STABLE", note: "Matter that notices you." },
  { id: "gravity", index: "002", name: "DIGITAL GRAVITY", status: "STABLE", note: "Click to bend space. Watch it remember." },
  { id: "voidterm", index: "003", name: "VOID TERMINAL", status: "RUNNING", note: "It types back. Do not expect sense." },
  { id: "neural", index: "004", name: "NEURAL MAP", status: "STABLE", note: "A mind drawn in real time." },
  { id: "unknown", index: "005", name: "UNKNOWN", status: "SEALED", note: "Sealed until the world gives up more of itself." },
];

/* 001 — particle field following cursor */
function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let raf = 0;
    const mouse = { x: -999, y: -999 };
    const N = 90;
    const ps = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: 0,
      vy: 0,
    }));
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = (e.clientY - r.top) / r.height;
    };
    window.addEventListener("pointermove", onMove);
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "rgba(4,4,10,0.35)";
      ctx.fillRect(0, 0, w, h);
      for (const p of ps) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 0.06) {
          p.vx += dx * 0.0016 / Math.max(0.02, d2);
          p.vy += dy * 0.0016 / Math.max(0.02, d2);
        }
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.x += p.vx / 1;
        p.y += p.vy / 1;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 1.1 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,123,255,${0.35 + Math.min(0.5, Math.hypot(p.vx, p.vy) * 6)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return <canvas ref={ref} className="w-full h-52 border border-white/8 bg-black/60" />;
}

/* 002 — gravity wells */
function GravityWell() {
  const ref = useRef<HTMLCanvasElement>(null);
  const wellsRef = useRef<{ x: number; y: number }[]>([]);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let raf = 0;
    const ps = Array.from({ length: 60 }, () => ({
      a: Math.random() * Math.PI * 2,
      r: 0.15 + Math.random() * 0.35,
      s: 0.3 + Math.random() * 0.7,
      x: 0.5,
      y: 0.5,
    }));
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    let t = 0;
    const draw = () => {
      t += 0.016;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "rgba(4,4,10,0.4)";
      ctx.fillRect(0, 0, w, h);
      const wells = wellsRef.current;
      const cx = w / 2;
      const cy = h / 2;
      if (!wells.length) wells.push({ x: 0.5, y: 0.5 });
      ps.forEach((p, i) => {
        const well = wells[i % wells.length];
        const wx = well.x * w;
        const wy = well.y * h;
        const a = p.a + t * p.s * 0.6;
        const r = p.r * Math.min(w, h) * (0.55 + Math.sin(t * 0.5 + i) * 0.12);
        const x = wx + Math.cos(a) * r;
        const y = wy + Math.sin(a) * r * 0.55;
        ctx.beginPath();
        ctx.arc(x, y, 1.2 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(85,230,255,${0.25 + p.s * 0.55})`;
        ctx.fill();
      });
      wells.forEach((well) => {
        ctx.beginPath();
        ctx.arc(well.x * w, well.y * h, 3 * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.stroke();
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return (
    <canvas
      ref={ref}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        wellsRef.current = [
          ...wellsRef.current.slice(-2),
          { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height },
        ];
        playSound("click");
      }}
      className="w-full h-52 border border-white/8 bg-black/60 cursor-crosshair"
    />
  );
}

/* 003 — void terminal that types back */
const VOID_LINES = [
  "you opened the wrong terminal",
  "or the right one",
  "there is nothing here",
  "nothing is quite talkative today",
  "ask again",
  "not that question",
  "the void does not parse flags",
  "you are the experiment",
  "experiment 003 observes back",
  "logging your patience: adequate",
];
function VoidTerminal() {
  const [lines, setLines] = useState<{ mine: boolean; text: string }[]>([
    { mine: false, text: "VOID TERMINAL v0.3 — no commands, only conversation" },
    { mine: false, text: "say anything." },
  ]);
  const [input, setInput] = useState("");
  const discover = useGame((s) => s.discover);
  const askedRef = useRef(0);
  return (
    <div>
      <div className="border border-white/10 bg-black/70 p-3 h-44 overflow-y-auto wx-scroll font-mono text-[10px] leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} className={l.mine ? "text-wx-cyan/80" : "text-wx-dim"}>
            {l.mine ? "> " : ""}
            {l.text}
          </div>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          askedRef.current += 1;
          if (askedRef.current >= 3) discover("lab-exp-3");
          const reply = VOID_LINES[Math.floor(Math.random() * VOID_LINES.length)];
          setLines((ls) => [...ls.slice(-8), { mine: true, text: input }, { mine: false, text: reply }]);
          setInput("");
          playSound("key");
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-white/[0.03] border border-white/12 px-3 py-2 font-mono text-[10px] text-foreground/80 outline-none focus:border-wx-violet/50"
          placeholder="speak to the void..."
          aria-label="Speak to the void terminal"
        />
        <button
          type="submit"
          className="font-mono text-[10px] tracking-[0.2em] border border-wx-violet/40 text-wx-violet px-3 clip-btn hover:bg-wx-violet/10"
        >
          SEND
        </button>
      </form>
    </div>
  );
}

/* 004 — neural map */
function NeuralMap() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let raf = 0;
    const N = 34;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      f: Math.random() * Math.PI * 2,
    }));
    const edges: [number, number][] = [];
    nodes.forEach((_, i) => {
      const a = Math.floor(Math.random() * N);
      const b = Math.floor(Math.random() * N);
      if (a !== b) edges.push([a, b]);
    });
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const draw = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const pos = nodes.map((n) => ({
        x: (n.x + Math.sin(t * 0.0004 + n.f) * 0.03) * w,
        y: (n.y + Math.cos(t * 0.0005 + n.f) * 0.03) * h,
      }));
      edges.forEach(([a, b]) => {
        const fire = Math.sin(t * 0.002 + a + b) > 0.86;
        ctx.beginPath();
        ctx.moveTo(pos[a].x, pos[a].y);
        ctx.lineTo(pos[b].x, pos[b].y);
        ctx.strokeStyle = fire ? "rgba(139,123,255,0.75)" : "rgba(120,150,200,0.13)";
        ctx.lineWidth = fire ? 1.4 : 1;
        ctx.stroke();
      });
      pos.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(200,220,255,0.8)";
        ctx.fill();
        if (Math.sin(t * 0.001 + i * 2.4) > 0.97) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5 * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(139,123,255,0.5)";
          ctx.stroke();
        }
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="w-full h-52 border border-white/8 bg-black/60" />;
}

export function Lab() {
  const [open, setOpen] = useState<string | null>(null);
  const discover = useGame((s) => s.discover);
  const foundSecrets = useGame((s) => s.foundSecrets);
  const discoveries = useGame((s) => s.discoveries);
  const exp5Sealed = discoveries.length < 8 && foundSecrets.length < 2;

  return (
    <RegionPanelShell regionId="lab">
      <div className="space-y-4">
        <motion.div variants={fadeUp}>
          <SystemLabel>
            EXPERIMENTAL WING — {EXPERIMENTS.length} REGISTERED, {exp5Sealed ? "1 SEALED" : "ALL UNSEALED"}
          </SystemLabel>
        </motion.div>

        {EXPERIMENTS.map((exp) => {
          const sealed = exp.id === "unknown" && exp5Sealed;
          const isOpen = open === exp.id;
          return (
            <motion.div key={exp.id} variants={fadeUp} className="border border-white/8 bg-white/[0.015] clip-panel">
              <button
                onClick={() => {
                  playSound("click");
                  if (!sealed) setOpen(isOpen ? null : exp.id);
                  if (exp.id === "particles") discover("lab-exp-1");
                  if (exp.id === "neural") discover("lab-exp-4");
                }}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors text-left"
                aria-expanded={isOpen}
                disabled={sealed}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-[10px] text-wx-dim tracking-widest shrink-0">
                    EXP.
                  </span>
                  <span className="font-mono text-[11px] text-wx-violet shrink-0">
                    {exp.index}
                  </span>
                  <span className="font-sans text-[13px] font-medium tracking-[0.14em] text-foreground/85 truncate">
                    {sealed ? "████████" : exp.name}
                  </span>
                </div>
                <span className="flex items-center gap-3 shrink-0">
                  <LiveIndicator
                    state={sealed ? "offline" : exp.status === "RUNNING" ? "live" : "degraded"}
                    label={sealed ? "SEALED" : exp.status}
                  />
                  <span className="font-mono text-[10px] text-wx-dim">
                    {isOpen ? "[ CLOSE ]" : "[ RUN ]"}
                  </span>
                </span>
              </button>
              <AnimatePresence>
                {isOpen && !sealed && (
                  <motion.div
                    key="body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE_EXPO }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      <div className="font-mono text-[10px] text-wx-dim mb-2 tracking-wider">
                        {exp.note.toUpperCase()}
                      </div>
                      {exp.id === "particles" && <ParticleField />}
                      {exp.id === "gravity" && <GravityWell />}
                      {exp.id === "voidterm" && <VoidTerminal />}
                      {exp.id === "neural" && <NeuralMap />}
                      {exp.id === "unknown" && (
                        <div className="h-52 grid place-items-center border border-white/8 bg-black/70">
                          <div className="text-center">
                            <div className="font-mono text-[10px] text-wx-dim tracking-[0.3em] wx-animate-pulse">
                              EXPERIMENT 005 UNSEALED
                            </div>
                            <div className="font-mono text-[10px] text-wx-dim/60 mt-2">
                              it was watching the whole time
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        <motion.div
          variants={fadeUp}
          className="font-mono text-[10px] leading-relaxed tracking-wider text-wx-dim/70 border-l border-wx-violet/25 pl-3"
        >
          THE LAB IS EXTENSIBLE BY DESIGN. NEW EXPERIMENTS SLOT INTO THE
          REGISTRY WITHOUT REDESIGNING THE WORLD.
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
          <Chip color="#b78bff">5 EXPERIMENTS</Chip>
          <Chip>CANVAS-BASED · LIGHT</Chip>
        </motion.div>
      </div>
    </RegionPanelShell>
  );
}
