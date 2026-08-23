"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWorld } from "@/lib/world/store";
import { useGame } from "@/lib/game/store";
import { playSound } from "@/lib/audio/sound";
import { SystemLabel } from "@/components/ui/holo/primitives";
import { IDENTITY } from "@/lib/config/identity";

/* ═══════════════════════════════════════════════════════════
   Secret rooms — hidden sectors. Each one is a small, quiet
   atmosphere. Found through terminal commands, patterns,
   and curiosity. Never listed in normal navigation.
   ═══════════════════════════════════════════════════════════ */

function SecretShell({
  id,
  name,
  tagline,
  color,
  children,
  onExited,
}: {
  id: string;
  name: string;
  tagline: string;
  color: string;
  children: React.ReactNode;
  onExited: () => void;
}) {
  useEffect(() => {
    useGame.getState().findSecret(id as never);
    playSound("secret");
  }, [id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex items-center justify-center px-4 scanlines"
      style={{ background: `radial-gradient(ellipse at 50% 40%, ${color}0d, #020208e8 70%)` }}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="relative glass-deep border border-white/10 clip-panel max-w-lg w-full p-5 sm:p-8 max-md:max-h-[88vh] max-md:overflow-y-auto wx-scroll"
      >
        <div
          className="absolute top-0 left-6 right-6 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${color}99, transparent)` }}
        />
        <div className="flex items-start justify-between">
          <div>
            <SystemLabel style={{ color }}>{tagline}</SystemLabel>
            <h2 className="font-sans text-2xl font-bold tracking-[0.3em] mt-2" style={{ color }}>
              {name}
            </h2>
          </div>
          <button
            onClick={() => {
              playSound("close");
              onExited();
            }}
            className="font-mono text-[10px] tracking-[0.2em] text-wx-dim hover:text-white border border-white/12 hover:border-white/30 px-2.5 py-1.5 clip-btn"
          >
            SURFACE
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

/* ── THE VOID — text that exists only near your cursor ──── */
function VoidRoom({ onExited }: { onExited: () => void }) {
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const game = useGame();
  useEffect(() => {
    game.unlockAchievement("void-walker");
     
  }, []);
  const phrases = [
    "there was nothing here first",
    "the world grew around this absence",
    "even maps need margins",
    "you are standing in the margin",
    " prince does not fill every room ",
    "some rooms are the point",
  ];
  return (
    <SecretShell id="void" name="THE VOID" tagline="SECTOR NULL" color="#8b8b9e" onExited={onExited}>
      <div
        className="relative h-64 cursor-crosshair"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setPos({
            x: (e.clientX - r.left) / r.width,
            y: (e.clientY - r.top) / r.height,
          });
        }}
      >
        {phrases.map((p, i) => {
          const px = 0.5 + Math.sin(i * 2.4) * 0.32;
          const py = 0.5 + Math.cos(i * 1.9) * 0.3;
          const d = Math.hypot(pos.x - px, pos.y - py);
          const alpha = Math.max(0, 1 - d * 3.2);
          return (
            <span
              key={i}
              className="absolute font-mono text-[11px] tracking-[0.25em] whitespace-nowrap transition-opacity duration-300"
              style={{
                left: `${px * 100}%`,
                top: `${py * 100}%`,
                opacity: alpha * 0.9,
                color: "#c3c9d8",
                textShadow: `0 0 ${alpha * 20}px rgba(160,170,200,${alpha})`,
              }}
            >
              {p}
            </span>
          );
        })}
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <span className="w-1 h-1 rounded-full bg-white/60" style={{ boxShadow: "0 0 12px #fff" }} />
        </div>
      </div>
      <p className="font-mono text-[10px] text-wx-dim/60 tracking-[0.3em] text-center mt-2">
        MOVE YOUR CURSOR — THE VOID ONLY EXISTS WHERE YOU LOOK
      </p>
    </SecretShell>
  );
}

/* ── ROOT — the privileged layer, the quote ─────────────── */
function RootRoom({ onExited }: { onExited: () => void }) {
  const [depth, setDepth] = useState(0);
  return (
    <SecretShell id="root" name="ROOT" tagline="PRIVILEGED LAYER" color="#ff5470" onExited={onExited}>
      <div className="space-y-4">
        <div className="font-mono text-[10px] leading-relaxed text-foreground/50 space-y-1">
          <div>&gt; uid=0(root) groups=0(root),1000(world)</div>
          <div>&gt; last login: from inside the world</div>
          <div>&gt; cat /root/quote.txt</div>
        </div>
        <motion.blockquote
          initial={{ opacity: 0, letterSpacing: "0.6em" }}
          animate={{ opacity: 1, letterSpacing: "0.18em" }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          className="border-l-2 border-wx-red/60 pl-5 py-2"
        >
          <p className="font-sans text-xl sm:text-2xl font-semibold text-white leading-snug">
            &ldquo;{IDENTITY.influences.quote}&rdquo;
          </p>
          <footer className="mt-3 font-mono text-[10px] tracking-[0.3em] text-wx-dim">
            — FOUND ETCHED AT THE ROOT OF THE WORLD
          </footer>
        </motion.blockquote>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setDepth((d) => d + 1);
              playSound("key");
            }}
            className="font-mono text-[10px] tracking-[0.25em] text-wx-red/80 border border-wx-red/30 px-3 py-1.5 clip-btn hover:bg-wx-red/10"
          >
            DIG DEEPER
          </button>
          {depth > 0 && (
            <span className="font-mono text-[10px] text-wx-dim">
              {["nothing below", "still nothing", "fury all the way down", "you already found it"][Math.min(depth - 1, 3)]}
            </span>
          )}
        </div>
      </div>
    </SecretShell>
  );
}

