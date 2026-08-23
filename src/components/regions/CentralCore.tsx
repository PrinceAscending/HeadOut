"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RegionPanelShell } from "./RegionPanelShell";
import { Oracle } from "./Oracle";
import { IDENTITY } from "@/lib/config/identity";
import { useGame } from "@/lib/game/store";
import { useWorld, derivePresenceLine, STATUS_COLOR } from "@/lib/world/store";
import { playSound } from "@/lib/audio/sound";
import { DataRow, LiveIndicator, SectionTitle } from "@/components/ui/holo/primitives";

/* ═══════════════════════════════════════════════════════════
   Central Core — Prince. A holographic identity sphere you
   interrogate, not a bio you read. Traits reveal on scan.
   ═══════════════════════════════════════════════════════════ */

function CoreOrb({ online }: { online: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holdRef = useRef<HTMLDivElement>(null);
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discover = useGame((s) => s.discover);
  const bumpCoreHolds = useGame((s) => s.bumpCoreHolds);

  useEffect(() => {
    const canvas = canvasRef.current;
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

    const rings = Array.from({ length: 3 }, (_, i) => ({
      r: 0,
      speed: 0.35 + i * 0.22,
      off: Math.random() * Math.PI * 2,
      width: 1 - i * 0.25,
    }));
    const motes = Array.from({ length: 26 }, () => ({
      a: Math.random() * Math.PI * 2,
      r: 0.55 + Math.random() * 0.42,
      s: 0.15 + Math.random() * 0.5,
      size: 0.6 + Math.random() * 1.6,
    }));

    const draw = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.3;
      ctx.clearRect(0, 0, w, h);

      /* core glow */
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.9);
      const alpha = online ? 0.5 : 0.28;
      grad.addColorStop(0, `rgba(120, 235, 255, ${alpha})`);
      grad.addColorStop(0.45, `rgba(85, 200, 255, ${alpha * 0.35})`);
      grad.addColorStop(1, "rgba(85, 200, 255, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      /* nucleus */
      const pulse = 1 + Math.sin(t * (online ? 2.2 : 0.9)) * 0.06;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.42 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(160, 240, 255, ${online ? 0.95 : 0.6})`;
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.3 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(120, 225, 255, 0.12)";
      ctx.fill();

      /* orbit rings */
      rings.forEach((ring, i) => {
        const rr = R * (0.85 + i * 0.32) + Math.sin(t * ring.speed + ring.off) * 4 * dpr;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rr, rr * 0.36, t * 0.12 + i * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(140, 210, 255, ${0.28 * ring.width})`;
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      });

      /* orbiting motes */
      for (const m of motes) {
        const a = m.a + t * m.s * 0.5;
        const x = cx + Math.cos(a) * R * m.r;
        const y = cy + Math.sin(a) * R * m.r * 0.42;
        ctx.beginPath();
        ctx.arc(x, y, m.size * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(170, 235, 255, ${0.25 + Math.sin(a) * 0.2 + 0.2})`;
        ctx.fill();
      }

      /* scanline sweep */
      if (!reduced) {
        const sy = cy + Math.sin(t * 0.8) * R * 1.4;
        ctx.fillStyle = "rgba(150, 230, 255, 0.05)";
        ctx.fillRect(cx - R * 1.6, sy, R * 3.2, 2 * dpr);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [online]);

  /* hold interaction — core memory easter egg */
  const startHold = () => {
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      playSound("secret");
      discover("core-depth");
      bumpCoreHolds();
    }, 2600);
  };
  const endHold = () => {
    setHolding(false);
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  return (
    <div
      ref={holdRef}
      className="relative w-full aspect-square max-w-[300px] mx-auto touch-none"
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      role="img"
      aria-label="Holographic identity core — press and hold to scan for core memory"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {holding && (
        <div className="absolute inset-x-4 bottom-2 text-center font-mono text-[10px] tracking-[0.3em] text-wx-cyan/80 wx-animate-pulse">
          DEEP SCAN...
        </div>
      )}
    </div>
  );
}

function TraitNode({
  index,
  label,
  description,
}: {
  index: number;
  label: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const discover = useGame((s) => s.discover);
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.12 }}
      onClick={() => {
        setOpen((o) => !o);
        playSound("click");
        discover(`core-trait-${index + 1}`);
      }}
      className="w-full text-left border border-white/10 hover:border-wx-cyan/40 bg-white/[0.02] hover:bg-wx-cyan/[0.04] px-4 py-3 clip-panel transition-colors group"
      aria-expanded={open}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.3em] text-foreground/85 group-hover:text-wx-cyan transition-colors">
          {label}
        </span>
        <span className="font-mono text-[10px] text-wx-dim group-hover:text-wx-cyan transition-colors">
          {open ? "[ COLLAPSE ]" : "[ SCAN ]"}
        </span>
      </div>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        className="overflow-hidden"
      >
        <p className="pt-3 text-[12.5px] leading-relaxed text-foreground/65 font-light">
          {description}
        </p>
      </motion.div>
    </motion.button>
  );
}

export function CentralCore() {
  const lanyard = useWorld((s) => s.lanyard);
  const health = useWorld((s) => s.health.discord);
  const presenceLine = derivePresenceLine(lanyard);
  const status = lanyard?.discord_status ?? "offline";
  const discordName =
    lanyard?.discord_user?.global_name ?? lanyard?.discord_user?.username ?? IDENTITY.handle;
  const avatarHash = lanyard?.discord_user?.avatar;
  const avatarUrl = avatarHash
    ? `https://cdn.discordapp.com/avatars/${IDENTITY.accounts.discord.id}/${avatarHash}.png?size=96`
    : null;

  const devices: string[] = [];
  if (lanyard?.active_on_discord_desktop) devices.push("DESKTOP");
  if (lanyard?.active_on_discord_mobile) devices.push("MOBILE");
  if (lanyard?.active_on_discord_web) devices.push("WEB");

  return (
    <RegionPanelShell regionId="core">
      <div className="space-y-6">
        <CoreOrb online={status !== "offline" && !!lanyard} />

        <div className="text-center">
          <div className="font-sans text-3xl font-bold tracking-[0.3em] text-white text-glow-soft">
            {IDENTITY.name}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full wx-animate-pulse"
              style={{ background: STATUS_COLOR[status], boxShadow: `0 0 10px ${STATUS_COLOR[status]}` }}
            />
            <span className="font-mono text-[10px] tracking-[0.25em] text-wx-dim">
              {presenceLine}
            </span>
          </div>
          <div className="mt-2">
            <LiveIndicator state={health.state} />
          </div>
        </div>

        {avatarUrl && (
          <div className="flex justify-center">
            { }
            <img
              src={avatarUrl}
              alt="Discord avatar"
              className="w-14 h-14 rounded-full border border-wx-cyan/30"
              style={{ boxShadow: "0 0 24px rgba(85,230,255,0.25)" }}
            />
          </div>
        )}

        <div>
          <SectionTitle>IDENTITY MATRIX</SectionTitle>
          <div className="space-y-2">
            {IDENTITY.traits.map((t, i) => (
              <TraitNode key={t.id} index={i} label={t.label} description={t.description} />
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>SIGNAL REGISTRY</SectionTitle>
          <div className="space-y-2.5">
            <DataRow k="IDENTITY" v="PRINCE — @PrinceAscending" />
            <DataRow k="DISCORD" v={discordName} color={STATUS_COLOR[status]} />
            <DataRow
              k="DEVICES"
              v={devices.length ? devices.join(" · ") : "NO ACTIVE DEVICES"}
            />
            <DataRow k="SIGNAL" v={status.toUpperCase()} color={STATUS_COLOR[status]} />
            <DataRow
              k="STATUS"
              v={lanyard?.activities.find((a) => a.type === 4)?.state ?? "—"}
            />
          </div>
        </div>

        <p className="font-mono text-[10px] leading-relaxed tracking-wider text-wx-dim/80 border-l border-wx-cyan/25 pl-3">
          THIS CORE BRIGHTENS WITH LIVE PRESENCE. IF IT GLOWS, PRINCE IS SOMEWHERE
          IN THE SYSTEM RIGHT NOW.
        </p>

        <Oracle />
      </div>
    </RegionPanelShell>
  );
}
