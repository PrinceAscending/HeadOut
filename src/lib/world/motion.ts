import type { Transition, Variants } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   PRINCE // HEADOUT — shared motion vocabulary.
   One clock for the whole world: same easings, same springs,
   same entrance grammar everywhere. If a timing isn't here,
   it shouldn't be invented inline.
   ═══════════════════════════════════════════════════════════ */

/* signature ease — fast departure, long settle */
export const EASE_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* HUD chrome: small translations, quick settle */
export const SPRING_HUD: Transition = { type: "spring", stiffness: 380, damping: 30 };

/* overlay surfaces: drawers, sheets — slightly softer */
export const SPRING_SURFACE: Transition = { type: "spring", stiffness: 260, damping: 30 };

/* standard entrance duration for tweened HUD motion */
export const HUD_DURATION = 0.7;

/* post-boot entrance cascade (seconds after ENTER) — one timeline
   instead of ad-hoc delays scattered across components */
export const HUD_TIMELINE = {
  world: 0.15,
  header: 0.55,
  presence: 0.75,
  dock: 0.9,
  coords: 1.25,
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: HUD_DURATION, ease: EASE_EXPO } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: HUD_DURATION, ease: EASE_EXPO } },
};

export function staggerChildren(each = 0.07, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: each, delayChildren } },
  };
}