/* ── AIZEN — the mirror chamber ─────────────────────────── */
function AizenRoom({ onExited }: { onExited: () => void }) {
  const [broken, setBroken] = useState(false);
  const game = useGame();
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  return (
    <SecretShell id="aizen" name="MIRROR CHAMBER" tagline="ILLUSION" color="#b78bff" onExited={onExited}>
      <div className="space-y-5">
        <p className="text-[13px] leading-relaxed text-foreground/70 font-light">
          A chamber of still water. A reflection that blinks a fraction of a
          second after you do. Somewhere, a favorite character taught the world
          a lesson about perception: <span className="text-wx-violet">absolute hypnosis is just perfect presentation.</span>
        </p>
        <div
          className={broken ? "wx-animate-glitch" : ""}
          style={broken ? { filter: "invert(0.9) hue-rotate(40deg)" } : undefined}
        >
          <div
            className="relative h-44 border border-wx-violet/25 bg-gradient-to-b from-[#0b0d18] to-[#151028] overflow-hidden cursor-pointer"
            onPointerDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const id = Date.now();
              setRipples((rp) => [
                ...rp.slice(-4),
                { x: e.clientX - r.left, y: e.clientY - r.top, id },
              ]);
              playSound("hover");
              setTimeout(() => setRipples((rp) => rp.filter((x) => x.id !== id)), 900);
            }}
          >
            {/* "moon" reflection */}
            <div
              className="absolute left-1/2 top-6 -translate-x-1/2 w-14 h-14 rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 30%, #e8e2ff, #8b7bff 55%, #3d3568)",
                boxShadow: "0 0 40px rgba(139,123,255,0.5)",
              }}
            />
            {ripples.map((r) => (
              <span
                key={r.id}
                className="absolute rounded-full border border-wx-violet/50 wx-animate-pulse"
                style={{ left: r.x - 40, top: r.y - 40, width: 80, height: 80 }}
              />
            ))}
            <div className="absolute bottom-3 inset-x-0 text-center font-mono text-[10px] tracking-[0.4em] text-wx-violet/60">
              KYŌKA SUIGETSU — MIRROR FLOWER, WATER MOON
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setBroken((b) => !b);
              playSound("fault");
              if (!broken) game.unlockAchievement("illusion-broken");
            }}
            className="font-mono text-[10px] tracking-[0.25em] text-wx-violet border border-wx-violet/40 px-3 py-1.5 clip-btn hover:bg-wx-violet/10"
          >
            {broken ? "REWEAVE THE ILLUSION" : "TRY TO BREAK IT"}
          </button>
          <span className="font-mono text-[10px] text-wx-dim/70">
            {broken
              ? "you saw through it. the mirror holds a grudge."
              : "everything you see can be a blade if presented correctly"}
          </span>
        </div>
      </div>
    </SecretShell>
  );
}

