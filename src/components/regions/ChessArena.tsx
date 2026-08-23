"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RegionPanelShell } from "./RegionPanelShell";
import { useWorld } from "@/lib/world/store";
import { useGame } from "@/lib/game/store";
import { playSound } from "@/lib/audio/sound";
import { Chip, LiveIndicator, SectionTitle, SystemLabel } from "@/components/ui/holo/primitives";
import { replayGame, UNICODE_PIECES, START_FEN_BOARD, fenToBoard, type Board } from "@/lib/game/pgn";
import type { ChessGame } from "@/types";
import { IDENTITY } from "@/lib/config/identity";

/* ═══════════════════════════════════════════════════════════
   Chess Arena — ratings as pillars, games as replays.
   All data from the public Chess.com PubAPI. Nothing invented.
   ═══════════════════════════════════════════════════════════ */

function RatingPillar({
  label,
  rating,
  best,
  max,
  online,
}: {
  label: string;
  rating?: number;
  best?: number;
  max: number;
  online?: boolean;
}) {
  const h = rating ? Math.max(12, (rating / max) * 100) : 4;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="font-mono text-[13px] font-medium tabular-nums text-foreground/90">
        {rating ?? "—"}
      </span>
      <div className="relative w-10 h-36 bg-white/[0.03] border border-white/8 flex items-end overflow-hidden">
        <motion.div
          initial={{ height: 4 }}
          animate={{ height: `${h}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full relative"
          style={{
            background:
              "linear-gradient(to top, rgba(255,200,87,0.25), rgba(255,200,87,0.85))",
            boxShadow: online ? "0 0 24px rgba(255,200,87,0.4)" : undefined,
          }}
        >
          {best && rating ? (
            <span
              className="absolute left-0 right-0 h-px bg-white/50"
              style={{ bottom: `${Math.min(100, (best / max) * 100 * (100 / h) - 100)}%` }}
              aria-label={`best ${best}`}
            />
          ) : null}
        </motion.div>
      </div>
      <span className="font-mono text-[10px] tracking-[0.22em] text-wx-dim">{label}</span>
    </div>
  );
}

function RecordBar({ w, l, d }: { w: number; l: number; d: number }) {
  const total = Math.max(1, w + l + d);
  return (
    <div>
      <div className="flex h-2 overflow-hidden border border-white/10">
        <div className="bg-wx-green/80" style={{ width: `${(w / total) * 100}%` }} />
        <div className="bg-white/20" style={{ width: `${(d / total) * 100}%` }} />
        <div className="bg-wx-red/70" style={{ width: `${(l / total) * 100}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-wx-dim tabular-nums">
        <span className="text-wx-green">{w}W</span>
        <span>{d}D</span>
        <span className="text-wx-red">{l}L</span>
      </div>
    </div>
  );
}

function Trail({ points }: { points: { t: number; rating: number }[] }) {
  if (points.length < 2)
    return (
      <div className="font-mono text-[10px] text-wx-dim py-4 text-center">
        INSUFFICIENT RECENT HISTORY FOR A TRAIL
      </div>
    );
  const w = 260;
  const h = 60;
  const min = Math.min(...points.map((p) => p.rating));
  const max = Math.max(...points.map((p) => p.rating));
  const span = Math.max(10, max - min);
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p.rating - min) / span) * (h - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" role="img" aria-label="Rating history">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="var(--wx-amber)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <polygon
        points={`0,${h} ${coords.join(" ")} ${w},${h}`}
        fill="rgba(255,200,87,0.08)"
      />
      {points.length > 0 && (
        <circle
          cx={coords[coords.length - 1].split(",")[0]}
          cy={coords[coords.length - 1].split(",")[1]}
          r="2.5"
          fill="var(--wx-amber)"
        />
      )}
    </svg>
  );
}

