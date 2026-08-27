"use client";

import { useWorld } from "./store";
import { useGame } from "@/lib/game/store";
import { playSound } from "@/lib/audio/sound";

/* ═══════════════════════════════════════════════════════════
   Travel router — the single funnel for every "go somewhere"
   intent in the world: dock, map nodes, palette, `goto`, HUD.

   The TERMINAL region is an overlay, not a panel. Routing it
   through here means it can never go dead again — every entry
   point lands in the same place.
   ═══════════════════════════════════════════════════════════ */

export interface TravelOpts {
  /**
   * true → clicking TERMINAL again closes it (matches the dock
   * `>_` icon button). false → always opens (programmatic travel:
   * palette, `goto`). Default: true.
   */
  toggle?: boolean;
}

export function travelTo(id: string, opts: TravelOpts = {}) {
  if (id === "terminal") {
    const w = useWorld.getState();
    const open = opts.toggle === false ? true : !w.terminalOpen;
    w.setTerminalOpen(open);
    /* the region counts as explored through any route */
    useGame.getState().visitRegion("terminal");
    playSound("open");
    return;
  }
  useWorld.getState().setActivePanel(id);
}
