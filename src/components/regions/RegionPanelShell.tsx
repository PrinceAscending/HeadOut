"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { REGION_MAP } from "@/lib/config/regions";
import { useGame } from "@/lib/game/store";
import { useWorld } from "@/lib/world/store";
import { playSound } from "@/lib/audio/sound";
import { LiveIndicator, SystemLabel } from "@/components/ui/holo/primitives";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { RegionId } from "@/types";

/* ═══════════════════════════════════════════════════════════
   RegionPanel — shared shell for every explorable region.
   Desktop: right-side column. Mobile: full-screen sheet.
   ═══════════════════════════════════════════════════════════ */

export function RegionPanelShell({
  regionId,
  children,
  width = "max-w-lg",
}: {
  regionId: RegionId;
  children: ReactNode;
  width?: string;
}) {
  const activePanel = useWorld((s) => s.activePanel);
  const setActivePanel = useWorld((s) => s.setActivePanel);
  const visitRegion = useGame((s) => s.visitRegion);
  const isMobile = useIsMobile();
  const def = REGION_MAP[regionId];
  const open = activePanel === regionId;
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) {
      visitRegion(regionId);
      playSound("open");
    }

  }, [open, regionId]);

  useEffect(() => {
    if (!open) return;
    /* move focus into the dialog; restore it when the dialog closes */
    const prevFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      prevFocus?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActivePanel(null);
        playSound("close");
        return;
      }
      /* keep Tab cycling inside the modal panel */
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const outside = !panelRef.current.contains(document.activeElement);
        const atEdge = e.shiftKey
          ? document.activeElement === first
          : document.activeElement === last;
        if (outside || atEdge) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setActivePanel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* dim backdrop (click to close) */}
          <motion.div
            key={`bd-${regionId}`}
            className="fixed inset-0 z-[30] bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setActivePanel(null);
              playSound("close");
            }}
            aria-hidden
          />
          <motion.aside
            key={regionId}
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={def.name}
            className={cn(
              "fixed z-[35] glass-deep border-l border-white/10 outline-none",
              "max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:max-h-[86vh] max-md:rounded-t-xl max-md:border-t max-md:border-l-0",
              "md:inset-y-0 md:right-0 md:w-[min(100vw,30rem)]",
              "flex flex-col scanlines overflow-hidden",
              width === "max-w-lg" ? "" : width
            )}
            initial={isMobile ? { y: "100%", opacity: 0.6 } : { x: "100%", opacity: 0.6 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
            exit={isMobile ? { y: "100%", opacity: 0.4 } : { x: "100%", opacity: 0.4 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              /* mobile swipe-down to close */
              if (info.offset.y > 120) {
                setActivePanel(null);
                playSound("close");
              }
            }}
          >
            {/* header */}
            <header className="relative shrink-0 px-5 pt-5 pb-4 border-b border-white/8">
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${def.color}88, transparent)`,
                }}
              />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="font-mono text-[10.5px] px-1.5 py-0.5 border clip-tag shrink-0"
                      style={{
                        color: def.color,
                        borderColor: `${def.color}44`,
                        background: `${def.color}10`,
                      }}
                    >
                      {def.code}
                    </span>
                    <SystemLabel className="truncate">{def.tagline}</SystemLabel>
                  </div>
                  <h2
                    className="font-sans text-xl sm:text-2xl font-semibold tracking-[0.14em] mt-2"
                    style={{ color: def.color }}
                  >
                    {def.name}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setActivePanel(null);
                    playSound("close");
                  }}
                  className="shrink-0 w-10 h-10 grid place-items-center border border-white/15 text-wx-dim hover:text-white hover:border-white/30 transition-colors clip-btn"
                  aria-label="Close panel"
                >
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </button>
              </div>
            </header>

            {/* body */}
            <div className="flex-1 overflow-y-auto wx-scroll px-5 py-5">
              {children}
            </div>

            <footer className="shrink-0 px-5 py-2.5 border-t border-white/8 flex items-center justify-between mb-[env(safe-area-inset-bottom)]">
              <SystemLabel className="text-[10px]">PRINCE // WORLD</SystemLabel>
              <span className="font-mono text-[10px] tracking-[0.2em] text-wx-dim">
                ESC TO EXIT
              </span>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* status strip reused across regions */
export function PanelStatus({
  items,
}: {
  items: { label: string; state: Parameters<typeof LiveIndicator>[0]["state"]; note?: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-wx-dim">
            {i.label}
          </span>
          <LiveIndicator state={i.state} label={i.note} />
        </span>
      ))}
    </div>
  );
}
