import type { RegionActivity } from "@/types";

/* ═══════════════════════════════════════════════════════════
   Activity signal — mutable, frame-read by the WebGL scene
   without triggering React re-renders 60 times a second.
   ═══════════════════════════════════════════════════════════ */

export const activitySignal: RegionActivity & { unknownRevealed: boolean } = {
  core: false,
  code: false,
  music: false,
  chess: false,
  gaming: false,
  social: false,
  archive: false,
  lab: false,
  terminal: false,
  unknown: false,
  unknownRevealed: false,
};
