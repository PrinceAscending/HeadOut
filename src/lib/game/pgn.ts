/* ═══════════════════════════════════════════════════════════
   Minimal PGN (SAN) mover — designed for replay visualization.
   Applies standard algebraic notation to a board, resolving
   disambiguation pseudo-legally. Not a full engine — it never
   needs to be, it only replays real recorded games.
   ═══════════════════════════════════════════════════════════ */

export type Board = (string | null)[]; // 64, a8..h1; upper=white, lower=black

export interface ReplayMove {
  san: string;
  from: number;
  to: number;
  captured: string | null;
  board: Board; // board AFTER the move
  color: "w" | "b";
  fullmove: number;
}

export const START_FEN_BOARD =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

export function fenToBoard(fen: string): Board {
  const board: Board = new Array(64).fill(null);
  let i = 0;
  for (const ch of fen.split(" ")[0]) {
    if (ch === "/") continue;
    if (/\d/.test(ch)) i += parseInt(ch, 10);
    else board[i++] = ch;
  }
  return board;
}

const KNIGHT_D = [-17, -15, -10, -6, 6, 10, 15, 17];
const KING_D = [-9, -8, -7, -1, 1, 7, 8, 9];
const DIAG = [-9, -7, 7, 9];
const ORTHO = [-8, -1, 1, 8];

const file = (sq: number) => sq % 8;
const rank = (sq: number) => Math.floor(sq / 8);
const onDiagRay = (from: number, to: number) => {
  const df = Math.abs(file(from) - file(to));
  const dr = Math.abs(rank(from) - rank(to));
  return df === dr && df > 0;
};
const onOrthoRay = (from: number, to: number) =>
  (file(from) === file(to)) !== (rank(from) === rank(to));

function pathClear(b: Board, from: number, to: number): boolean {
  const step =
    file(from) === file(to)
      ? to > from
        ? 8
        : -8
      : rank(from) === rank(to)
        ? to > from
          ? 1
          : -1
        : to > from
          ? (Math.abs(to - from) % 9 === 0 ? 9 : 7) * (Math.abs(file(to) - file(from)) === Math.abs(rank(to) - rank(from)) ? 1 : 0)
          : (Math.abs(from - to) % 9 === 0 ? -9 : -7) * 1;
  if (step === 0) return false;
  for (let s = from + step; s !== to; s += step) {
    if (b[s]) return false;
    /* guard runaway */
    if (s < 0 || s > 63) return false;
    if (Math.abs(file(s) - file(s - step)) > 2) return false;
  }
  return true;
}

function candidateSquares(b: Board, piece: string, from: number, color: "w" | "b"): number[] {
  const type = piece.toUpperCase();
  const own = color === "w" ? /^[A-Z]$/ : /^[a-z]$/;
  const out: number[] = [];
  const push = (to: number) => {
    if (to < 0 || to > 63) return;
    if (Math.abs(file(to) - file(from)) > 2 && type !== "N" && type !== "K") return;
    if (b[to] && own.test(b[to]!)) return;
    out.push(to);
  };

  switch (type) {
    case "N":
      for (const d of KNIGHT_D) {
        const to = from + d;
        if (to < 0 || to > 63) continue;
        if (Math.abs(file(to) - file(from)) + Math.abs(rank(to) - rank(from)) !== 3) continue;
        push(to);
      }
      break;
    case "K":
      for (const d of KING_D) {
        const to = from + d;
        if (to < 0 || to > 63) continue;
        const df = Math.abs(file(to) - file(from));
        const dr = Math.abs(rank(to) - rank(from));
        if (df > 1 || dr > 1) continue;
        push(to);
      }
      break;
    case "B":
      for (const d of DIAG) {
        for (let to = from + d; to >= 0 && to <= 63; to += d) {
          if (Math.abs(file(to) - file(to - d)) > 1) break;
          if (b[to]) {
            if (!own.test(b[to]!)) out.push(to);
            break;
          }
          out.push(to);
        }
      }
      break;
    case "R":
      for (const d of ORTHO) {
        for (let to = from + d; to >= 0 && to <= 63; to += d) {
          if (Math.abs(file(to) - file(to - d)) > 1) break;
          if (b[to]) {
            if (!own.test(b[to]!)) out.push(to);
            break;
          }
          out.push(to);
        }
      }
      break;
    case "Q":
      for (const d of [...DIAG, ...ORTHO]) {
        for (let to = from + d; to >= 0 && to <= 63; to += d) {
          if (Math.abs(file(to) - file(to - d)) > 1) break;
          if (b[to]) {
            if (!own.test(b[to]!)) out.push(to);
            break;
          }
          out.push(to);
        }
      }
      break;
    case "P": {
      const dir = color === "w" ? -8 : 8;
      const startRank = color === "w" ? 6 : 1;
      const one = from + dir;
      if (one >= 0 && one <= 63 && !b[one]) {
        out.push(one);
        const two = from + dir * 2;
        if (rank(from) === startRank && !b[two]) out.push(two);
      }
      for (const dd of [dir - 1, dir + 1]) {
        const to = from + dd;
        if (to < 0 || to > 63) continue;
        if (Math.abs(file(to) - file(from)) !== 1) continue;
        if (b[to] && !own.test(b[to]!)) out.push(to);
      }
      break;
    }
  }
  return out;
}

