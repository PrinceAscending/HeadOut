"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/lib/game/store";
import { useWorld } from "@/lib/world/store";
import {
  DISCOVERIES,
  ACHIEVEMENTS,
  TOTAL_REGIONS,
} from "@/lib/game/catalog";
import { AsciiBar, SystemLabel } from "@/components/ui/holo/primitives";
import { playSound } from "@/lib/audio/sound";
import { EASE_EXPO } from "@/lib/world/motion";

/* ═══════════════════════════════════════════════════════════
   Discovery HUD — world progress, always visible, expandable.
   Plus the world's toast notifications (discoveries etc.).
   ═══════════════════════════════════════════════════════════ */

export function WorldToasts() {
  const toasts = useGame((s) => s.toasts);
  // above secret rooms (z-65) and the palette (z-70): achievements
  // earned inside a hidden sector must stay visible
  return (
    <div className="fixed z-[75] top-16 right-3 sm:right-4 flex flex-col gap-2 pointer-events-none max-w-[78vw]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, y: -6, scale: 0.98 }}
            transition={{ duration: 0.45, ease: EASE_EXPO }}
            className="glass-deep border-l-2 px-4 py-3 clip-panel"
            style={{
              borderLeftColor:
                t.kind === "discovery"
                  ? "var(--wx-cyan)"
                  : t.kind === "achievement"
                    ? "var(--wx-amber)"
                    : "var(--wx-violet)",
            }}
            role="status"
          >
            <div className="font-mono text-[10px] tracking-[0.3em] text-wx-dim">
              {t.kind === "discovery"
                ? "DISCOVERY LOGGED"
                : t.kind === "achievement"
                  ? "ACHIEVEMENT UNLOCKED"
                  : "SYSTEM"}
            </div>
            <div className="font-sans text-[13px] font-semibold tracking-[0.12em] mt-1 text-white">
              {t.title.replace(/^(DISCOVERY LOGGED|ACHIEVEMENT — |HIDDEN SECTOR REACHED)\s*/, "")}
            </div>
            {t.body && (
              <div className="font-mono text-[9.5px] text-foreground/55 mt-0.5 tracking-wider">
                {t.body}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function DiscoveryHUD() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const visited = useGame((s) => s.visitedRegions);
  const discoveries = useGame((s) => s.discoveries);
  const achievements = useGame((s) => s.achievements);
  const foundSecrets = useGame((s) => s.foundSecrets);
  const percent = useGame((s) => s.discoveryPercent());
  const setActivePanel = useWorld((s) => s.setActivePanel);

  /* focus management + close on ESC or any pointer outside trigger + panel */
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onDoc = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      /* the command palette sits above this dropdown — let it consume ESC */
      if (useWorld.getState().paletteOpen) return;
      /* capture phase: close only the top surface (this dropdown),
         not an open region panel underneath */
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
  }, [open]);

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: EASE_EXPO }}
          className="fixed right-3 sm:right-4 top-[60px] sm:top-[64px] w-72 max-w-[calc(100vw-1.5rem)] glass-deep border border-white/10 p-4 clip-panel z-50 space-y-4 outline-none"
          role="dialog"
          aria-label="World discovery log"
          tabIndex={-1}
        >
            <div>
              <SystemLabel>REGIONS</SystemLabel>
              <div className="font-sans text-lg font-semibold tabular-nums mt-0.5">
                {visited.length} / {TOTAL_REGIONS}
              </div>
            </div>
            <div>
              <SystemLabel>DISCOVERIES</SystemLabel>
              <div className="font-sans text-lg font-semibold tabular-nums mt-0.5">
                {discoveries.length} / {DISCOVERIES.length}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {DISCOVERIES.map((d) => {
                  const got = discoveries.includes(d.id);
                  return (
                    <span
                      key={d.id}
                      title={got ? d.name : d.hint}
                      className="w-1.5 h-1.5"
                      style={{
                        background: got ? "var(--wx-cyan)" : "rgba(255,255,255,0.12)",
                        boxShadow: got ? "0 0 6px rgba(85,230,255,0.5)" : undefined,
                      }}
                    />
                  );
                })}
              </div>
            </div>
            <div>
              <SystemLabel>ACHIEVEMENTS</SystemLabel>
              <div className="font-sans text-lg font-semibold tabular-nums mt-0.5">
                {achievements.length} / {ACHIEVEMENTS.length}
              </div>
              <div className="mt-2 space-y-1">
                {ACHIEVEMENTS.filter((a) => !a.secret || achievements.includes(a.id)).map(
                  (a) => {
                    const got = achievements.includes(a.id);
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 font-mono text-[9.5px] tracking-wider"
                      >
                        <span style={{ color: got ? "var(--wx-amber)" : "rgba(255,255,255,0.2)" }}>
                          ◆
                        </span>
                        <span className={got ? "text-foreground/75" : "text-wx-dim/50"}>
                          {a.name}
                        </span>
                      </div>
                    );
                  }
                )}
                {!achievements.includes("void-walker") && (
                  <div className="font-mono text-[9.5px] text-wx-dim/40 tracking-wider">
                    ◆ ??????????
                  </div>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-white/8 flex items-center justify-between">
              <SystemLabel>HIDDEN SECTORS: {foundSecrets.length}</SystemLabel>
              <button
                onClick={() => {
                  setOpen(false);
                  /* open sound plays once via the archive panel shell */
                  setActivePanel("archive");
                }}
                className="font-mono text-[10px] text-wx-cyan hover:text-white tracking-[0.2em]"
              >
                FULL LOG →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
  );

  return (
    <div className="relative" ref={triggerRef}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          playSound("click");
        }}
        className="glass h-10 px-2.5 sm:px-3 clip-btn flex items-center gap-2.5 hover:border-wx-cyan/40 transition-colors"
        aria-expanded={open}
        aria-label="World discovery progress"
      >
        <span className="font-mono text-[9.5px] tracking-[0.22em] text-wx-dim hidden sm:inline">
          DISCOVERY
        </span>
        <AsciiBar value={percent} blocks={10} />
      </button>
      {createPortal(panel, document.body)}
    </div>
  );
}
