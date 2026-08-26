"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RegionPanelShell } from "./RegionPanelShell";
import { GAMING_PLATFORMS, IDENTITY } from "@/lib/config/identity";
import { useWorld, derivePresenceLine } from "@/lib/world/store";
import { useGame } from "@/lib/game/store";
import { playSound } from "@/lib/audio/sound";
import { Chip, LiveIndicator, SectionTitle, SystemLabel } from "@/components/ui/holo/primitives";
import { EASE_EXPO, fadeUp } from "@/lib/world/motion";

/* ═══════════════════════════════════════════════════════════
   Gaming Zone — underground arena. Live activity only via
   Discord presence. No fabricated stats. Adapter-ready.
   ═══════════════════════════════════════════════════════════ */

/* short shared fade for conditional state swaps */
const SWAP_FADE = { duration: 0.2, ease: EASE_EXPO };

/* subtle animated arena backdrop — tactical grid + smoke */
function ArenaBackdrop({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
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
      /* perspective floor */
      const hz = h * 0.42;
      ctx.strokeStyle = active ? "rgba(255,84,112,0.28)" : "rgba(140,160,200,0.12)";
      ctx.lineWidth = 1;
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + i * 26 * dpr, hz);
        ctx.lineTo(w / 2 + i * 130 * dpr, h);
        ctx.stroke();
      }
      for (let i = 1; i <= 7; i++) {
        const y = hz + Math.pow(i / 7, 1.7) * (h - hz);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.globalAlpha = 0.6 - i * 0.06;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      /* scan sweep when active */
      if (active) {
        const sy = hz + ((t * 40) % (h - hz));
        const g = ctx.createLinearGradient(0, sy - 14, 0, sy);
        g.addColorStop(0, "rgba(255,84,112,0)");
        g.addColorStop(1, "rgba(255,84,112,0.22)");
        ctx.fillStyle = g;
        ctx.fillRect(0, sy - 14, w, 14);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active]);
  return <canvas ref={ref} className="w-full h-40 border border-white/8 bg-black/50" aria-hidden />;
}

function ValorantArena() {
  const lanyard = useWorld((s) => s.lanyard);
  const discover = useGame((s) => s.discover);
  const inGame = !!lanyard?.activities.find(
    (a) => a.type === 0 && a.name?.toLowerCase().includes("valorant")
  );
  const elapsed = lanyard?.activities.find((a) => a.name?.toLowerCase().includes("valorant"))
    ?.timestamps?.start;

  useEffect(() => {
    /* callsign is visible the moment the arena opens */
    discover("gaming-tag");
    if (inGame) discover("gaming-live");
     
  }, [inGame]);

  const mins = elapsed ? Math.floor((Date.now() - elapsed) / 60000) : 0;

  return (
    <motion.div
      variants={fadeUp}
      className="relative border border-wx-red/25 bg-wx-red/[0.02] p-4 clip-panel overflow-hidden"
    >
      <ArenaBackdrop active={inGame} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <SystemLabel className="text-wx-red/90">PRIMARY ARENA</SystemLabel>
            <div className="font-sans text-2xl font-bold tracking-[0.14em] text-white mt-1">
              VALORANT
            </div>
          </div>
          <LiveIndicator
            state={inGame ? "live" : "offline"}
            label={inGame ? "IN MATCH" : "ARENA SILENT"}
          />
        </div>

        <div className="mt-3 font-mono text-[10px] text-foreground/60 tracking-[0.2em]">
          IDENTITY — <span className="text-wx-red">{IDENTITY.accounts.riot.id}</span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {inGame ? (
            <motion.div
              key="live"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SWAP_FADE}
              className="mt-3 border-l-2 border-wx-red pl-3 py-1"
            >
              <div className="font-mono text-[10px] text-wx-red tracking-[0.2em] wx-animate-pulse">
                ● LIVE MATCH IN PROGRESS
              </div>
              <div className="font-mono text-[10px] text-foreground/50 mt-1">
                {mins > 0 ? `SESSION ~${mins} MIN` : "SESSION JUST BEGAN"}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="silent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SWAP_FADE}
              className="mt-3 font-mono text-[10px] text-wx-dim leading-relaxed"
            >
              NO LIVE MATCH. RANK DATA REQUIRES RIOT-API AUTH, WHICH IS NOT
              ACTIVE ON THIS NODE — NO STATS ARE FAKED. THE ARENA LIGHTS UP
              THE MOMENT PRESENCE SAYS &ldquo;IN GAME&rdquo;.
            </motion.div>
          )}
        </AnimatePresence>

        {/* hidden clutch protocol */}
        <button
          onClick={() => {
            playSound("secret");
            discover("gaming-clutch");
          }}
          className="absolute bottom-0 right-0 font-mono text-[9.5px] text-transparent hover:text-wx-red/60 transition-colors tracking-[0.5em]"
          aria-label="Scratched into the arena floor"
        >
          CLUTCH
        </button>
      </div>
    </motion.div>
  );
}

export function GamingZone() {
  const lanyard = useWorld((s) => s.lanyard);
  const presenceLine = derivePresenceLine(lanyard);

  return (
    <RegionPanelShell regionId="gaming">
      <div className="space-y-6">
        <ValorantArena />

        <motion.div variants={fadeUp}>
          <SectionTitle>SUPPORTING PLATFORMS</SectionTitle>
          <div className="space-y-2">
            {GAMING_PLATFORMS.filter((p) => p.id !== "valorant").map((p) => (
              <div
                key={p.id}
                className="border border-white/8 bg-white/[0.015] px-4 py-3 clip-panel flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-mono text-[11px] tracking-[0.25em] text-foreground/80">
                    {p.platform}
                  </div>
                  <div className="font-mono text-[10px] text-wx-dim mt-1">{p.tagline}</div>
                  <div className="font-mono text-[10px] text-wx-dim/70 mt-0.5">{p.note}</div>
                </div>
                <LiveIndicator state={p.status === "adapter-ready" ? "unconfigured" : "offline"} />
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <SectionTitle>PRESENCE RELAY</SectionTitle>
          <div className="font-mono text-[10px] text-foreground/60 border-l border-wx-red/30 pl-3 py-1 tracking-wider">
            {presenceLine}
          </div>
          <p className="mt-3 text-[11px] text-foreground/45 leading-relaxed font-light">
            When Prince launches a game that Discord can see, this zone activates
            across the whole world map — not just inside this panel. Watch the
            GAMING node burn red.
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
          <Chip color="#ff5470">ADAPTER: RIOT — STANDBY</Chip>
          <Chip>NO FABRICATED STATS</Chip>
          <Chip>PRESENCE-DRIVEN</Chip>
        </motion.div>
      </div>
    </RegionPanelShell>
  );
}
