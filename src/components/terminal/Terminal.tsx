"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWorld, derivePresenceLine, STATUS_COLOR } from "@/lib/world/store";
import { streamOracleDeltas } from "@/lib/world/sse";
import { useGame } from "@/lib/game/store";
import { REGIONS } from "@/lib/config/regions";
import { IDENTITY } from "@/lib/config/identity";
import { DISCOVERIES, ACHIEVEMENTS } from "@/lib/game/catalog";
import { playSound, isSoundEnabled, setSoundEnabled } from "@/lib/audio/sound";
import { secondsSince } from "@/lib/utils";
import type { TerminalLine } from "@/types";

/* ═══════════════════════════════════════════════════════════
   Terminal — direct access to the world. Dynamic responses,
   hidden commands, no mercy.
   ═══════════════════════════════════════════════════════════ */

const PUBLIC_HELP = [
  "AVAILABLE COMMANDS:",
  "  help          this list",
  "  ask <q>       consult the oracle (AI)",
  "  narrate       AI narrates the live world state",
  "  status        world + presence status",
  "  whoami        identity readout",
  "  scan          scan the world",
  "  map           region index",
  "  github        code city feed",
  "  discord       presence relay",
  "  spotify       music district state",
  "  chess         arena ratings",
  "  gaming        gaming zone state",
  "  social        social web index",
  "  discoveries   discovery log",
  "  achievements  achievement log",
  "  goto <region> travel to a region",
  "  sound on|off  toggle audio",
  "  clear         clear terminal",
  "",
  "some commands are not listed. the world hides things.",
];

let lineSeq = 1;
const L = (kind: TerminalLine["kind"], text: string): TerminalLine => ({
  id: lineSeq++,
  kind,
  text,
});

