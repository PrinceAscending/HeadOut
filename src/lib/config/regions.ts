import type { RegionId, SecretId } from "@/types";

/* ═══════════════════════════════════════════════════════════
   World graph — regions, positions, connections, descriptions.
   Positions are world-space coordinates for the WebGL map.
   ═══════════════════════════════════════════════════════════ */

export interface RegionDef {
  id: RegionId;
  code: string; // short code e.g. "CC"
  name: string;
  tagline: string;
  /* world coordinates */
  x: number;
  y: number;
  z: number;
  /* color accent (hex) */
  color: string;
  /* hint shown on hover */
  hint: string;
  hidden?: boolean; // not listed in nav — must be discovered
  secret?: boolean;
}

export const REGIONS: RegionDef[] = [
  {
    id: "core",
    code: "CC",
    name: "CENTRAL CORE",
    tagline: "IDENTITY SPHERE",
    x: 0,
    y: 0,
    z: 0,
    color: "#55e6ff",
    hint: "The center of the world. Who is Prince?",
  },
  {
    id: "code",
    code: "CB",
    name: "CODE CITY",
    tagline: "REPOSITORY DISTRICT",
    x: -9,
    y: 1.2,
    z: 4.5,
    color: "#8b7bff",
    hint: "A city built from live repository data.",
  },
  {
    id: "music",
    code: "MD",
    name: "MUSIC DISTRICT",
    tagline: "SIGNAL / SOUNDSCAPE",
    x: 9.5,
    y: -0.4,
    z: 3.8,
    color: "#3ddc97",
    hint: "Frequencies detected. Something may be playing.",
  },
  {
    id: "chess",
    code: "CA",
    name: "CHESS ARENA",
    tagline: "STRATEGIC CHAMBER",
    x: -8.5,
    y: -1,
    z: -5.5,
    color: "#ffc857",
    hint: "A quiet chamber of calculated violence.",
  },
  {
    id: "gaming",
    code: "GZ",
    name: "GAMING ZONE",
    tagline: "UNDERGROUND ARENA",
    x: 8.5,
    y: 1,
    z: -6,
    color: "#ff5470",
    hint: "Noise from below. Tactical. Competitive.",
  },
  {
    id: "social",
    code: "SN",
    name: "SOCIAL NETWORK",
    tagline: "NEURAL WEB",
    x: 0.5,
    y: -2,
    z: -10.5,
    color: "#5ea8ff",
    hint: "Every signal Prince emits, woven into a web.",
  },
  {
    id: "archive",
    code: "AR",
    name: "ARCHIVE",
    tagline: "MEMORY VAULT",
    x: 0,
    y: 2.4,
    z: 10.5,
    color: "#c9d6ea",
    hint: "Records. Timeline. The shape of a digital life.",
  },
  {
    id: "lab",
    code: "LB",
    name: "LAB",
    tagline: "EXPERIMENTAL WING",
    x: -15,
    y: 0.6,
    z: -0.5,
    color: "#b78bff",
    hint: "Experiments that escaped the lab notebook.",
  },
  {
    id: "terminal",
    code: "TM",
    name: "TERMINAL",
    tagline: "DIRECT ACCESS",
    x: 14.5,
    y: -1.4,
    z: 1.5,
    color: "#7d8aa0",
    hint: "Speak to the world directly. It listens.",
  },
  {
    id: "unknown",
    code: "??",
    name: "UNKNOWN SIGNAL",
    tagline: "UNRESOLVED SOURCE",
    x: 17.5,
    y: 3.2,
    z: -9,
    color: "#ffffff",
    hint: "Something is out here. It was not on the map.",
    hidden: true,
    secret: true,
  },
];

export const REGION_MAP: Record<string, RegionDef> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r])
);

/* graph edges — [from, to] */
export const REGION_LINKS: [RegionId, RegionId][] = [
  ["core", "code"],
  ["core", "music"],
  ["core", "chess"],
  ["core", "gaming"],
  ["core", "social"],
  ["core", "archive"],
  ["core", "lab"],
  ["core", "terminal"],
  ["code", "lab"],
  ["code", "archive"],
  ["music", "terminal"],
  ["chess", "social"],
  ["gaming", "social"],
  ["archive", "music"],
  ["gaming", "terminal"],
];

export const SECRETS: {
  id: SecretId;
  name: string;
  tagline: string;
  color: string;
}[] = [
  { id: "void", name: "THE VOID", tagline: "SECTOR NULL", color: "#8b8b9e" },
  { id: "root", name: "ROOT", tagline: "PRIVILEGED LAYER", color: "#ff5470" },
  { id: "aizen", name: "ILLUSION", tagline: "MIRROR CHAMBER", color: "#b78bff" },
  { id: "echo", name: "ECHO", tagline: "REFLECTION WELL", color: "#55e6ff" },
  { id: "forgotten", name: "FORGOTTEN", tagline: "DELETED MEMORY", color: "#c9d6ea" },
  { id: "wake", name: "WAKE", tagline: "DEEP LAYER", color: "#3ddc97" },
];