/* ── replay board ────────────────────────────────────────── */
function BoardView({
  startBoard,
  board,
  lastMove,
  flipped,
}: {
  startBoard: Board;
  board: Board;
  lastMove: { from: number; to: number } | null;
  flipped: boolean;
}) {
  const squares = useMemo(() => {
    const idx = Array.from({ length: 64 }, (_, i) => i);
    return flipped ? idx.reverse() : idx;
  }, [flipped]);
  const files = "abcdefgh";
  return (
    <div
      className="grid grid-cols-8 border border-white/15 select-none"
      style={{ boxShadow: "0 0 40px rgba(255,200,87,0.12)" }}
      role="img"
      aria-label="Chess board replay"
    >
      {squares.map((sq) => {
        const f = files[sq % 8];
        const r = 8 - Math.floor(sq / 8);
        const dark = (sq % 8 + Math.floor(sq / 8)) % 2 === 1;
        const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
        return (
          <div
            key={sq}
            className={cnSquare(dark)}
            title={`${f}${r}`}
          >
            {isLast && (
              <span className="absolute inset-0 bg-wx-amber/25" aria-hidden />
            )}
            <span className={cnPiece(board[sq])}>
              {board[sq] ? UNICODE_PIECES[board[sq]!] : ""}
            </span>
            {/* start-board ghost markers could go here */}
            <span className="sr-only">{`${f}${r} ${board[sq] ?? "empty"}`}</span>
          </div>
        );
      })}
    </div>
  );
}

function cnSquare(dark: boolean) {
  return (
    "relative aspect-square grid place-items-center " +
    (dark ? "bg-[#141a28]" : "bg-[#1d2536]")
  );
}

function cnPiece(p: string | null) {
  if (!p) return "";
  const white = p === p.toUpperCase();
  return (
    "text-[26px] sm:text-[30px] leading-none relative z-10 " +
    (white ? "text-[#e8ecf4]" : "text-[#4a5568]")
  );
}

function Replay({ game, onExit }: { game: ChessGame; onExit: () => void }) {
  const initialFen = game.initialSetup || START_FEN_BOARD;
  const { moves, error } = useMemo(() => replayGame(game.pgn, initialFen), [game.pgn, initialFen]);
  const [ply, setPly] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [flipped, setFlipped] = useState(game.myColor === "black");
  const discover = useGame((s) => s.discover);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    discover("chess-replay");
     
  }, []);

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(() => {
        setPly((p) => {
          if (p >= moves.length) {
            setPlaying(false);
            return p;
          }
          playSound("key");
          return p + 1;
        });
      }, 850);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, moves.length]);

  const board = ply === 0 ? fenToBoard(initialFen) : moves[ply - 1].board;
  const last = ply > 0 ? moves[ply - 1] : null;
  const nextSan = ply < moves.length ? moves[ply].san : null;

  const opponent =
    game.myColor === "white" ? game.black.name : game.white.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <SystemLabel className="text-wx-amber">GAME REPLAY</SystemLabel>
          <div className="font-sans text-sm font-medium mt-1 tracking-wider">
            {game.myColor === "white" ? "PRINCE1242" : opponent.toUpperCase()} vs{" "}
            {game.myColor === "white" ? opponent.toUpperCase() : "PRINCE1242"}
          </div>
        </div>
        <button
          onClick={() => {
            playSound("close");
            onExit();
          }}
          className="font-mono text-[10px] tracking-[0.2em] text-wx-dim hover:text-white border border-white/12 hover:border-white/30 px-2.5 py-1.5 clip-btn"
        >
          EXIT REPLAY
        </button>
      </div>

      <BoardView
        startBoard={fenToBoard(initialFen)}
        board={board}
        lastMove={last ? { from: last.from, to: last.to } : null}
        flipped={flipped}
      />

      {/* controls */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setPly(0)} className={replayBtn} aria-label="Restart">
          ⏮
        </button>
        <button
          onClick={() => setPly((p) => Math.max(0, p - 1))}
          className={replayBtn}
          aria-label="Previous move"
        >
          ◀
        </button>
        <button
          onClick={() => {
            playSound("click");
            setPlaying((v) => !v);
          }}
          className={replayBtn + " px-4 text-wx-amber border-wx-amber/40 hover:bg-wx-amber/10"}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "❚❚ PAUSE" : "▶ WATCH GAME"}
        </button>
        <button
          onClick={() => setPly((p) => Math.min(moves.length, p + 1))}
          className={replayBtn}
          aria-label="Next move"
        >
          ▶
        </button>
        <button
          onClick={() => setPly(moves.length)}
          className={replayBtn}
          aria-label="Jump to end"
        >
          ⏭
        </button>
        <button
          onClick={() => setFlipped((f) => !f)}
          className={replayBtn}
          aria-label="Flip board"
        >
          ⇅
        </button>
      </div>

      <div className="flex items-center justify-between font-mono text-[10px] text-wx-dim">
        <span>
          MOVE {Math.ceil(ply / 2) || 0}/{Math.ceil(moves.length / 2)} ·{" "}
          {last ? `${last.color === "w" ? "WHITE" : "BLACK"} PLAYED ${last.san}` : "START POSITION"}
        </span>
        <span className={game.myResult === "win" ? "text-wx-green" : game.myResult === "loss" ? "text-wx-red" : ""}>
          RESULT: {game.myResult?.toUpperCase() ?? "?"}
        </span>
      </div>

      {nextSan && (
        <div className="text-center font-mono text-[10px] text-wx-dim/70">
          NEXT: <span className="text-foreground/70">{nextSan}</span>
        </div>
      )}
      {error && (
        <div className="font-mono text-[10px] text-wx-amber/70 text-center">
          REPLAY STREAM TRUNCATED AT {moves.length} PLIES — SOURCE PGN IRREGULARITY
        </div>
      )}
    </motion.div>
  );
}

