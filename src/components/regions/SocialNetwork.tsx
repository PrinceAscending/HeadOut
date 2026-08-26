"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RegionPanelShell } from "./RegionPanelShell";
import { SOCIAL_NODES } from "@/lib/config/identity";
import { useWorld } from "@/lib/world/store";
import { useGame } from "@/lib/game/store";
import { playSound } from "@/lib/audio/sound";
import { Chip, LiveIndicator, SectionTitle } from "@/components/ui/holo/primitives";
import { EASE_EXPO, fadeUp } from "@/lib/world/motion";

/* ═══════════════════════════════════════════════════════════
   Social Network — platforms as a neural web, not link cards.
   Nodes drift; live nodes pulse. Signal lines carry packets.
   ═══════════════════════════════════════════════════════════ */

/* short shared fade for conditional state swaps */
const SWAP_FADE = { duration: 0.2, ease: EASE_EXPO };

interface NodePos {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function NeuralWeb({
  nodes,
  liveIds,
  onPick,
}: {
  nodes: typeof SOCIAL_NODES;
  liveIds: string[];
  onPick: (id: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const posRef = useRef<NodePos[]>(
    nodes.map((n, i) => {
      const a = (i / nodes.length) * Math.PI * 2;
      return {
        id: n.id,
        x: 0.5 + Math.cos(a) * 0.32,
        y: 0.5 + Math.sin(a) * 0.34,
        vx: 0,
        vy: 0,
      };
    })
  );
  const packetsRef = useRef<{ from: number; to: number; t: number; speed: number }[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const liveRef = useRef<string[]>(liveIds);
  const pickRef = useRef(onPick);
  useEffect(() => {
    liveRef.current = liveIds;
    pickRef.current = onPick;
  }, [liveIds, onPick]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const home = posRef.current.map((p) => ({ x: p.x, y: p.y }));
    let lastSpawn = 0;

    const draw = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      /* physics — orbit home with gentle noise */
      const pts = posRef.current;
      pts.forEach((p, i) => {
        const hx = home[i].x + Math.sin(t * 0.00035 + i * 2.1) * 0.022;
        const hy = home[i].y + Math.cos(t * 0.00042 + i * 1.7) * 0.028;
        if (!reduced) {
          p.vx += (hx - p.x) * 0.0016 + (Math.random() - 0.5) * 0.00012;
          p.vy += (hy - p.y) * 0.0016 + (Math.random() - 0.5) * 0.00012;
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.x += p.vx;
          p.y += p.vy;
        }
      });

      /* edges */
      pts.forEach((a, i) => {
        pts.forEach((b, j) => {
          if (j <= i) return;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > 0.34) return;
          const ax = a.x * w;
          const ay = a.y * h;
          const bx = b.x * w;
          const by = b.y * h;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - 12 * dpr, bx, by);
          ctx.strokeStyle = `rgba(120,170,235,${(1 - dist / 0.34) * 0.22})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      });

      /* spawn packets from center to live nodes */
      if (t - lastSpawn > 900) {
        lastSpawn = t;
        liveRef.current.forEach((lid) => {
          const idx = pts.findIndex((p) => p.id === lid);
          if (idx >= 0)
            packetsRef.current.push({
              from: -1,
              to: idx,
              t: 0,
              speed: 0.008 + Math.random() * 0.006,
            });
        });
        packetsRef.current = packetsRef.current.filter((p) => p.t < 1);
      }
      packetsRef.current.forEach((pk) => {
        pk.t += pk.speed;
        if (pk.t > 1 || pk.to >= pts.length) return;
        const target = pts[pk.to];
        const cx = w / 2;
        const cy = h / 2;
        const tx = target.x * w;
        const ty = target.y * h;
        const x = cx + (tx - cx) * pk.t;
        const y = cy + (ty - cy) * pk.t - Math.sin(pk.t * Math.PI) * 16 * dpr;
        ctx.beginPath();
        ctx.arc(x, y, 1.6 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(85,230,255,0.85)";
        ctx.shadowColor = "#55e6ff";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      /* hub */
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 4 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(220,240,255,0.9)";
      ctx.shadowColor = "#aee6ff";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      /* nodes */
      pts.forEach((p, i) => {
        const live = liveRef.current.includes(p.id);
        const hov = hovered === i;
        const x = p.x * w;
        const y = p.y * h;
        const r = (live ? 4.2 : 3) * dpr * (hov ? 1.5 : 1) * (1 + (live ? Math.sin(t * 0.004) * 0.16 : 0));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = live
          ? "rgba(85,230,255,0.95)"
          : p.id === "placeholder"
            ? "rgba(120,130,150,0.5)"
            : "rgba(160,190,225,0.75)";
        ctx.shadowColor = live ? "#55e6ff" : "transparent";
        ctx.shadowBlur = live ? 16 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;
        if (live) {
          ctx.beginPath();
          ctx.arc(x, y, r + 6 * dpr + Math.sin(t * 0.003) * 2 * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(85,230,255,0.3)";
          ctx.stroke();
        }
        /* label */
        ctx.font = `${8.5 * dpr}px "JetBrains Mono", monospace`;
        ctx.fillStyle = hov ? "#ffffff" : live ? "rgba(190,240,255,0.9)" : "rgba(150,170,200,0.55)";
        ctx.textAlign = "center";
        ctx.fillText(nodes[i].platform, x, y - r - 6 * dpr);
      });

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [nodes, hovered]);

  /* map canvas clicks to nearest node */
  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    let best = -1;
    let bestD = 0.06;
    posRef.current.forEach((p, i) => {
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best >= 0) {
      playSound("click");
      setHovered(best);
      onPick(nodes[best].id);
    }
  };

  return (
    <canvas
      ref={ref}
      onClick={onClick}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / rect.width;
        const my = (e.clientY - rect.top) / rect.height;
        let best: number | null = null;
        let bestD = 0.06;
        posRef.current.forEach((p, i) => {
          const d = Math.hypot(p.x - mx, p.y - my);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        setHovered(best);
      }}
      onMouseLeave={() => setHovered(null)}
      className="w-full h-64 border border-white/8 bg-black/40 cursor-crosshair"
      role="img"
      aria-label="Neural social web — click a node to inspect the platform"
    />
  );
}

export function SocialNetwork() {
  const lanyard = useWorld((s) => s.lanyard);
  const unlock = useGame((s) => s.unlockAchievement);
  const discover = useGame((s) => s.discover);
  const [picked, setPicked] = useState<string | null>(null);

  const liveIds = useMemo(() => {
    const ids: string[] = [];
    if (lanyard) {
      ids.push("discord");
      ids.push("github");
      ids.push("chess");
      if (lanyard.listening_to_spotify) ids.push("spotify");
    }
    return ids;
  }, [lanyard]);

  useEffect(() => {
    unlock("network-explorer");
    discover("social-web");
    if (lanyard) {
      unlock("signal-seeker");
      discover("social-live");
    }
     
  }, [lanyard?.discord_status]);

  const node = SOCIAL_NODES.find((n) => n.id === picked);

  return (
    <RegionPanelShell regionId="social">
      <div className="space-y-6">
        <motion.div variants={fadeUp}>
          <NeuralWeb nodes={SOCIAL_NODES} liveIds={liveIds} onPick={setPicked} />
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="font-mono text-[10px] text-wx-dim/70 text-center tracking-[0.25em]"
        >
          GLOWING NODES = LIVE SIGNALS · CLICK TO INSPECT
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          {node ? (
            <motion.div
              key={`node-${node.id}`}
              variants={fadeUp}
              exit={{ opacity: 0, transition: SWAP_FADE }}
              className="border border-wx-cyan/25 bg-wx-cyan/[0.03] p-4 clip-panel space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm font-semibold tracking-[0.2em]">
                  {node.platform}
                </span>
                <LiveIndicator
                  state={node.configured ? (node.live ? "live" : "offline") : "unconfigured"}
                  label={node.configured ? undefined : "NOT CONNECTED"}
                />
              </div>
              {node.handle && (
                <div className="font-mono text-[10px] text-foreground/60">@{node.handle}</div>
              )}
              {node.href ? (
                <a
                  href={node.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block font-mono text-[10px] tracking-[0.25em] text-wx-cyan border border-wx-cyan/40 px-3 py-1.5 clip-btn hover:bg-wx-cyan/10 transition-colors"
                >
                  OPEN CHANNEL →
                </a>
              ) : (
                <div className="font-mono text-[10px] text-wx-dim leading-relaxed">
                  INTEGRATION ARCHITECTURE READY — CHANNEL IDENTIFIER NOT
                  CONFIGURED. NOTHING IS FAKED UNTIL IT IS.
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="matrix"
              variants={fadeUp}
              exit={{ opacity: 0, transition: SWAP_FADE }}
              className="border border-white/8 bg-white/[0.015] p-4 clip-panel"
            >
              <SectionTitle>SIGNAL MATRIX</SectionTitle>
              <div className="space-y-2">
                {SOCIAL_NODES.map((n) => (
                  <div key={n.id} className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.2em] text-foreground/60">
                      {n.platform}
                      {n.handle ? <span className="text-wx-dim"> — @{n.handle}</span> : null}
                    </span>
                    <LiveIndicator
                      state={n.configured ? (n.live ? "live" : "offline") : "unconfigured"}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
          <Chip>NO PRIVATE DATA</Chip>
          <Chip>PUBLIC LINKS ONLY</Chip>
          <Chip>ADAPTERS: YT·REDDIT·X·TG — READY</Chip>
        </motion.div>
      </div>
    </RegionPanelShell>
  );
}
