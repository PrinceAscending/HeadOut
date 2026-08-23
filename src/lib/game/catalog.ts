import type { AchievementDef, DiscoveryDef } from "@/types";

/* ═══════════════════════════════════════════════════════════
   Discovery catalog — 24 scannable fragments hidden in the world.
   Each has a location + hint. Finding one is a quiet event.
   ═══════════════════════════════════════════════════════════ */

export const DISCOVERIES: DiscoveryDef[] = [
  /* CENTRAL CORE */
  { id: "core-trait-1", name: "PARALLEL THREADS", region: "core", hint: "Scan the first trait node" },
  { id: "core-trait-2", name: "MANY HANDS", region: "core", hint: "Scan the second trait node" },
  { id: "core-trait-3", name: "MACHINE AFFINITY", region: "core", hint: "Scan the third trait node" },
  { id: "core-depth", name: "CORE MEMORY", region: "core", hint: "Hold the core" },
  { id: "core-oracle", name: "FIRST CONTACT", region: "core", hint: "Speak with the oracle" },
  /* CODE CITY */
  { id: "code-structure", name: "FIRST STRUCTURE", region: "code", hint: "Open any repository structure" },
  { id: "code-language", name: "DIALECT MAP", region: "code", hint: "View the language distribution" },
  { id: "code-activity", name: "CITY GRID", region: "code", hint: "Witness live activity in the city" },
  /* MUSIC DISTRICT */
  { id: "music-now", name: "LIVE FREQUENCY", region: "music", hint: "Catch music playing in real time" },
  { id: "music-taste", name: "RESonance".toUpperCase(), region: "music", hint: "Find what the district is tuned to" },
  { id: "music-saffron", name: "SAFFRON SIGNAL", region: "music", hint: "The district remembers a voice" },
  /* CHESS ARENA */
  { id: "chess-ratings", name: "ELO PILLARS", region: "chess", hint: "Inspect the rating pillars" },
  { id: "chess-replay", name: "MOVE SHADOWS", region: "chess", hint: "Replay a recorded game" },
  { id: "chess-trail", name: "RATING TRAIL", region: "chess", hint: "Trace the rating history" },
  /* GAMING ZONE */
  { id: "gaming-tag", name: "CALLSIGN", region: "gaming", hint: "Find the Riot identity" },
  { id: "gaming-live", name: "IN THE LOBBY", region: "gaming", hint: "See the arena active in real time" },
  { id: "gaming-clutch", name: "CLUTCH PROTOCOL", region: "gaming", hint: "Something is written under the arena" },
  /* SOCIAL NETWORK */
  { id: "social-web", name: "NEURAL LINK", region: "social", hint: "Map the social web" },
  { id: "social-live", name: "PULSE NODE", region: "social", hint: "Catch a live social signal" },
  /* ARCHIVE */
  { id: "archive-timeline", name: "TIMELINE DECODED", region: "archive", hint: "Read the full archive" },
  { id: "archive-seal", name: "WEAKENING SEAL", region: "archive", hint: "Some text in the archive is... odd" },
  /* LAB */
  { id: "lab-exp-1", name: "EXPERIMENT 001", region: "lab", hint: "Run the particle field" },
  { id: "lab-exp-3", name: "EXPERIMENT 003", region: "lab", hint: "Stare into the void terminal" },
  { id: "lab-exp-4", name: "EXPERIMENT 004", region: "lab", hint: "Map the neural web" },
  /* TERMINAL */
  { id: "term-whoami", name: "WHOAMI", region: "terminal", hint: "Ask the terminal who Prince is" },
  { id: "term-scan", name: "WORLD SCAN", region: "terminal", hint: "Run a full world scan" },
];

export const DISCOVERY_MAP: Record<string, DiscoveryDef> = Object.fromEntries(
  DISCOVERIES.map((d) => [d.id, d])
);

/* ═══════════════════════════════════════════════════════════
   Achievements — 12. Earned, never granted cheaply.
   ═══════════════════════════════════════════════════════════ */

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-steps", name: "FIRST CONTACT", description: "Enter the world for the first time." },
  { id: "network-explorer", name: "NETWORK EXPLORER", description: "Reach the Social Network." },
  { id: "code-hunter", name: "CODE HUNTER", description: "Open a structure inside Code City." },
  { id: "signal-seeker", name: "SIGNAL SEEKER", description: "Witness a live Discord signal." },
  { id: "chess-observer", name: "CHESS OBSERVER", description: "Study the arena's ratings." },
  { id: "music-detector", name: "MUSIC DETECTOR", description: "Detect live music in the district." },
  { id: "void-walker", name: "VOID WALKER", description: "Go where there is nothing.", secret: true },
  { id: "root-access", name: "ROOT ACCESS", description: "Escalate privileges. Politely.", secret: true },
  { id: "unknown-contact", name: "UNKNOWN CONTACT", description: "Answer the unknown signal.", secret: true },
  { id: "illusion-broken", name: "ILLUSION BROKEN", description: "See through the mirror.", secret: true },
  { id: "neural-whisperer", name: "NEURAL WHISPERER", description: "Hold a conversation with the world's mind." },
  { id: "operator", name: "OPERATOR", description: "Master the terminal — 12 commands discovered." },
  { id: "cartographer", name: "CARTOGRAPHER", description: "Reach 90% world discovery." },
];

export const ACHIEVEMENT_MAP: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);

/* totals used for percentages */
export const TOTAL_DISCOVERIES = DISCOVERIES.length; // 24
export const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length; // 12
export const TOTAL_REGIONS = 10; // includes UNKNOWN
export const TOTAL_SECRETS = 6;
