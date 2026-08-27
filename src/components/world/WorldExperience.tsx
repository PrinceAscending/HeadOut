"use client";

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { BootSequence } from "@/components/boot/BootSequence";
import { CentralCore } from "@/components/regions/CentralCore";
import { CodeCity } from "@/components/regions/CodeCity";
import { MusicDistrict } from "@/components/regions/MusicDistrict";
import { ChessArena } from "@/components/regions/ChessArena";
import { GamingZone } from "@/components/regions/GamingZone";
import { SocialNetwork } from "@/components/regions/SocialNetwork";
import { Archive } from "@/components/regions/Archive";
import { Lab } from "@/components/regions/Lab";
import { Terminal } from "@/components/terminal/Terminal";
import { CommandPalette } from "@/components/palette/CommandPalette";
import { DiscoveryHUD, WorldToasts } from "@/components/discovery/DiscoveryHUD";
import { SecretRooms } from "@/components/secrets/SecretRooms";
import { useWorld, derivePresenceLine, deriveRegionActivity, STATUS_COLOR } from "@/lib/world/store";
import { travelTo } from "@/lib/world/travel";
import { activitySignal } from "@/lib/world/activity-signal";
import { connectLanyard } from "@/lib/integrations/lanyard";
import { useGame } from "@/lib/game/store";
import { IDENTITY } from "@/lib/config/identity";
import { REGIONS } from "@/lib/config/regions";
import { initSoundFromStorage, setSoundEnabled, isSoundEnabled, playSound } from "@/lib/audio/sound";
import { LiveIndicator } from "@/components/ui/holo/primitives";
import { EASE_EXPO, SPRING_HUD, HUD_TIMELINE, HUD_DURATION } from "@/lib/world/motion";

const WorldCanvas = dynamic(() => import("@/components/world/WorldCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <span className="font-mono text-[10px] tracking-[0.4em] text-wx-dim wx-animate-pulse">
        RENDERING WORLD...
      </span>
    </div>
  ),
});

/* ═══════════════════════════════════════════════════════════
   WorldExperience — orchestrator. Boot → world → everything.
   ═══════════════════════════════════════════════════════════ */

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

