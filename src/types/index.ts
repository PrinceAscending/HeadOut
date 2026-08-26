/* ═══════════════════════════════════════════════════════════
   PRINCE // HEADOUT — shared type system
   ═══════════════════════════════════════════════════════════ */

export type RegionId =
  | "core"
  | "code"
  | "music"
  | "chess"
  | "gaming"
  | "social"
  | "archive"
  | "lab"
  | "terminal"
  | "unknown";

export type SecretId = "void" | "root" | "aizen" | "echo" | "forgotten" | "wake";

export type PanelView = RegionId | SecretId | null;

/* ── Integration health ─────────────────────────────────── */
export type HealthState = "connecting" | "live" | "degraded" | "offline" | "unconfigured";

export interface IntegrationHealth {
  state: HealthState;
  lastSync: number | null;
  detail?: string;
}

/* ── Discord / Lanyard ──────────────────────────────────── */
export interface LanyardActivity {
  id: string;
  name: string;
  type: number; // 0 playing, 1 streaming, 2 listening, 3 watching, 4 custom, 5 competing
  state?: string;
  details?: string;
  timestamps?: { start?: number; end?: number };
  application_id?: string;
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
}

export interface LanyardSpotify {
  track_id: string;
  song: string;
  artist: string;
  album: string;
  album_art_url: string;
  timestamps: { start: number; end: number };
  sync?: boolean;
}

export interface LanyardData {
  discord_status: "online" | "idle" | "dnd" | "offline";
  discord_user?: {
    id: string;
    username: string;
    global_name?: string;
    display_username?: string;
    avatar?: string;
    discriminator?: string;
  };
  activities: LanyardActivity[];
  spotify: LanyardSpotify | null;
  listening_to_spotify: boolean;
  kv: Record<string, string>;
  active_on_discord_desktop: boolean;
  active_on_discord_mobile: boolean;
  active_on_discord_web: boolean;
}

/* ── GitHub ─────────────────────────────────────────────── */
export interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  pushedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fork: boolean;
  archived: boolean;
  url: string;
  homepage: string | null;
  topics?: string[];
}

export interface GitHubEvent {
  id: string;
  type: string;
  repo: string;
  created_at: string;
  payload_summary: string;
}

export interface GitHubData {
  login: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  repos: GitHubRepo[];
  events: GitHubEvent[];
}

/* ── Chess.com ──────────────────────────────────────────── */
export interface ChessModeStats {
  rating?: number;
  best?: number;
  record?: { win: number; loss: number; draw: number };
}

export interface ChessGame {
  url: string;
  pgn: string;
  time_control: string;
  end_reason: string;
  white: { name: string; rating: number; result: string };
  black: { name: string; rating: number; result: string };
  time_class: string;
  rated: boolean;
  endTime: string;
  initialSetup: string;
  rules: string;
  accuracy?: { white?: number; black?: number };
  myColor?: "white" | "black";
  myResult?: "win" | "loss" | "draw";
  ratingBefore?: number;
  ratingAfter?: number;
}

export interface ChessData {
  username: string;
  player_id: number;
  avatar: string | null;
  country: string | null;
  joined: number;
  status: string;
  league: string | null;
  isOnline: boolean;
  url: string;
  followers: number;
  last_online: number | null;
  stats: {
    chess_blitz?: ChessModeStats;
    chess_rapid?: ChessModeStats;
    chess_bullet?: ChessModeStats;
    chess_daily?: ChessModeStats;
    tactics?: { highest?: number; lowest?: number };
    puzzle_rush?: { best?: number };
  };
  recentGames: ChessGame[];
  ratingTrail: { t: number; rating: number; class: string }[];
}

/* ── Spotify (enrichment, env-gated) ────────────────────── */
export interface SpotifyArtistTrack {
  name: string;
  album: string;
  art: string;
  url: string;
  popularity?: number;
}

export interface SpotifyData {
  configured: boolean;
  artist?: { name: string; followers?: number; genres?: string[]; image?: string };
  topTracks?: SpotifyArtistTrack[];
}

/* ── Aggregated world state ─────────────────────────────── */
export interface WorldState {
  identity: {
    name: string;
    handle: string;
    online: boolean;
    statusText: string | null;
    devices: string[];
  };
  discord: LanyardData | null;
  github: GitHubData | null;
  chess: ChessData | null;
  spotify: SpotifyData | null;
  health: Record<string, IntegrationHealth>;
}

/* ── which regions are currently "active" from live signals */
export interface RegionActivity {
  core: boolean;
  code: boolean;
  music: boolean;
  chess: boolean;
  gaming: boolean;
  social: boolean;
  archive: boolean;
  lab: boolean;
  terminal: boolean;
  unknown: boolean;
}

/* ── Discovery / game system ────────────────────────────── */
export interface DiscoveryDef {
  id: string;
  name: string;
  region: RegionId | SecretId;
  hint: string;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  secret?: boolean;
}

/* ── Terminal ───────────────────────────────────────────── */
export interface TerminalLine {
  id: number;
  kind: "cmd" | "out" | "sys" | "err" | "accent";
  text: string;
}
