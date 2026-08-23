/* ═══════════════════════════════════════════════════════════
   Identity — the single source of truth for who Prince is.
   Public information only.
   ═══════════════════════════════════════════════════════════ */

export const IDENTITY = {
  name: "PRINCE",
  handle: "PrinceAscending",
  bootTraits: [
    "MULTITASKER",
    "MULTITALENTED",
    "TECH ENTHUSIAST",
    "BUILDER",
    "EXPLORER",
  ],
  traits: [
    {
      id: "multitasker",
      label: "MULTITASKER",
      description:
        "Runs parallel threads without dropping them — code in one window, a game lobby in another, music in between.",
    },
    {
      id: "multitalented",
      label: "MULTITALENTED",
      description:
        "Not one craft. Builds, plays, solves, tunes. The shape of the skill set changes; the drive doesn't.",
    },
    {
      id: "tech-enthusiast",
      label: "TECH ENTHUSIAST",
      description:
        "Follows the machine, not the hype. New tools, new systems, new arenas — always signal, rarely noise.",
    },
  ],
  accounts: {
    discord: { username: "prince.ascending", id: "971329961313046578" },
    github: { username: "PrinceAscending" },
    instagram: { username: "prince.ascending" },
    chess: { username: "prince1242" },
    spotify: { id: "31zjyvimxoucujpwb2pr2mx2ggri" },
    riot: { id: "PrinceAscending#GOD" },
    steam: { note: "Public profile integration ready — configure STEAM_API_KEY" },
  },
  /* subtle influences — never displayed directly on the homepage */
  influences: {
    anime: "Naruto",
    character: "Aizen",
    game: "Valorant",
    artist: "Kailash Kher",
    quote: "Better path to power is fury.",
  },
} as const;

export const SOCIAL_NODES = [
  {
    id: "discord",
    platform: "DISCORD",
    handle: "prince.ascending",
    href: "https://discord.com/users/971329961313046578",
    live: true,
    configured: true,
  },
  {
    id: "github",
    platform: "GITHUB",
    handle: "PrinceAscending",
    href: "https://github.com/PrinceAscending",
    live: true,
    configured: true,
  },
  {
    id: "chess",
    platform: "CHESS",
    handle: "prince1242",
    href: "https://www.chess.com/member/prince1242",
    live: true,
    configured: true,
  },
  {
    id: "spotify",
    platform: "SPOTIFY",
    handle: "prince.ascending",
    href: "https://open.spotify.com/user/31zjyvimxoucujpwb2pr2mx2ggri",
    live: true,
    configured: true,
  },
  {
    id: "instagram",
    platform: "INSTAGRAM",
    handle: "prince.ascending",
    href: "https://instagram.com/prince.ascending",
    live: false,
    configured: true,
  },
  {
    id: "youtube",
    platform: "YOUTUBE",
    handle: null,
    href: null,
    live: false,
    configured: false,
  },
  {
    id: "reddit",
    platform: "REDDIT",
    handle: null,
    href: null,
    live: false,
    configured: false,
  },
  {
    id: "x",
    platform: "X",
    handle: null,
    href: null,
    live: false,
    configured: false,
  },
  {
    id: "telegram",
    platform: "TELEGRAM",
    handle: null,
    href: null,
    live: false,
    configured: false,
  },
] as const;

/* Valorant-inspired ranks for display language (agent/faction
   visual language only — no rank data is fabricated). */
export const GAMING_PLATFORMS = [
  {
    id: "valorant",
    platform: "VALORANT",
    identity: "PrinceAscending#GOD",
    tagline: "TACTICAL SHOOTER — PRIMARY ARENA",
    status: "presenced" as const,
    note: "Live status surfaces through Discord presence when in-game.",
  },
  {
    id: "steam",
    platform: "STEAM",
    identity: null,
    tagline: "LIBRARY NODE",
    status: "adapter-ready" as const,
    note: "Public profile data activates when STEAM_API_KEY is configured.",
  },
  {
    id: "epic",
    platform: "EPIC",
    identity: null,
    tagline: "OUTPOST",
    status: "offline" as const,
    note: "No public API available. Identity layer only.",
  },
  {
    id: "xbox",
    platform: "XBOX",
    identity: null,
    tagline: "RELAY",
    status: "offline" as const,
    note: "No public API available. Identity layer only.",
  },
] as const;
