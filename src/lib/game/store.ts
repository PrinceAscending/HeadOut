"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DISCOVERY_MAP,
  ACHIEVEMENT_MAP,
  TOTAL_DISCOVERIES,
  TOTAL_ACHIEVEMENTS,
  TOTAL_REGIONS,
} from "./catalog";
import type { RegionId, SecretId } from "@/types";

/* ═══════════════════════════════════════════════════════════
   Discovery store — visitor progress, persisted locally.
   Never sent anywhere. Purely local exploration memory.
   ═══════════════════════════════════════════════════════════ */

export interface ToastEvent {
  id: number;
  kind: "discovery" | "achievement" | "system";
  title: string;
  body?: string;
}

interface GameState {
  /* progress */
  visitedRegions: RegionId[];
  foundSecrets: SecretId[];
  discoveries: string[];
  achievements: string[];
  commandsDiscovered: string[];
  /* counters used by easter eggs */
  logoClicks: number;
  coreHolds: number;
  echoSignals: number;
  /* session */
  enteredAt: number | null;
  toasts: ToastEvent[];
  /* pure markers */
  konamiDetected: boolean;
  faultPortalUsed: boolean;
  unknownRevealed: boolean;

  /* actions */
  enterWorld: () => void;
  visitRegion: (id: RegionId) => void;
  findSecret: (id: SecretId) => void;
  discover: (id: string) => boolean;
  unlockAchievement: (id: string) => boolean;
  recordCommand: (cmd: string) => void;
  bumpLogoClicks: () => number;
  bumpCoreHolds: () => number;
  bumpEchoSignals: () => number;
  markKonami: () => void;
  markFaultPortal: () => void;
  revealUnknown: () => void;
  pushToast: (t: Omit<ToastEvent, "id">) => void;
  dismissToast: (id: number) => void;
  resetAll: () => void;

  /* derived */
  discoveryPercent: () => number;
  exploredRegions: () => number;
}

let toastSeq = 1;

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      visitedRegions: [],
      foundSecrets: [],
      discoveries: [],
      achievements: [],
      commandsDiscovered: [],
      logoClicks: 0,
      coreHolds: 0,
      echoSignals: 0,
      enteredAt: null,
      toasts: [],
      konamiDetected: false,
      faultPortalUsed: false,
      unknownRevealed: false,

      enterWorld: () => {
        const state = get();
        if (!state.enteredAt) set({ enteredAt: Date.now() });
        get().unlockAchievement("first-steps");
      },

      visitRegion: (id) => {
        const cur = get().visitedRegions;
        if (!cur.includes(id)) set({ visitedRegions: [...cur, id] });
      },

      findSecret: (id) => {
        const cur = get().foundSecrets;
        if (!cur.includes(id)) {
          set({ foundSecrets: [...cur, id] });
          get().pushToast({
            kind: "system",
            title: "HIDDEN SECTOR REACHED",
            body: id.toUpperCase(),
          });
        }
      },

      discover: (id) => {
        const def = DISCOVERY_MAP[id];
        if (!def) return false;
        const cur = get().discoveries;
        if (cur.includes(id)) return false;
        set({ discoveries: [...cur, id] });
        get().pushToast({
          kind: "discovery",
          title: "DISCOVERY LOGGED",
          body: def.name,
        });
        /* auto-evaluate dependent achievements */
        const d = get().discoveries;
        if (id.startsWith("term-") && d.filter((x) => x.startsWith("term-")).length >= 2) {
          get().unlockAchievement("operator");
        }
        if (get().discoveryPercent() >= 90) get().unlockAchievement("cartographer");
        return true;
      },

      unlockAchievement: (id) => {
        const def = ACHIEVEMENT_MAP[id];
        if (!def) return false;
        const cur = get().achievements;
        if (cur.includes(id)) return false;
        set({ achievements: [...cur, id] });
        get().pushToast({
          kind: "achievement",
          title: "ACHIEVEMENT — " + def.name,
          body: def.description,
        });
        return true;
      },

      recordCommand: (cmd) => {
        const key = cmd.trim().toLowerCase();
        const cur = get().commandsDiscovered;
        if (!cur.includes(key)) {
          const next = [...cur, key];
          set({ commandsDiscovered: next });
          if (next.length >= 12) get().unlockAchievement("operator");
        }
      },

      bumpLogoClicks: () => {
        const n = get().logoClicks + 1;
        set({ logoClicks: n });
        return n;
      },

      bumpCoreHolds: () => {
        const n = get().coreHolds + 1;
        set({ coreHolds: n });
        return n;
      },

      bumpEchoSignals: () => {
        const n = get().echoSignals + 1;
        set({ echoSignals: n });
        return n;
      },

      markKonami: () => set({ konamiDetected: true, unknownRevealed: true }),
      markFaultPortal: () => set({ faultPortalUsed: true }),
      revealUnknown: () => {
        if (!get().unknownRevealed) {
          set({ unknownRevealed: true });
          get().pushToast({
            kind: "system",
            title: "UNKNOWN SIGNAL RESOLVED",
            body: "A new region appeared on the map",
          });
        }
      },

      pushToast: (t) => {
        const toast = { ...t, id: toastSeq++ };
        set({ toasts: [...get().toasts.slice(-3), toast] });
        /* auto-dismiss after 5.5s */
        if (typeof window !== "undefined") {
          window.setTimeout(() => get().dismissToast(toast.id), 5500);
        }
      },

      dismissToast: (id) =>
        set({ toasts: get().toasts.filter((t) => t.id !== id) }),

      discoveryPercent: () => {
        const s = get();
        const total = TOTAL_REGIONS + TOTAL_DISCOVERIES + TOTAL_ACHIEVEMENTS;
        const done =
          s.visitedRegions.filter((r) => r !== "unknown" || s.foundSecrets.includes("void")).length +
          s.discoveries.length +
          s.achievements.length;
        return Math.min(100, Math.round((done / total) * 100));
      },

      exploredRegions: () => get().visitedRegions.length,

      resetAll: () =>
        set({
          visitedRegions: [],
          foundSecrets: [],
          discoveries: [],
          achievements: [],
          commandsDiscovered: [],
          logoClicks: 0,
          coreHolds: 0,
          echoSignals: 0,
          konamiDetected: false,
          faultPortalUsed: false,
          unknownRevealed: false,
          toasts: [],
        }),
    }),
    {
      name: "prince-world/progress/v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        visitedRegions: s.visitedRegions,
        foundSecrets: s.foundSecrets,
        discoveries: s.discoveries,
        achievements: s.achievements,
        commandsDiscovered: s.commandsDiscovered,
        logoClicks: s.logoClicks,
        coreHolds: s.coreHolds,
        echoSignals: s.echoSignals,
        enteredAt: s.enteredAt,
        konamiDetected: s.konamiDetected,
        faultPortalUsed: s.faultPortalUsed,
        unknownRevealed: s.unknownRevealed,
      }),
    }
  )
);
