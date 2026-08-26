"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IDENTITY } from "@/lib/config/identity";
import { playSound } from "@/lib/audio/sound";

/* ═══════════════════════════════════════════════════════════
   Boot sequence — cinematic, restrained, skippable.
   Canvas particle field + typed system log + ENTER WORLD.
   ═══════════════════════════════════════════════════════════ */

interface Star {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
}

function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let stars: Star[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      const count = canvas.offsetWidth < 640 ? 170 : 380;
      stars = Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * canvas.width,
        y: (Math.random() - 0.5) * canvas.height,
        z: Math.random() * canvas.width * 0.8 + 0.5,
        px: 0,
        py: 0,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.fillStyle = "#04040a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.45;
      const speed = reduced ? 0.15 : 0.9;
      for (const s of stars) {
        s.z -= speed * dpr;
        if (s.z <= 1) {
          s.z = canvas.width * 0.8;
          s.x = (Math.random() - 0.5) * canvas.width;
          s.y = (Math.random() - 0.5) * canvas.height;
        }
        const k = 128 / s.z;
        const px = cx + s.x * k;
        const py = cy + s.y * k;
        if (px > 0 && px < canvas.width && py > 0 && py < canvas.height) {
          const size = Math.max(0.5, (1 - s.z / (canvas.width * 0.8)) * 2.1) * dpr;
          const alpha = 0.32 + (1 - s.z / (canvas.width * 0.8)) * 0.6;
          ctx.fillStyle = `rgba(150, 205, 255, ${alpha})`;
          ctx.fillRect(px, py, size, size);
        }
        s.px = px;
        s.py = py;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-hidden />;
}

/* typed text hook */
function useTyped(text: string, speed = 26, start = true, onDone?: () => void) {
  const [out, setOut] = useState("");
  const doneRef = useRef(false);
  useEffect(() => {
    if (!start) return;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i % 3 === 0) playSound("key");
      if (i >= text.length) {
        clearInterval(t);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }
    }, speed);
    return () => clearInterval(t);
     
  }, [text, speed, start]);
  return { out, done: out.length >= text.length };
}

type SysLine = { label: string; target: "ONLINE" | "CONNECTING"; delay: number };

const SYS_LINES: SysLine[] = [
  { label: "DISCORD", target: "ONLINE", delay: 0 },
  { label: "GITHUB", target: "ONLINE", delay: 240 },
  { label: "CHESS", target: "ONLINE", delay: 420 },
  { label: "SPOTIFY", target: "CONNECTING", delay: 640 },
  { label: "GAMING", target: "CONNECTING", delay: 820 },
];