/* error boundary — keeps the world alive if WebGL dies unexpectedly */
class WebGLBoundary extends React.Component<
  { children: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[world] webgl subsystem failed — switching to atlas mode", err);
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function WorldExperience() {
  const [entered, setEntered] = useState(false);
  const [webglOk, setWebglOk] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [faultVisible, setFaultVisible] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const konamiIdx = useRef(0);
  const lanyardRef = useRef<{ close: () => void } | null>(null);

  const setActivePanel = useWorld((s) => s.setActivePanel);
  const terminalOpen = useWorld((s) => s.terminalOpen);
  const lanyard = useWorld((s) => s.lanyard);
  const health = useWorld((s) => s.health);
  const activePanel = useWorld((s) => s.activePanel);

  /* ── boot → enter ─────────────────────────────────────── */
  /* one-shot post-hydration probes of browser-only state (audio pref,
     WebGL support) — deliberately corrected after mount to avoid SSR mismatch */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    initSoundFromStorage();
    setSoundOn(isSoundEnabled());
    /* webgl capability check */
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") ?? c.getContext("webgl");
      setWebglOk(!!gl);
    } catch {
      setWebglOk(false);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleEnter = useCallback(() => {
    setEntered(true);
    useGame.getState().enterWorld();
  }, []);

  /* ── data orchestration ───────────────────────────────── */
  useEffect(() => {
    if (!entered) return;

    /* lanyard websocket */
    lanyardRef.current = connectLanyard((d) => {
      if (d.discord_status !== "offline") useGame.getState().unlockAchievement("signal-seeker");
    });

    /* github + chess + spotify polling */
    const fetchJson = async (url: string) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error(String(res.status));
        return await res.json();
      } catch {
        return null;
      }
    };

    const syncGithub = async () => {
      const d = await fetchJson("/api/github");
      useWorld.getState().setGithub(d);
      if (d) useGame.getState().pushToast({ kind: "system", title: "CODE CITY SYNCED", body: `${d.public_repos} structures live` });
    };
    const syncChess = async () => {
      const d = await fetchJson("/api/chess");
      useWorld.getState().setChess(d);
    };
    const syncSpotify = async () => {
      const d = await fetchJson("/api/spotify");
      useWorld.getState().setSpotify(d);
    };

    void syncGithub();
    void syncChess();
    void syncSpotify();

    const ghTimer = setInterval(syncGithub, 180_000);
    const chTimer = setInterval(syncChess, 300_000);
    const spTimer = setInterval(syncSpotify, 600_000);

    return () => {
      lanyardRef.current?.close();
      clearInterval(ghTimer);
      clearInterval(chTimer);
      clearInterval(spTimer);
    };
  }, [entered]);

  /* ── mirror lanyard → activity signal (for the canvas) ── */
  useEffect(() => {
    const act = deriveRegionActivity(lanyard);
    (Object.keys(act) as (keyof typeof act)[]).forEach((k) => {
      (activitySignal as any)[k] = act[k];
    });
    activitySignal.unknownRevealed = useGame.getState().unknownRevealed;
  }, [lanyard]);

  /* welcome toast */
  useEffect(() => {
    if (!entered) return;
    const t1 = setTimeout(() => {
      useGame.getState().pushToast({
        kind: "system",
        title: "WORLD LINK ESTABLISHED",
        body: `${REGIONS.length} regions detected · live signals online`,
      });
    }, 1200);
    const t2 = setTimeout(() => {
      useGame.getState().pushToast({
        kind: "system",
        title: "TIP",
        body: "Click nodes to travel. Press ` for terminal. ⌘K for commands.",
      });
    }, 6000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [entered]);

  /* ── keyboard: konami, terminal, void ─────────────────── */
  useEffect(() => {
    if (!entered) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";

      /* konami */
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === KONAMI[konamiIdx.current]) {
        konamiIdx.current += 1;
        if (konamiIdx.current === KONAMI.length) {
          konamiIdx.current = 0;
          const g = useGame.getState();
          g.markKonami();
          playSound("secret");
          g.pushToast({
            kind: "system",
            title: "SIGNAL PATTERN ACCEPTED",
            body: "A new region surfaced at the far edge of the map",
          });
        }
      } else {
        konamiIdx.current = key === KONAMI[0] ? 1 : 0;
      }

      if (typing) return;

      /* ` toggles terminal */
      if (e.key === "`") {
        e.preventDefault();
        const w = useWorld.getState();
        w.setTerminalOpen(!w.terminalOpen);
        playSound("open");
      }
      /* Shift+V — void */
      if (e.key.toUpperCase() === "V" && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        setActivePanel("void");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, setActivePanel]);

  /* ── the fault portal (rare, clickable) ───────────────── */
  useEffect(() => {
    if (!entered) return;
    const delay = 50_000 + Math.random() * 50_000;
    const t = setTimeout(() => {
      if (Math.random() < 0.55 && !useGame.getState().faultPortalUsed) {
        setFaultVisible(true);
        playSound("fault");
        setTimeout(() => setFaultVisible(false), 12_000);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [entered]);

  /* listen for context loss from the canvas */
  useEffect(() => {
    if (!entered) return;
    const onLost = () => setWebglOk(false);
    window.addEventListener("wx-webgl-lost", onLost);
    return () => window.removeEventListener("wx-webgl-lost", onLost);
  }, [entered]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playSound("confirm");
  };

  const logoClick = () => {
    const n = useGame.getState().bumpLogoClicks();
    playSound("click");
    if (n === 7) {
      setGlitch(true);
      playSound("fault");
      useGame.getState().pushToast({
        kind: "system",
        title: "SEVEN PRESSURES APPLIED",
        body: "The logo acknowledges persistence. Nothing else happens. Or does it?",
      });
      setTimeout(() => setGlitch(false), 1200);
    }
  };

  const gotoRegion = (id: string) => {
    /* programmatic travel (terminal `goto`, atlas fallback) — never
       toggles a surface closed behind the caller's back */
    travelTo(id, { toggle: false });
  };

  const presenceLine = derivePresenceLine(lanyard);
  const status = lanyard?.discord_status ?? "offline";
  const avatarHash = lanyard?.discord_user?.avatar;

  return (
    <MotionConfig reducedMotion="user">
    <div className="fixed inset-0 overflow-hidden bg-[#04040a]">
      {/* ── boot ── */}
      <AnimatePresence>{!entered && <BootSequence key="boot" onEnter={handleEnter} />}</AnimatePresence>

      {/* ── the world ── */}
      {entered && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: HUD_TIMELINE.world, ease: EASE_EXPO }}
        >
          {webglOk ? (
            <WebGLBoundary onFail={() => setWebglOk(false)}>
              <WorldCanvas
                onSelect={(id) => {
                  if (id === "unknown") {
                    const g = useGame.getState();
                    g.revealUnknown();
                    setActivePanel("unknown");
                  } else {
                    travelTo(id);
                  }
                }}
              />
            </WebGLBoundary>
          ) : (
            <AtlasFallback onGoto={gotoRegion} />
          )}

          {/* overlays: grain + vignette */}
          <div className="grain absolute inset-0 overflow-hidden pointer-events-none z-[5]" />
          <div className="vignette absolute inset-0 pointer-events-none z-[5]" />

          {/* ── HUD top bar ── */}
          <motion.header
            className="absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 sm:py-3 pointer-events-none"
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: HUD_TIMELINE.header, duration: HUD_DURATION, ease: EASE_EXPO }}
          >
            <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto min-w-0">
              <button
                onClick={logoClick}
                className={`font-sans font-bold tracking-[0.14em] sm:tracking-[0.18em] text-white text-[12.5px] sm:text-base text-left shrink-0 ${glitch ? "wx-animate-glitch" : ""}`}
                aria-label="PRINCE HEADOUT — home"
              >
                PRINCE <span className="text-wx-cyan">{"//"}</span> HEADOUT
              </button>
              <div className="hidden lg:flex items-center gap-4 font-mono text-[9.5px] tracking-[0.2em]">
                <LiveIndicator state={health.discord.state} label="DISCORD" />
                <LiveIndicator state={health.github.state} label="GITHUB" />
                <LiveIndicator state={health.chess.state} label="CHESS" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
              <button
                onClick={toggleSound}
                className="w-10 h-10 grid place-items-center glass clip-btn hover:border-wx-cyan/40 transition-colors"
                aria-label={soundOn ? "Mute sound" : "Enable sound"}
                aria-pressed={soundOn}
              >
                <span className="font-mono text-[12px]" style={{ color: soundOn ? "var(--wx-cyan)" : "var(--wx-dim)" }}>
                  {soundOn ? "◉" : "○"}
                </span>
              </button>
              <button
                onClick={() => useWorld.getState().setPaletteOpen(true)}
                className="hidden sm:flex h-10 items-center gap-2 glass clip-btn hover:border-wx-cyan/40 transition-colors font-mono text-[9.5px] tracking-[0.2em] text-wx-dim px-3"
                aria-label="Open command palette"
              >
                COMMAND ⌘K
              </button>
              <DiscoveryHUD />
            </div>
          </motion.header>

          {/* ── presence card (above dock on mobile, bottom-left on desktop) ── */}
          <motion.div
            className="absolute left-3 sm:left-5 z-20 pointer-events-auto max-w-[calc(100vw-1.5rem)] max-md:bottom-[calc(max(0.625rem,env(safe-area-inset-bottom))+76px)] md:bottom-5"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: HUD_TIMELINE.presence, duration: HUD_DURATION, ease: EASE_EXPO }}
          >
            <motion.button
              onClick={() => {
                /* shell plays "open" on a fresh open — give repeat
                   taps on the already-active region their own cue */
                if (useWorld.getState().activePanel === "core") playSound("click");
                setActivePanel("core");
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={SPRING_HUD}
              className="glass clip-panel edge-lit px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3 text-left hover:border-wx-cyan/40 transition-colors"
              aria-label="Open Central Core — current presence"
            >
              {avatarHash ? (
                 
                <img
                  src={`https://cdn.discordapp.com/avatars/${IDENTITY.accounts.discord.id}/${avatarHash}.png?size=64`}
                  alt=""
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/20 shrink-0"
                />
              ) : (
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/15 grid place-items-center font-mono text-[10px] text-wx-dim shrink-0">
                  P
                </span>
              )}
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: STATUS_COLOR[status],
                      boxShadow: `0 0 8px ${STATUS_COLOR[status]}`,
                    }}
                  />
                  <span className="font-sans text-[13px] font-semibold tracking-[0.14em] text-white truncate">
                    {IDENTITY.name}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.2em] text-wx-dim shrink-0 hidden sm:inline">
                    {status.toUpperCase()}
                  </span>
                </span>
                <span className="block font-mono text-[9.5px] sm:text-[10px] text-wx-dim tracking-[0.14em] truncate mt-0.5 max-w-[58vw] sm:max-w-[220px]">
                  {presenceLine}
                </span>
              </span>
            </motion.button>
          </motion.div>

          {/* ── region dock (bottom-center) ── */}
          <motion.nav
            className="absolute bottom-[max(0.625rem,env(safe-area-inset-bottom))] sm:bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: HUD_TIMELINE.dock, duration: HUD_DURATION, ease: EASE_EXPO }}
            aria-label="Quick travel"
          >
            <div className="relative max-w-[calc(100vw-1.5rem)]">
              {/* layoutScroll: keep layoutId projections fresh while this scroller moves */}
              <motion.div
                layoutScroll
                className="glass clip-btn px-1.5 py-1.5 sm:px-2 sm:py-2 flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar"
              >
              {REGIONS.filter((r) => !r.hidden).map((r) => {
                const isCurrent =
                  activePanel === r.id || (r.id === "terminal" && terminalOpen);
                return (
                <motion.button
                  key={r.id}
                  onClick={() => {
                    if (isCurrent) playSound("click");
                    travelTo(r.id);
                  }}
                  whileTap={{ scale: 0.9 }}
                  transition={SPRING_HUD}
                  className="group relative w-11 h-11 grid place-items-center shrink-0"
                  title={r.name}
                  aria-label={`Travel to ${r.name}`}
                  aria-pressed={r.id === "terminal" ? terminalOpen : undefined}
                >
                  {/* hover aura — region-colored, compositor-only */}
                  <span
                    aria-hidden
                    className="absolute inset-1 clip-btn opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                    style={{
                      background: `radial-gradient(circle at 50% 55%, ${r.color}26, transparent 70%)`,
                      boxShadow: `inset 0 0 14px ${r.color}1f`,
                    }}
                  />
                  <span
                    className="relative font-mono text-[11px] tracking-wider transition-all duration-200 group-hover:scale-110 group-hover:text-white"
                    style={{ color: isCurrent ? "#fff" : r.color, textShadow: isCurrent ? `0 0 12px ${r.color}aa` : undefined }}
                  >
                    {r.code}
                  </span>
                  {isCurrent && (
                    <motion.span
                      layoutId="dock-underline"
                      transition={SPRING_HUD}
                      className="absolute bottom-0.5 h-[2px] w-[18px]"
                      style={{
                        background: r.color,
                        boxShadow: `0 0 8px ${r.color}`,
                      }}
                    />
                  )}
                </motion.button>
                );
              })}
              <span className="w-px h-6 bg-white/10 mx-0.5 sm:mx-1 shrink-0" />
              <button
                onClick={() => {
                  const w = useWorld.getState();
                  w.setTerminalOpen(!w.terminalOpen);
                  playSound("open");
                }}
                className={`w-11 h-11 grid place-items-center shrink-0 font-mono text-[14px] transition-colors ${terminalOpen ? "text-wx-cyan" : "text-wx-dim hover:text-wx-cyan"}`}
                title="Terminal (`)"
                aria-label="Toggle terminal"
                aria-pressed={terminalOpen}
              >
                &gt;_
              </button>
              </motion.div>
              {/* edge fades — hint that the dock scrolls on narrow screens */}
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#0a0e16] to-transparent md:hidden" />
              <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#0a0e16] to-transparent md:hidden" />
            </div>
          </motion.nav>

          {/* ── coordinates (bottom-right) ── */}
          <motion.div
            className="absolute bottom-5 right-5 z-20 hidden lg:block pointer-events-none font-mono text-[9.5px] tracking-[0.3em] text-wx-dim/80 text-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: HUD_TIMELINE.coords, duration: HUD_DURATION, ease: EASE_EXPO }}
          >
            <div>NODE // IN-1 · SECTOR 7G</div>
            <div className="mt-1">DRAG TO ORBIT · SCROLL TO ZOOM · CLICK NODE TO TRAVEL</div>
          </motion.div>

          {/* ── fault portal ── */}
          <AnimatePresence>
            {faultVisible && (
              <motion.button
                initial={{ opacity: 0, y: -14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.45, ease: EASE_EXPO }}
                className="absolute top-20 left-1/2 -translate-x-1/2 z-30 border border-wx-red/50 bg-wx-red/10 backdrop-blur px-4 py-2 font-mono text-[10px] tracking-[0.3em] text-wx-red clip-btn hover:border-wx-red hover:bg-wx-red/20 transition-colors overflow-hidden"
                onClick={() => {
                  setFaultVisible(false);
                  useGame.getState().markFaultPortal();
                  useGame.getState().bumpEchoSignals();
                  setActivePanel("echo");
                  playSound("secret");
                }}
              >
                <span className="wx-animate-glitch relative z-10">⚠ SIGNAL FAULT — CLICK TO TRACE</span>
                {/* scan sweep */}
                <span
                  aria-hidden
                  className="absolute left-0 right-0 h-px bg-wx-red/70"
                  style={{ animation: "wx-scan-y 1.6s linear infinite" }}
                />
              </motion.button>
            )}
          </AnimatePresence>

          {/* ── panels & systems ── */}
          <CentralCore />
          <CodeCity />
          <MusicDistrict />
          <ChessArena />
          <GamingZone />
          <SocialNetwork />
          <Archive />
          <Lab />
          <SecretRooms />
          <Terminal
            onGoto={gotoRegion}
            onSecret={(id) => setActivePanel(id)}
          />
          <CommandPalette />
          <WorldToasts />
        </motion.div>
      )}
    </div>
    </MotionConfig>
  );
}

