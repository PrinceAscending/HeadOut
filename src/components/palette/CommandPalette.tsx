"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command } from "cmdk";
import { useWorld } from "@/lib/world/store";
import { useGame } from "@/lib/game/store";
import { REGIONS } from "@/lib/config/regions";
import { playSound } from "@/lib/audio/sound";

/* ═══════════════════════════════════════════════════════════
   Command Palette — ⌘K / Ctrl+K. Fast travel for operators.
   Exploration still rewards more.
   ═══════════════════════════════════════════════════════════ */

export function CommandPalette() {
  const open = useWorld((s) => s.paletteOpen);
  const setOpen = useWorld((s) => s.setPaletteOpen);
  const unknownRevealed = useGame((s) => s.unknownRevealed);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useWorld.getState().paletteOpen);
        playSound("open");
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  if (typeof window === "undefined") return null;

  const go = (action: () => void) => {
    playSound("confirm");
    setOpen(false);
    action();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-3 sm:px-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.97, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: -8 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg"
          >
            <Command
              loop
              className="glass-deep border border-white/12 clip-panel overflow-hidden"
              label="World command"
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
                <span className="font-mono text-[10px] tracking-[0.3em] text-wx-cyan">
                  WORLD COMMAND
                </span>
                <span className="font-mono text-[10px] text-wx-dim/60 ml-auto">
                  ESC TO CLOSE
                </span>
              </div>
              <Command.List className="max-h-[52vh] sm:max-h-80 overflow-y-auto wx-scroll p-2">
                <Command.Empty className="px-3 py-8 text-center font-mono text-[10px] text-wx-dim tracking-[0.25em]">
                  NO MATCHING REGION
                </Command.Empty>

                <Command.Group
                  heading="REGIONS"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[9.5px] [&_[cmdk-group-heading]]:tracking-[0.3em] [&_[cmdk-group-heading]]:text-wx-dim"
                >
                  {REGIONS.filter((r) => !r.secret || unknownRevealed).map((r) => (
                    <Command.Item
                      key={r.id}
                      value={`${r.name} ${r.id}`}
                      onSelect={() => go(() => useWorld.getState().setActivePanel(r.id))}
                      className="flex items-center gap-3 px-3 py-3 font-mono text-[11.5px] tracking-[0.14em] cursor-pointer data-[selected=true]:bg-white/8 data-[selected=true]:text-white text-foreground/75"
                    >
                      <span style={{ color: r.color }}>{r.code}</span>
                      {r.name}
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