export function BootSequence({ onEnter }: { onEnter: () => void }) {
  const [phase, setPhase] = useState(0); // 0 logo, 1 sys, 2 identity, 3 enter
  const [skipAll, setSkipAll] = useState(false);
  const [lineStates, setLineStates] = useState<Record<string, "wait" | "done">>({});
  const rootRef = useRef<HTMLDivElement>(null);

  const title = "PRINCE // HEADOUT.OS";
  const sub = "INITIALIZING DIGITAL WORLD...";
  const { out: typedTitle } = useTyped(title, 34, true);
  const { out: typedSub } = useTyped(sub, 20, true);

  const fastForward = useCallback(() => {
    if (phase >= 3) return;
    setSkipAll(true);
    setPhase(3);
    setLineStates(Object.fromEntries(SYS_LINES.map((l) => [l.label, "done"])));
  }, [phase]);

  /* phase progression */
  useEffect(() => {
    if (skipAll) return;
    const t1 = setTimeout(() => setPhase(1), 1400);
    const t3 = setTimeout(() => setPhase(3), 4600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t3);
    };
  }, [skipAll]);

  /* sys line flips */
  useEffect(() => {
    if (skipAll || phase < 1) return;
    SYS_LINES.forEach((l) => {
      setTimeout(() => {
        setLineStates((s) => ({ ...s, [l.label]: "done" }));
        playSound("confirm");
      }, 500 + l.delay);
    });
  }, [phase, skipAll]);

  /* skip on any key */
  useEffect(() => {
    const onKey = () => fastForward();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fastForward]);

  const handleEnter = () => {
    playSound("enter");
    /* white flash transition */
    const flash = document.createElement("div");
    flash.style.cssText =
      "position:fixed;inset:0;background:#dff6ff;z-index:9999;opacity:0;transition:opacity .45s ease;pointer-events:none";
    document.body.appendChild(flash);
    requestAnimationFrame(() => {
      flash.style.opacity = "0.9";
      setTimeout(() => {
        flash.style.opacity = "0";
        setTimeout(() => flash.remove(), 500);
        onEnter();
      }, 320);
    });
  };

  const pad = (label: string) =>
    label + " ".repeat(Math.max(2, 13 - label.length)) + ".".repeat(8);

  return (
    <motion.div
      ref={rootRef}
      className="fixed inset-0 z-[90] bg-[#04040a] overflow-hidden select-none"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("[data-enter]")) fastForward();
      }}
      role="dialog"
      aria-label="System boot sequence"
    >
      <ParticleField />

      {/* center column */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 overflow-y-auto no-scrollbar py-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* logo */}
          <div className="flex items-center gap-3 mb-1">
            <span className="w-2 h-2 bg-wx-cyan wx-animate-pulse" aria-hidden />
            <span className="font-mono text-[10px] tracking-wider-xs text-foreground/70">
              SYS.BOOT — v4.2.0
            </span>
          </div>
          <h1 className="font-sans text-[26px] sm:text-4xl font-bold tracking-[0.08em] text-white text-glow-soft min-h-[1.25em]">
            {typedTitle}
            <span className="wx-animate-blink text-wx-cyan">▌</span>
          </h1>
          <p className="font-mono text-[11.5px] text-foreground/75 tracking-[0.25em] mt-3 h-4">
            {phase >= 0 ? typedSub : ""}
          </p>

          {/* identity detected */}
          <AnimatePresence>
            {phase >= 1 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.5 }}
                className="overflow-hidden"
              >
                <div className="mt-8 font-mono text-[11.5px] sm:text-xs text-wx-cyan tracking-[0.3em]">
                  IDENTITY DETECTED
                </div>
                <div className="mt-2 font-sans text-xl sm:text-2xl font-semibold tracking-[0.35em] text-white">
                  {IDENTITY.name}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {IDENTITY.bootTraits.map((t, i) => (
                    <motion.span
                      key={t}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 * i, duration: 0.4 }}
                      className="font-mono text-[10px] sm:text-[11px] tracking-[0.18em] text-white/90 border border-white/25 bg-white/[0.07] px-2.5 py-1.5 clip-tag"
                    >
                      {t}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* systems connecting */}
          <AnimatePresence>
            {phase >= 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 font-mono text-[11.5px] sm:text-xs leading-[2] text-foreground/80"
                aria-live="polite"
              >
                <div className="tracking-[0.3em] text-foreground/70 mb-1">
                  SYSTEMS CONNECTING...
                </div>
                {SYS_LINES.map((l) => {
                  const done = lineStates[l.label] === "done" || skipAll;
                  return (
                    <div key={l.label} className="flex justify-between max-w-[300px] sm:max-w-[320px]">
                      <span>{pad(l.label)}</span>
                      <span
                        className={
                          done
                            ? "text-wx-green transition-colors duration-500"
                            : "text-wx-amber wx-animate-pulse"
                        }
                      >
                        {done
                          ? l.target === "ONLINE"
                            ? "[ ONLINE ]"
                            : "[ CONNECTING ]"
                          : "[ ... ]"}
                      </span>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* enter button */}
          <AnimatePresence>
            {phase >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="mt-10"
              >
                <button
                  data-enter
                  onClick={handleEnter}
                  className="wx-flash group relative font-mono text-xs sm:text-sm tracking-[0.35em] sm:tracking-[0.4em] text-wx-cyan border-2 border-wx-cyan/45 px-8 sm:px-10 py-4 clip-btn transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wx-cyan/60"
                  aria-label="Enter the world"
                >
                  [ ENTER WORLD ]
                  <span className="absolute inset-0 overflow-hidden pointer-events-none">
                    <span className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[wx-sweep_0.9s_ease]" />
                  </span>
                </button>
                <div className="mt-4 font-mono text-[9.5px] tracking-[0.25em] text-wx-dim">
                  SOUND OPTIONAL · HEADPHONES RECOMMENDED
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* corners */}
      <div className="absolute top-5 left-5 font-mono text-[9.5px] tracking-[0.3em] text-wx-dim z-10">
        EST. 2026
      </div>
      <div className="absolute top-5 right-5 font-mono text-[9.5px] tracking-[0.3em] text-wx-dim z-10">
        NODE // IN-1
      </div>
      <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-5 font-mono text-[9.5px] tracking-[0.3em] text-wx-dim z-10">
        PRESS ANY KEY TO SKIP
      </div>
      <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 font-mono text-[9.5px] tracking-[0.3em] text-wx-dim z-10 hidden sm:block">
        DISCORD · GITHUB · CHESS · SPOTIFY · VALORANT
      </div>

      {/* overlays */}
      <div className="scanlines absolute inset-0 pointer-events-none z-20" />
      <div className="vignette absolute inset-0 pointer-events-none z-20" />
    </motion.div>
  );
}