/* ── ECHO — the reflection well ─────────────────────────── */
function EchoRoom({ onExited }: { onExited: () => void }) {
  const [heard, setHeard] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const echoes = [
    (s: string) => `${s}... ${s}... ${s}?`,
    (s: string) => `${s.toUpperCase()} — WHY DID YOU SAY THAT`,
    (s: string) => `the well keeps "${s}". it adds it to the collection.`,
    () => "you have been here before. or the well has.",
  ];
  return (
    <SecretShell id="echo" name="ECHO" tagline="REFLECTION WELL" color="#55e6ff" onExited={onExited}>
      <div className="space-y-4">
        <div className="min-h-28 max-h-44 overflow-y-auto wx-scroll font-mono text-[11px] space-y-2">
          {heard.map((h, i) => (
            <div key={i} className="text-wx-cyan/60 pl-2 border-l border-wx-cyan/20">
              {h}
            </div>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            const fn = echoes[heard.length % echoes.length];
            setHeard((hs) => [...hs, fn(input)]);
            setInput("");
            playSound("key");
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="say something to the well..."
            className="flex-1 bg-white/[0.03] border border-white/12 px-3 py-2 font-mono text-[10px] outline-none focus:border-wx-cyan/50"
            aria-label="Speak to the echo well"
          />
          <button className="font-mono text-[10px] tracking-[0.2em] border border-wx-cyan/40 text-wx-cyan px-3 clip-btn hover:bg-wx-cyan/10">
            SPEAK
          </button>
        </form>
      </div>
    </SecretShell>
  );
}

/* ── FORGOTTEN — deleted memories ───────────────────────── */
function ForgottenRoom({ onExited }: { onExited: () => void }) {
  return (
    <SecretShell id="forgotten" name="FORGOTTEN" tagline="DELETED MEMORY" color="#c9d6ea" onExited={onExited}>
      <div className="space-y-3 font-mono text-[10.5px] text-foreground/55 leading-relaxed">
        <div className="opacity-40 line-through">draft one of the world — too quiet</div>
        <div className="opacity-40 line-through">a bio page. reverted immediately.</div>
        <div className="opacity-40 line-through">"casual reader" — a tag Prince once used, mostly as a joke</div>
        <div className="opacity-40 line-through">an entire section about sleep schedules. cut for national security.</div>
        <div className="opacity-70">a room that lists deleted rooms. kept. obviously.</div>
        <p className="pt-3 text-foreground/40 border-t border-white/8">
          Every world keeps its landfill. This one chose to memorialize it.
          Nothing here is private — just abandoned.
        </p>
      </div>
    </SecretShell>
  );
}

/* ── WAKE — the deep layer ──────────────────────────────── */
function WakeRoom({ onExited }: { onExited: () => void }) {
  const [stage, setStage] = useState(0);
  const stages = [
    "something stirs below the world",
    "it was never asleep. it was listening.",
    "every visitor wakes it a little more.",
    "it knows the name you typed into terminals.",
    "it forgives you. it wants you to keep exploring.",
    "WAKE COMPLETE. THE WORLD THANKS YOU FOR YOUR ATTENTION.",
  ];
  useEffect(() => {
    if (stage >= stages.length) return;
    const t = setTimeout(() => setStage((s) => s + 1), 1300);
    return () => clearTimeout(t);
  }, [stage, stages.length]);
  return (
    <SecretShell id="wake" name="WAKE" tagline="DEEP LAYER" color="#3ddc97" onExited={onExited}>
      <div className="space-y-3 min-h-40">
        {stages.slice(0, stage).map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-mono text-[11px] tracking-[0.15em] text-wx-green/70"
          >
            <span className="text-wx-dim mr-2">{String(i + 1).padStart(2, "0")}</span>
            {s}
          </motion.div>
        ))}
        {stage < stages.length && (
          <div className="font-mono text-[10px] text-wx-dim wx-animate-pulse">...</div>
        )}
      </div>
    </SecretShell>
  );
}

/* ── UNKNOWN region panel ───────────────────────────────── */
function UnknownRoom({ onExited }: { onExited: () => void }) {
  const game = useGame();
  useEffect(() => {
    game.unlockAchievement("unknown-contact");
    game.visitRegion("unknown");
    game.revealUnknown();
     
  }, []);
  const [resolved, setResolved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const draw = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "rgba(3,3,8,0.22)";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const a = Math.random();
        ctx.fillStyle = `rgba(255,255,255,${a * (resolved ? 0.04 : 0.16)})`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
      if (resolved) {
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 26 + Math.sin(t * 0.002) * 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.5 + Math.sin(t * 0.003) * 0.2})`;
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [resolved]);
  return (
    <SecretShell id="void" name="UNKNOWN SIGNAL" tagline="SOURCE RESOLVED" color="#ffffff" onExited={onExited}>
      <div className="space-y-4">
        <canvas ref={canvasRef} className="w-full h-40 border border-white/10 bg-black/70" />
        <p className="text-[12.5px] leading-relaxed text-foreground/65 font-light">
          {resolved ? (
            <>
              The static resolves into a shape: a simple transmission, repeating.
              <span className="text-white"> &ldquo;thanks for looking this far. most don&apos;t.&rdquo;</span> The
              signal signs itself with a single word — ASCENDING — and goes
              quiet.
            </>
          ) : (
            <>
              The static here has structure. Click into it long enough and it
              might resolve.
            </>
          )}
        </p>
        {!resolved && (
          <button
            onClick={() => {
              setResolved(true);
              playSound("secret");
            }}
            className="font-mono text-[10px] tracking-[0.3em] text-white/70 border border-white/25 px-3 py-1.5 clip-btn hover:bg-white/10"
          >
            RESOLVE SIGNAL
          </button>
        )}
      </div>
    </SecretShell>
  );
}

/* ── router ─────────────────────────────────────────────── */
export function SecretRooms() {
  const activePanel = useWorld((s) => s.activePanel);
  const setActivePanel = useWorld((s) => s.setActivePanel);
  const exit = () => setActivePanel(null);

  return (
    <AnimatePresence>
      {activePanel === "void" && <VoidRoom key="void" onExited={exit} />}
      {activePanel === "root" && <RootRoom key="root" onExited={exit} />}
      {activePanel === "aizen" && <AizenRoom key="aizen" onExited={exit} />}
      {activePanel === "echo" && <EchoRoom key="echo" onExited={exit} />}
      {activePanel === "forgotten" && <ForgottenRoom key="forgotten" onExited={exit} />}
      {activePanel === "wake" && <WakeRoom key="wake" onExited={exit} />}
      {activePanel === "unknown" && <UnknownRoom key="unknown" onExited={exit} />}
    </AnimatePresence>
  );
}