export function Terminal({
  onGoto,
  onSecret,
}: {
  onGoto: (region: string) => void;
  onSecret: (id: string) => void;
}) {
  const open = useWorld((s) => s.terminalOpen);
  const setOpen = useWorld((s) => s.setTerminalOpen);
  const lanyard = useWorld((s) => s.lanyard);
  const github = useWorld((s) => s.github);
  const chess = useWorld((s) => s.chess);
  const health = useWorld((s) => s.health);
  const [oracleBusy, setOracleBusy] = useState(false);
  const [lines, setLines] = useState<TerminalLine[]>([
    L("sys", "PRINCE // HEADOUT — DIRECT ACCESS TERMINAL v2.7"),
    L("sys", "connection established. type HELP for the obvious."),
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const game = useGame;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  const out = (...ls: TerminalLine[]) => setLines((prev) => [...prev, ...ls]);

  /* stream an oracle answer into the terminal */
  const askOracle = async (question: string) => {
    if (oracleBusy) {
      out(L("err", "the oracle is still forming a thought"));
      return;
    }
    setOracleBusy(true);
    out(L("sys", `oracle> consulting the neural link: "${question}"`));
    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: question }] }),
      });
      if (res.status === 429) {
        const j = await res.json().catch(() => null);
        out(L("err", `oracle rate field — rest ${j?.retry ?? "60s"}`));
        setOracleBusy(false);
        return;
      }
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("text/event-stream")) {
        const j = await res.json().catch(() => null);
        if (j?.configured === false) out(L("err", "oracle sealed — GROQ_API_KEY not set on this node"));
        else if (j?.error === "key_rejected") out(L("err", "oracle key rejected — rotate GROQ_API_KEY (console.groq.com)"));
        else out(L("err", "oracle unreachable — it will return"));
        setOracleBusy(false);
        return;
      }
      let acc = "";
      let lineId = 0;
      const pushLine = () => {
        lineId = lineSeq++;
        setLines((prev) => [...prev, L("accent", acc || "...")]);
      };
      pushLine();
      let printed = 0;
      for await (const delta of streamOracleDeltas(res)) {
        acc += delta;
        /* update the last oracle line as tokens arrive */
        if (acc.length - printed > 3) {
          printed = acc.length;
          setLines((prev) => {
            const next = [...prev];
            const idx = next.findIndex((l) => l.id === lineId);
            if (idx >= 0) next[idx] = { ...next[idx], text: acc };
            return next;
          });
        }
      }
      setLines((prev) => {
        const next = [...prev];
        const idx = next.findIndex((l) => l.id === lineId);
        if (idx >= 0) next[idx] = { ...next[idx], text: acc };
        return next;
      });
      useGame.getState().discover("core-oracle");
      useGame.getState().unlockAchievement("neural-whisperer");
    } catch {
      out(L("err", "signal lost mid-thought"));
    } finally {
      setOracleBusy(false);
    }
  };

  const run = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    out(L("cmd", cmd));
    playSound("key");
    game.getState().recordCommand(cmd);
    setHistory((h) => [cmd, ...h]);
    setHistIdx(-1);
    const [head, ...args] = cmd.toLowerCase().split(/\s+/);
    const g = game.getState();

    switch (head) {
      case "oracle": {
        const question = cmd.split(/^(oracle|ask)\s+/i)[2];
        if (!question) {
          out(L("out", "usage: ask <question> — the world's mind answers"));
          out(L("out", "       oracle — open the neural link in Central Core"));
          break;
        }
        void askOracle(question);
        break;
      }

      case "ask": {
        const question = cmd.split(/^(oracle|ask)\s+/i)[2];
        if (!question) {
          out(L("out", "usage: ask <question>"));
          break;
        }
        void askOracle(question);
        break;
      }

      case "narrate": {
        out(L("sys", "oracle> reading live world state..."));
        void askOracle(
          "Narrate what is happening in Prince's world right now based on the live world state you have access to."
        );
        break;
      }

      /* ── public ─────────────────────────────── */
      case "help":
      case "?":
        out(...PUBLIC_HELP.map((l) => L("out", l)));
        break;

      case "status": {
        out(L("accent", "WORLD STATUS"));
        out(
          L("out", `presence      ${derivePresenceLine(lanyard)}`)
        );
        out(L("out", `discord       ${health.discord.state.toUpperCase()}${health.discord.lastSync ? ` — synced ${secondsSince(health.discord.lastSync)}s ago` : ""}`));
        out(L("out", `github        ${health.github.state.toUpperCase()}`));
        out(L("out", `chess         ${health.chess.state.toUpperCase()}`));
        out(L("out", `spotify       ${health.spotify.state === "live" ? "LIVE (enrichment)" : "NOT CONNECTED (enrichment)"}`));
        out(L("out", `gaming        PRESENCE-DRIVEN — ${lanyard?.activities.some((a) => a.type === 0) ? "IN GAME" : "NO MATCH"}`));
        out(L("out", `identity      ${IDENTITY.name} — @${IDENTITY.handle}`));
        break;
      }

      case "whoami": {
        g.discover("term-whoami");
        out(L("accent", "IDENTITY:"));
        out(L("out", "  PRINCE"));
        out(L("accent", "TRAITS:"));
        out(L("out", "  MULTITASKER"));
        out(L("out", "  MULTITALENTED"));
        out(L("out", "  TECH ENTHUSIAST"));
        out(L("accent", "DIGITAL PRESENCE:"));
        out(L("out", `  ${lanyard && lanyard.discord_status !== "offline" ? "ACTIVE" : "LAST KNOWN STATE PRESERVED"}`));
        break;
      }

      case "scan": {
        g.discover("term-scan");
        const live = Object.values(health).filter((h) => h.state === "live").length;
        const unknownSignals = 3 - g.foundSecrets.length;
        out(L("sys", "SCANNING WORLD..."));
        setTimeout(() => {
          out(
            L("out", `${REGIONS.length} REGIONS FOUND`),
            L("out", `${live} LIVE SYSTEMS`),
            L("out", `${g.discoveries.length} DISCOVERIES LOGGED / ${DISCOVERIES.length}`),
            L("out", `${Math.max(0, unknownSignals)} UNKNOWN SIGNALS${unknownSignals > 0 ? " — THEY MOVE WHEN YOU LOOK" : " — RESOLVED"}`)
          );
        }, 500);
        break;
      }

      case "map":
        out(L("accent", "REGION INDEX"));
        REGIONS.filter((r) => !r.secret || g.unknownRevealed).forEach((r) =>
          out(L("out", `  ${r.code}  ${r.name.padEnd(18)} ${g.visitedRegions.includes(r.id) ? "[visited]" : "[undiscovered]"}`))
        );
        out(L("out", "use: goto <region-id>"));
        break;

      case "github": {
        if (!github) {
          out(L("err", "GITHUB ADAPTER: CONNECTION INTERRUPTED — last known state preserved"));
          break;
        }
        out(L("accent", `CODE CITY — ${github.public_repos} STRUCTURES`));
        github.repos.slice(0, 6).forEach((r) => {
          out(L("out", `  ${r.name.padEnd(22)} ${r.language ?? "—"}  ★${r.stars}  ⑂${r.forks}`));
        });
        break;
      }

      case "discord": {
        if (!lanyard) {
          out(L("err", "SIGNAL UNRESOLVED — relay unreachable"));
          break;
        }
        out(L("accent", "PRESENCE RELAY — LIVE"));
        out(L("out", `  status    ${lanyard.discord_status.toUpperCase()}`));
        out(L("out", `  handle    ${lanyard.discord_user?.username ?? IDENTITY.accounts.discord.username}`));
        const acts = lanyard.activities.filter((a) => a.type !== 4);
        if (acts.length) {
          out(L("out", "  activities:"));
          acts.forEach((a) => out(L("out", `    ${a.type === 2 ? "listening to" : a.type === 0 ? "playing" : "watching"} ${a.name}${a.details ? ` — ${a.details}` : ""}`)));
        } else {
          out(L("out", "  activities: none visible"));
        }
        break;
      }

      case "spotify": {
        if (lanyard?.listening_to_spotify && lanyard.spotify) {
          out(L("accent", "MUSIC DISTRICT — LIVE FREQUENCY"));
          out(L("out", `  track     ${lanyard.spotify.song}`));
          out(L("out", `  artist    ${lanyard.spotify.artist}`));
          out(L("out", `  album     ${lanyard.spotify.album}`));
        } else {
          out(L("out", "MUSIC DISTRICT — silent. no live frequency."));
          out(L("out", "the district lights up when something plays."));
        }
        break;
      }

      case "chess": {
        if (!chess) {
          out(L("err", "ARENA SEALED — adapter interrupted"));
          break;
        }
        out(L("accent", `CHESS ARENA — ${chess.username}`));
        ["chess_blitz", "chess_rapid", "chess_bullet"].forEach((k) => {
          const s = (chess.stats as any)[k];
          if (s?.rating) out(L("out", `  ${k.replace("chess_", "").padEnd(7)} ${s.rating}`));
        });
        if (chess.recentGames[0]) {
          const gme = chess.recentGames[0];
          out(L("out", `  last game  ${gme.myResult?.toUpperCase()} vs ${gme.myColor === "white" ? gme.black.name : gme.white.name}`));
        }
        break;
      }

      case "gaming": {
        const inGame = lanyard?.activities.find((a) => a.type === 0);
        out(L("accent", "GAMING ZONE"));
        out(L("out", `  riot id    ${IDENTITY.accounts.riot.id}`));
        out(L("out", `  state      ${inGame ? `IN GAME — ${inGame.name}` : "arena silent"}`));
        out(L("out", "  rank data  UNAVAILABLE — riot api not active. nothing faked."));
        break;
      }

      case "social":
        out(L("accent", "SOCIAL WEB"));
        out(L("out", "  live      discord · github · chess · spotify(when playing)"));
        out(L("out", "  static    instagram — @prince.ascending"));
        out(L("out", "  standby   youtube · reddit · x · telegram — adapters ready"));
        break;

      case "lab":
        out(L("out", "5 experiments registered. 005 remains sealed for most visitors."));
        onGoto("lab");
        break;

      case "archive":
        out(L("out", "opening memory vault..."));
        onGoto("archive");
        break;

      case "discoveries": {
        out(L("accent", `DISCOVERY LOG — ${g.discoveries.length}/${DISCOVERIES.length}`));
        DISCOVERIES.forEach((d) => {
          const found = g.discoveries.includes(d.id);
          out(L("out", `  ${found ? "▣" : "▢"} ${found ? d.name : "??????????"}`));
        });
        break;
      }

      case "achievements": {
        out(L("accent", `ACHIEVEMENTS — ${g.achievements.length}/${ACHIEVEMENTS.length}`));
        ACHIEVEMENTS.forEach((a) => {
          const got = g.achievements.includes(a.id);
          out(L("out", `  ${got ? "◆" : "◇"} ${got ? a.name : a.secret ? "??????????" : a.name}`));
        });
        break;
      }

      case "goto": {
        const target = args[0];
        if (!target) {
          out(L("err", "usage: goto <region> — try: map"));
          break;
        }
        const r = REGIONS.find(
          (x) => x.id === target || x.name.toLowerCase().includes(target)
        );
        if (!r) {
          out(L("err", `no region matches "${target}"`));
          break;
        }
        out(L("sys", `traveling to ${r.name}...`));
        onGoto(r.id);
        break;
      }

      case "sound": {
        if (args[0] === "on" || args[0] === "off") {
          setSoundEnabled(args[0] === "on");
          out(L("out", `audio ${args[0] === "on" ? "engaged" : "muted"}`));
        } else {
          out(L("out", `audio is ${isSoundEnabled() ? "ON" : "OFF"} — usage: sound on|off`));
        }
        break;
      }

      case "clear":
        setLines([]);
        return;

      /* ── hidden commands ────────────────────── */
      case "sudo": {
        out(L("err", "prince is not in the sudoers file. this incident has been logged."));
        out(L("out", "..."));
        setTimeout(() => {
          out(L("sys", "just kidding. root respects curiosity."));
          g.unlockAchievement("root-access");
          playSound("secret");
        }, 900);
        break;
      }

      case "void": {
        out(L("sys", "you found the emptier rooms."));
        setTimeout(() => onSecret("void"), 600);
        break;
      }

      case "root": {
        out(L("sys", "descending to the privileged layer..."));
        setTimeout(() => onSecret("root"), 500);
        break;
      }

      case "aizen":
      case "illusion": {
        out(L("err", "you looked. it was already looking."));
        setTimeout(() => onSecret("aizen"), 700);
        break;
      }

      case "fury":
        out(L("accent", '"Better path to power is fury."'));
        out(L("out", "some sentences are load-bearing. this one holds up a whole person."));
        break;

      case "wake": {
        out(L("sys", "waking the deep layer..."));
        setTimeout(() => onSecret("wake"), 700);
        break;
      }

      case "echo": {
        out(L("sys", "the well answers."));
        setTimeout(() => onSecret("echo"), 500);
        break;
      }

      case "konoha":
        out(L("out", "a leaf drifts through the terminal and vanishes."));
        out(L("out", "the archive mentions a weakening seal. some villages are states of mind."));
        break;

      case "hueco":
      case "hueco-mundo":
        out(L("out", "the sky here is made of night. the moon watches back."));
        out(L("out", "every mirror in this world is borrowed from somewhere darker."));
        break;

      case "kailash":
        out(L("out", "a low saffron hum rises from the music district."));
        out(L("out", "kailash kher — the voice this district is tuned to."));
        break;

      case "clutch":
        out(L("out", "1v5. spike planted. hands steady. arena remembers."));
        break;

      case "9713":
        out(L("out", "...you read the discord id from somewhere. 971329961313046578."));
        out(L("out", "identity echo confirmed. the world sees you seeing it."));
        break;

      case "prince":
        out(L("out", "PRINCE — multitasker, multitalented, tech enthusiast."));
        out(L("out", "builder. explorer. the world is the profile."));
        break;

      case "matrix":
        out(L("out", "there is no matrix. there is only world."));
        break;

      case "ls":
        out(L("out", "regions/  secrets/  memories/  signal.log  .void"));
        break;

      case "cat":
        if (args[0] === "signal.log")
          out(L("out", `[${new Date().toISOString()}] presence=${lanyard?.discord_status ?? "?"} music=${lanyard?.listening_to_spotify ? "on" : "off"} visitor=curious`));
        else if (args[0] === ".void") out(L("err", "permission denied — the void denies you politely"));
        else out(L("err", `cat: ${args[0] ?? ""}: no such file`));
        break;

      case "unknown": {
        out(L("sys", "resolving unresolved source..."));
        g.revealUnknown();
        out(L("out", "UNKNOWN SIGNAL pinned to the map. check the far edge."));
        break;
      }

      case "exit":
        out(L("out", "there is no exit. only exploration."));
        break;

      default: {
        const echoes = g.echoSignals;
        if (echoes >= 1) {
          out(L("err", `command "${head}" not found — or it found you first`));
        } else {
          out(L("err", `command not found: ${head}`));
        }
        if (/secret|hidden|easter/.test(head)) {
          out(L("out", "you are getting warmer. the terminal hides at least 12 commands."));
        }
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 32 }}
          className="fixed z-[40] bottom-0 left-1/2 -translate-x-1/2 w-[min(100vw,44rem)] max-md:left-0 max-md:right-0 max-md:translate-x-0 max-md:w-full glass-deep border border-white/12 border-b-0 scanlines pb-[env(safe-area-inset-bottom)]"
          role="dialog"
          aria-label="Terminal"
        >
          {/* title bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-wx-green wx-animate-pulse" aria-hidden />
              <span className="font-mono text-[10.5px] tracking-[0.25em] text-wx-dim">
                TERMINAL — prince@world
              </span>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                playSound("close");
              }}
              className="font-mono text-[11px] text-wx-dim hover:text-white transition-colors px-2 py-1"
              aria-label="Close terminal"
            >
              [ESC]
            </button>
          </div>

          {/* output */}
          <div
            ref={scrollRef}
            className="h-56 max-md:h-64 sm:h-72 overflow-y-auto wx-scroll px-4 py-3 font-mono text-[11.5px] sm:text-[12px] leading-[1.75]"
            aria-live="polite"
          >
            {lines.map((l) => (
              <div
                key={l.id}
                className={
                  l.kind === "cmd"
                    ? "text-white"
                    : l.kind === "err"
                      ? "text-wx-red/80"
                      : l.kind === "sys"
                        ? "text-wx-cyan/75"
                        : l.kind === "accent"
                          ? "text-wx-violet"
                          : "text-foreground/60"
                }
              >
                {l.kind === "cmd" ? <span className="text-wx-cyan/60">prince@world:~$ </span> : null}
                <span className="whitespace-pre-wrap">{l.text}</span>
              </div>
            ))}
          </div>

          {/* input */}
          <form
            className="flex items-center gap-2 px-4 py-3 border-t border-white/8"
            onSubmit={(e) => {
              e.preventDefault();
              run(input);
              setInput("");
            }}
          >
            <span className="font-mono text-[11.5px] sm:text-[12px] text-wx-cyan/70 shrink-0">
              prince@world:~$
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                playSound("key");
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const next = Math.min(history.length - 1, histIdx + 1);
                  if (history[next] !== undefined) {
                    setHistIdx(next);
                    setInput(history[next]);
                  }
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const next = histIdx - 1;
                  setHistIdx(next);
                  setInput(next >= 0 ? history[next] ?? "" : "");
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
                e.stopPropagation();
              }}
              className="flex-1 min-w-0 bg-transparent border-none outline-none font-mono text-[12px] sm:text-[12.5px] text-white placeholder:text-wx-dim/70"
              placeholder="type a command... (help)"
              aria-label="Terminal input"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="wx-animate-blink text-wx-cyan" aria-hidden>
              ▌
            </span>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