/* accessible no-WebGL fallback — compact & touch-friendly */
function AtlasFallback({ onGoto }: { onGoto: (id: string) => void }) {
  return (
    <div className="absolute inset-0 overflow-y-auto wx-scroll grid place-items-center p-4 pt-24 pb-32">
      <div className="max-w-sm sm:max-w-md w-full glass-deep border border-white/10 clip-panel p-5 sm:p-6">
        <div className="font-mono text-[10px] tracking-[0.3em] text-wx-dim">
          ATLAS MODE — WEBGL UNAVAILABLE
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {REGIONS.filter((r) => !r.secret || useGame.getState().unknownRevealed).map((r) => (
            <button
              key={r.id}
              onClick={() => onGoto(r.id)}
              className="text-left border border-white/15 hover:border-white/40 active:bg-white/10 px-3 py-3 min-h-[60px] clip-btn transition-colors"
            >
              <span className="font-mono text-[11px]" style={{ color: r.color }}>
                {r.code}
              </span>
              <span className="block font-sans text-[11.5px] sm:text-[12.5px] tracking-[0.1em] mt-1 text-foreground/85">
                {r.name}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-4 font-mono text-[9.5px] text-wx-dim leading-relaxed">
          The 3D world requires WebGL. Everything remains explorable in atlas
          mode — no region is locked behind graphics.
        </p>
      </div>
    </div>
  );
}
