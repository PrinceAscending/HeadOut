import { NextResponse } from "next/server";
import type { ChessData, ChessGame } from "@/types";

/* ═══════════════════════════════════════════════════════════
   Chess.com PubAPI — read-only public data. No auth.
   Cached 5 min. Recent games come from monthly archives.
   ═══════════════════════════════════════════════════════════ */

export const revalidate = 300;

const USER = "prince1242";
const BASE = "https://api.chess.com/pub";

async function cFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "prince-world/1.0 (contact: prince.ascending)" },
    signal: AbortSignal.timeout(9000),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`CHESS ${res.status} ${url}`);
  return (await res.json()) as T;
}

export async function GET() {
  try {
    const [profile, stats, online, archives] = await Promise.all([
      cFetch<any>(`${BASE}/player/${USER}`),
      cFetch<any>(`${BASE}/player/${USER}/stats`).catch(() => null),
      cFetch<any>(`${BASE}/player/${USER}/is-online`).catch(() => null),
      cFetch<{ archives: string[] }>(`${BASE}/player/${USER}/games/archives`),
    ]);

    /* last two months of games, most recent first */
    const months = (archives.archives ?? []).slice(-2).reverse();
    const monthData = await Promise.all(
      months.map((m) => cFetch<any>(m).catch(() => ({ games: [] })))
    );

    const allGames: any[] = monthData
      .flatMap((m) => m.games ?? [])
      .sort((a, b) => (b.end_time ?? 0) - (a.end_time ?? 0));

    const recentGames: ChessGame[] = allGames.slice(0, 10).map((g) => {
      const isWhite =
        (g.white?.username ?? "").toLowerCase() === USER.toLowerCase();
      const me = isWhite ? g.white : g.black;
      const opp = isWhite ? g.black : g.white;
      let myResult: "win" | "loss" | "draw" = "draw";
      if (me?.result === "win") myResult = "win";
      else if (me?.result && me.result !== "draw" && me.result !== "stalemate")
        myResult = "loss";
      return {
        url: g.url,
        pgn: g.pgn ?? "",
        time_control: g.time_control,
        end_reason: g.reason ?? "—",
        white: {
          name: g.white?.username ?? "?",
          rating: g.white?.rating ?? 0,
          result: g.white?.result ?? "?",
        },
        black: {
          name: g.black?.username ?? "?",
          rating: g.black?.rating ?? 0,
          result: g.black?.result ?? "?",
        },
        time_class: g.time_class,
        rated: !!g.rated,
        endTime: new Date((g.end_time ?? 0) * 1000).toISOString(),
        initialSetup:
          g.initial_setup ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
        rules: g.rules ?? "chess",
        accuracy: g.accuracies
          ? { white: g.accuracies.white, black: g.accuracies.black }
          : undefined,
        myColor: isWhite ? "white" : "black",
        myResult,
        ratingBefore: isWhite ? undefined : undefined,
      };
    });

    /* derive a rating trail from game history (real, public data) */
    const trailGames = allGames.slice(0, 40).reverse();
    const ratingTrail: { t: number; rating: number; class: string }[] = [];
    for (const g of trailGames) {
      const isWhite = (g.white?.username ?? "").toLowerCase() === USER.toLowerCase();
      const me = isWhite ? g.white : g.black;
      if (me?.rating) {
        ratingTrail.push({
          t: (g.end_time ?? 0) * 1000,
          rating: me.rating,
          class: g.time_class,
        });
      }
    }

    const data: ChessData = {
      username: profile.username,
      player_id: profile.player_id,
      avatar: profile.avatar ?? null,
      country: profile.country ?? null,
      joined: profile.joined,
      status: profile.status,
      league: profile.league ?? null,
      isOnline: !!online?.online,
      url: profile.url,
      followers: profile.followers ?? 0,
      last_online: profile.last_online ?? null,
      stats: {
        chess_blitz: stats?.chess_blitz
          ? {
              rating: stats.chess_blitz.last?.rating,
              best: stats.chess_blitz.best?.rating,
              record: stats.chess_blitz.record,
            }
          : undefined,
        chess_rapid: stats?.chess_rapid
          ? {
              rating: stats.chess_rapid.last?.rating,
              best: stats.chess_rapid.best?.rating,
              record: stats.chess_rapid.record,
            }
          : undefined,
        chess_bullet: stats?.chess_bullet
          ? {
              rating: stats.chess_bullet.last?.rating,
              best: stats.chess_bullet.best?.rating,
              record: stats.chess_bullet.record,
            }
          : undefined,
        chess_daily: stats?.chess_daily
          ? {
              rating: stats.chess_daily.last?.rating,
              best: stats.chess_daily.best?.rating,
              record: stats.chess_daily.record,
            }
          : undefined,
        tactics: stats?.tactics
          ? { highest: stats.tactics.highest?.rating, lowest: stats.tactics.lowest?.rating }
          : undefined,
        puzzle_rush: stats?.puzzle_rush
          ? { best: stats.puzzle_rush.best?.score }
          : undefined,
      },
      recentGames,
      ratingTrail,
    };

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "chess_unreachable", detail: String(err) },
      { status: 502 }
    );
  }
}