export function parseMovesFromPgn(pgn: string): string[] {
  if (!pgn) return [];
  return pgn
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\$\d+/g, " ")
    .replace(/\d+\.(\.\.)?/g, " ")
    .replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function replayGame(
  pgn: string,
  initialFen?: string
): { moves: ReplayMove[]; error: string | null } {
  const board = fenToBoard(initialFen ?? START_FEN_BOARD);
  let color: "w" | "b" = "w";
  const sans = parseMovesFromPgn(pgn);
  const moves: ReplayMove[] = [];
  let error: string | null = null;

  for (const san of sans) {
    try {
      let piece = color === "w" ? "P" : "p";
      let target = -1;
      let disFile: number | null = null;
      let disRank: number | null = null;
      let promo: string | null = null;

      let s = san.replace(/[+#]/g, "").replace(/!?/g, "");

      if (s === "O-O" || s === "0-0") {
        /* king side castle */
        const row = color === "w" ? 7 : 0;
        const kf = row * 8 + 4;
        const kt = row * 8 + 6;
        const rf = row * 8 + 7;
        const rt = row * 8 + 5;
        const king = board[kf];
        board[kt] = king;
        board[kf] = null;
        board[rt] = board[rf];
        board[rf] = null;
        moves.push({
          san,
          from: kf,
          to: kt,
          captured: null,
          board: [...board],
          color,
          fullmove: Math.ceil((moves.length + 1) / 2),
        });
        color = color === "w" ? "b" : "w";
        continue;
      }
      if (s === "O-O-O" || s === "0-0-0") {
        const row = color === "w" ? 7 : 0;
        const kf = row * 8 + 4;
        const kt = row * 8 + 2;
        const rf = row * 8 + 0;
        const rt = row * 8 + 3;
        const king = board[kf];
        board[kt] = king;
        board[kf] = null;
        board[rt] = board[rf];
        board[rf] = null;
        moves.push({
          san,
          from: kf,
          to: kt,
          captured: null,
          board: [...board],
          color,
          fullmove: Math.ceil((moves.length + 1) / 2),
        });
        color = color === "w" ? "b" : "w";
        continue;
      }

      const m = s.match(/^([KQRBN])?([a-h])?([1-8])?x?([a-h][1-8])(?:=([QRBN]))?/);
      if (!m) throw new Error(`bad san: ${san}`);
      if (m[1]) piece = color === "w" ? m[1] : m[1].toLowerCase();
      if (m[2]) disFile = m[2].charCodeAt(0) - 97;
      if (m[3]) disRank = 8 - parseInt(m[3], 10);
      target = (8 - parseInt(m[4][1], 10)) * 8 + (m[4][0].charCodeAt(0) - 97);
      if (m[5]) promo = color === "w" ? m[5] : m[5].toLowerCase();

      /* find candidate source squares */
      let sources: number[] = [];
      for (let sq = 0; sq < 64; sq++) {
        if (board[sq] !== piece) continue;
        if (disFile !== null && file(sq) !== disFile) continue;
        if (disRank !== null && rank(sq) !== disRank) continue;
        if (candidateSquares(board, piece, sq, color).includes(target)) sources.push(sq);
      }

      /* pawn capture requires explicit file — fallback: any pawn attacking */
      if (sources.length === 0 && piece.toUpperCase() === "P") {
        for (let sq = 0; sq < 64; sq++) {
          if (board[sq] !== piece) continue;
          const dir = color === "w" ? -8 : 8;
          for (const dd of [dir - 1, dir + 1]) {
            const to = sq + dd;
            if (to === target) {
              sources.push(sq);
              break;
            }
          }
        }
      }

      if (sources.length === 0) throw new Error(`no source for ${san}`);
      const from = sources[0];

      const captured = board[target];
      board[target] = promo ?? piece;
      if (piece.toUpperCase() === "P" && !captured && file(from) !== file(target)) {
        /* en passant — remove the passed pawn */
        const epSq = target + (color === "w" ? 8 : -8);
        board[epSq] = null;
      }
      board[from] = null;

      moves.push({
        san,
        from,
        to: target,
        captured,
        board: [...board],
        color,
        fullmove: Math.ceil((moves.length + 1) / 2),
      });
      color = color === "w" ? "b" : "w";
    } catch (e) {
      error = (e as Error).message;
      break;
    }
  }
  return { moves, error };
}

export const UNICODE_PIECES: Record<string, string> = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};