const replayBtn =
  "font-mono text-[11px] border border-white/12 px-3 py-2 clip-btn hover:border-white/30 hover:bg-white/5 transition-colors";

/* ── main panel ──────────────────────────────────────────── */
export function ChessArena() {
  const chess = useWorld((s) => s.chess);
  const health = useWorld((s) => s.health.chess);
  const discover = useGame((s) => s.discover);
  const [replaying, setReplaying] = useState<ChessGame | null>(null);

  const maxRating = useMemo(() => {
    const vals: number[] = [];
    for (const k of ["chess_blitz", "chess_rapid", "chess_bullet", "chess_daily"] as const) {
      const v = chess?.stats?.[k]?.rating;
      if (v) vals.push(v);
    }
    return Math.max(1200, ...vals) * 1.12;
  }, [chess]);

  return (
    <RegionPanelShell regionId="chess">
      <div className="space-y-6">
        {chess ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-sans text-lg font-semibold tracking-[0.2em]">
                  {chess.username.toUpperCase()}
                </div>
                <div className="font-mono text-[10px] text-wx-dim tracking-[0.2em] mt-1">
                  {chess.league ? `${chess.league.toUpperCase()} LEAGUE` : "UNRANKED LEAGUE"} ·
                  JOINED {new Date(chess.joined * 1000).getFullYear()}
                </div>
              </div>
              <LiveIndicator
                state={chess.isOnline ? "live" : "offline"}
                label={chess.isOnline ? "ON CHESS.COM" : "OFF BOARD"}
              />
            </div>

            <div>
              <SectionTitle>RATING PILLARS</SectionTitle>
              <div
                className="flex justify-around items-end"
                onMouseEnter={() => discover("chess-ratings")}
              >
                <RatingPillar label="BLITZ" rating={chess.stats.chess_blitz?.rating} best={chess.stats.chess_blitz?.best} max={maxRating} />
                <RatingPillar label="RAPID" rating={chess.stats.chess_rapid?.rating} best={chess.stats.chess_rapid?.best} max={maxRating} />
                <RatingPillar label="BULLET" rating={chess.stats.chess_bullet?.rating} best={chess.stats.chess_bullet?.best} max={maxRating} />
                <RatingPillar label="DAILY" rating={chess.stats.chess_daily?.rating} best={chess.stats.chess_daily?.best} max={maxRating} />
              </div>
            </div>

            {chess.stats.chess_rapid?.record && (
              <div>
                <SectionTitle>RECORD — RAPID</SectionTitle>
                <RecordBar {...chess.stats.chess_rapid.record} />
              </div>
            )}

            <div>
              <SectionTitle>RATING TRAIL — REAL GAME HISTORY</SectionTitle>
              <Trail points={chess.ratingTrail} />
              <div className="font-mono text-[9.5px] text-wx-dim/60 tracking-wider mt-1">
                DERIVED FROM PUBLIC ARCHIVED GAMES — NOTHING SIMULATED
              </div>
            </div>

            {replaying ? (
              <Replay game={replaying} onExit={() => setReplaying(null)} />
            ) : (
              <div>
                <SectionTitle right={<LiveIndicator state={health.state} />}>
                  RECENT ENCOUNTERS
                </SectionTitle>
                <div className="space-y-2">
                  {chess.recentGames.length === 0 && (
                    <div className="font-mono text-[10px] text-wx-dim py-4 text-center">
                      NO RECENT PUBLIC GAMES FOUND IN ARCHIVES
                    </div>
                  )}
                  {chess.recentGames.map((g) => {
                    const opp = g.myColor === "white" ? g.black : g.white;
                    return (
                      <div
                        key={g.url}
                        className="border border-white/8 hover:border-wx-amber/40 bg-white/[0.015] px-3.5 py-3 clip-panel transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-mono text-[10px] px-1.5 py-0.5 border clip-tag"
                                style={{
                                  color:
                                    g.myResult === "win"
                                      ? "var(--wx-green)"
                                      : g.myResult === "loss"
                                        ? "var(--wx-red)"
                                        : "var(--wx-dim)",
                                  borderColor:
                                    g.myResult === "win"
                                      ? "#3ddc9744"
                                      : g.myResult === "loss"
                                        ? "#ff547044"
                                        : "#ffffff22",
                                }}
                              >
                                {g.myResult?.toUpperCase() ?? "?"}
                              </span>
                              <span className="font-mono text-[11px] text-foreground/80 truncate">
                                vs {opp.name}
                              </span>
                              <span className="font-mono text-[10px] text-wx-dim">
                                ({opp.rating})
                              </span>
                            </div>
                            <div className="font-mono text-[10px] text-wx-dim mt-1 tracking-wider">
                              {g.time_class.toUpperCase()} · {g.end_reason.replace(/_/g, " ").toUpperCase()} ·{" "}
                              {new Date(g.endTime).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                              {g.myColor === "black" ? " · PLAYED BLACK" : ""}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              playSound("click");
                              setReplaying(g);
                            }}
                            className="shrink-0 font-mono text-[10px] tracking-[0.2em] text-wx-amber border border-wx-amber/40 hover:bg-wx-amber/10 px-2.5 py-1.5 clip-btn transition-colors"
                          >
                            WATCH GAME
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <a
              href={chess.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-mono text-[10px] tracking-[0.25em] text-wx-amber border border-wx-amber/40 px-3 py-1.5 clip-btn hover:bg-wx-amber/10 transition-colors"
            >
              OPEN FULL PROFILE →
            </a>
          </>
        ) : (
          <div className="space-y-4 py-8 text-center">
            <div className="font-mono text-[10px] tracking-[0.3em] text-wx-amber">
              {health.state === "connecting" ? "ENTERING THE CHAMBER..." : "CONNECTION INTERRUPTED"}
            </div>
            <p className="text-[11px] text-wx-dim leading-relaxed">
              {health.state === "connecting"
                ? "Ratings materializing from the public Chess.com archive."
                : "The chamber is sealed. Last known state preserved."}
            </p>
            <LiveIndicator state={health.state === "connecting" ? "connecting" : "degraded"} />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Chip color="#ffc857">CHESS.COM PUBAPI</Chip>
          <Chip>{IDENTITY.accounts.chess.username}</Chip>
          <Chip>READ-ONLY · PUBLIC</Chip>
        </div>
      </div>
    </RegionPanelShell>
  );
}
