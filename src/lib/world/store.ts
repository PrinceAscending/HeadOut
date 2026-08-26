"use client";

import { create } from "zustand";
import type {
  ChessData,
  GitHubData,
  IntegrationHealth,
  LanyardData,
  RegionActivity,
  RegionId,
  SpotifyData,
} from "@/types";

/* ═══════════════════════════════════════════════════════════
   World State — one store aggregating every live signal.
   UI never talks to raw APIs; it reads normalized state here.
   ═══════════════════════════════════════════════════════════ */

interface WorldStore {
  lanyard: LanyardData | null;
  github: GitHubData | null;
  chess: ChessData | null;
  spotify: SpotifyData | null;
  health: Record<string, IntegrationHealth>;
  /* interactions */
  paletteOpen: boolean;
  terminalOpen: boolean;
  activePanel: string | null;
  faultActive: boolean;
  /* hovered map node — lives here (not component state) so hover
     re-renders only the affected label, never the R3F scene subtree */
  hoveredRegion: RegionId | null;

  setLanyard: (d: LanyardData | null) => void;
  setGithub: (d: GitHubData | null) => void;
  setChess: (d: ChessData | null) => void;
  setSpotify: (d: SpotifyData | null) => void;
  setHealth: (key: string, h: Partial<IntegrationHealth>) => void;
  setPaletteOpen: (v: boolean) => void;
  setTerminalOpen: (v: boolean) => void;
  setActivePanel: (v: string | null) => void;
  setFaultActive: (v: boolean) => void;
  setHoveredRegion: (v: RegionId | null) => void;
}

export const useWorld = create<WorldStore>((set) => ({
  lanyard: null,
  github: null,
  chess: null,
  spotify: null,
  health: {
    discord: { state: "connecting", lastSync: null },
    github: { state: "connecting", lastSync: null },
    chess: { state: "connecting", lastSync: null },
    spotify: { state: "connecting", lastSync: null },
    gaming: { state: "unconfigured", lastSync: null },
  },
  paletteOpen: false,
  terminalOpen: false,
  activePanel: null,
  faultActive: false,
  hoveredRegion: null,

  setLanyard: (d) =>
    set({
      lanyard: d,
      health: d
        ? { ...useWorld.getState().health, discord: { state: "live", lastSync: Date.now() } }
        : useWorld.getState().health,
    }),
  setGithub: (d) =>
    set((s) => ({
      github: d,
      health: {
        ...s.health,
        github: d
          ? { state: "live", lastSync: Date.now() }
          : { state: "degraded", lastSync: s.health.github.lastSync },
      },
    })),
  setChess: (d) =>
    set((s) => ({
      chess: d,
      health: {
        ...s.health,
        chess: d
          ? { state: "live", lastSync: Date.now() }
          : { state: "degraded", lastSync: s.health.chess.lastSync },
      },
    })),
  setSpotify: (d) =>
    set((s) => ({
      spotify: d,
      health: {
        ...s.health,
        spotify: d?.configured
          ? { state: "live", lastSync: Date.now() }
          : { state: "unconfigured", lastSync: null },
      },
    })),
  setHealth: (key, h) =>
    set((s) => ({
      health: { ...s.health, [key]: { ...s.health[key], ...h } },
    })),
  setPaletteOpen: (v) => set({ paletteOpen: v }),
  setTerminalOpen: (v) => set({ terminalOpen: v }),
  setActivePanel: (v) => set({ activePanel: v }),
  setFaultActive: (v) => set({ faultActive: v }),
  setHoveredRegion: (v) => set({ hoveredRegion: v }),
}));

/* ── derived: which regions are live right now ──────────── */
export function deriveRegionActivity(lanyard: LanyardData | null): RegionActivity {
  const online = !!lanyard && lanyard.discord_status !== "offline";
  const acts = lanyard?.activities ?? [];
  const playing = acts.filter((a) => a.type === 0);
  const coding =
    online &&
    acts.some(
      (a) =>
        a.name?.toLowerCase().includes("visual studio code") ||
        a.name?.toLowerCase().includes("vscode") ||
        a.name?.toLowerCase().includes("code")
    );
  const gamingLive =
    online && playing.some((a) => !a.name?.toLowerCase().includes("code"));
  const valorantLive =
    online && acts.some((a) => a.name?.toLowerCase().includes("valorant"));
  const musicLive = !!lanyard?.listening_to_spotify && !!lanyard?.spotify;

  return {
    core: online,
    code: coding || false,
    music: musicLive,
    chess: false,
    gaming: gamingLive || valorantLive,
    social: online,
    archive: false,
    lab: false,
    terminal: false,
    unknown: false,
  };
}

/* ── derived: current "top" activity line for HUD ───────── */
export function derivePresenceLine(lanyard: LanyardData | null): string {
  if (!lanyard) return "SIGNAL UNRESOLVED";
  if (lanyard.listening_to_spotify && lanyard.spotify)
    return `LISTENING — ${lanyard.spotify.song} · ${lanyard.spotify.artist}`;
  const game = lanyard.activities.find((a) => a.type === 0);
  if (game) return `PLAYING — ${game.name}`;
  const vsCode = lanyard.activities.find(
    (a) => a.type === 0 && a.name?.toLowerCase().includes("code")
  );
  if (vsCode) return `CODING — ${vsCode.name}`;
  const custom = lanyard.activities.find((a) => a.type === 4);
  if (custom?.state) return `STATUS — ${custom.state}`;
  switch (lanyard.discord_status) {
    case "online":
      return "ONLINE — IDLE SIGNAL";
    case "idle":
      return "IDLE — SIGNAL SOFT";
    case "dnd":
      return "DO NOT DISTURB — FOCUS LOCK";
    default:
      /* status chip/dot already say OFFLINE — don't repeat it */
      return "LAST KNOWN STATE PRESERVED";
  }
}

export const STATUS_COLOR: Record<string, string> = {
  online: "var(--wx-green)",
  idle: "var(--wx-amber)",
  dnd: "var(--wx-red)",
  offline: "var(--wx-dim)",
};
