"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWorld, derivePresenceLine } from "@/lib/world/store";
import { useGame } from "@/lib/game/store";
import { playSound } from "@/lib/audio/sound";
import { Chip, LiveIndicator, SectionTitle, SystemLabel } from "@/components/ui/holo/primitives";
import { EASE_EXPO, SPRING_HUD, fadeUp } from "@/lib/world/motion";
import { streamOracleDeltas } from "@/lib/world/sse";

/* ═══════════════════════════════════════════════════════════
   ORACLE — neural link. Talk to the world's mind.
   Streams from /api/oracle (key stays server-side, always).
   ═══════════════════════════════════════════════════════════ */

type OracleMsg = { role: "user" | "oracle"; text: string };

type OracleState = "unknown" | "sealed" | "key_rejected" | "busy" | "live";

const SUGGESTIONS = [
  "Who is Prince?",
  "What is he doing right now?",
  "Tell me about the hidden sectors",
  "Narrate the world's live state",
];

function buildWorldState() {
  const w = useWorld.getState();
  const l = w.lanyard;
  const acts = l?.activities.filter((a) => a.type !== 4).map((a) => `${a.name}${a.details ? ` (${a.details})` : ""}`) ?? [];
  return {
    time: new Date().toISOString(),
    presence: {
      status: l?.discord_status ?? "unknown",
      line: derivePresenceLine(l),
      activities: acts,
      listening: l?.listening_to_spotify
        ? { track: l.spotify?.song, artist: l.spotify?.artist, album: l.spotify?.album }
        : null,
      devices: l
        ? [
            l.active_on_discord_desktop && "desktop",
            l.active_on_discord_mobile && "mobile",
            l.active_on_discord_web && "web",
          ].filter(Boolean)
        : [],
    },
    github: w.github
      ? {
          repos: w.github.public_repos,
          names: w.github.repos.slice(0, 6).map((r) => r.name),
          latestEvent: w.github.events[0]
            ? `${w.github.events[0].repo}: ${w.github.events[0].payload_summary} (${w.github.events[0].created_at})`
            : null,
        }
      : null,
    chess: w.chess
      ? {
          blitz: w.chess.stats.chess_blitz?.rating,
          rapid: w.chess.stats.chess_rapid?.rating,
          bullet: w.chess.stats.chess_bullet?.rating,
          online: w.chess.isOnline,
          lastGame: w.chess.recentGames[0]
            ? `${w.chess.recentGames[0].myResult} vs ${w.chess.recentGames[0].myColor === "white" ? w.chess.recentGames[0].black.name : w.chess.recentGames[0].white.name}`
            : null,
        }
      : null,
    spotifyEnrichment: w.spotify?.configured ? { artist: w.spotify.artist?.name } : null,
  };
}

export function Oracle() {
  const [messages, setMessages] = useState<OracleMsg[]>([]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<OracleState>("unknown");
  const [streaming, setStreaming] = useState(false);
  const [retryNote, setRetryNote] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const discover = useGame((s) => s.discover);
  const unlock = useGame((s) => s.unlockAchievement);
  const bootedOnce = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  /* probe configuration once */
  useEffect(() => {
    if (bootedOnce.current) return;
    bootedOnce.current = true;
    (async () => {
      try {
        const res = await fetch("/api/oracle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [] }),
        });
        const json = await res.json().catch(() => null);
        if (json?.configured === false) setState("sealed");
        else if (json?.error === "key_rejected") setState("key_rejected");
        else setState("live");
      } catch {
        setState("live"); /* optimistic; errors surface on use */
      }
    })();
  }, []);

  const streamOracle = useCallback(
    async (history: OracleMsg[], mode?: "narrate") => {
      setStreaming(true);
      setRetryNote(null);
      playSound("open");
      try {
        const res = await fetch("/api/oracle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "narrate"
              ? { mode: "narrate", worldState: buildWorldState(), messages: [{ role: "user", content: "narrate" }] }
              : {
                  messages: history
                    .filter((m) => m.role === "user" || m.text.length > 0)
                    .slice(-8)
                    .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
                }
          ),
        });

        if (res.status === 429) {
          const j = await res.json().catch(() => null);
          setRetryNote(`RATE FIELD — REST ${j?.retry ?? "60s"}`);
          setState((s) => (s === "sealed" || s === "key_rejected" ? s : "live"));
          setStreaming(false);
          return;
        }

        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("text/event-stream")) {
          const j = await res.json().catch(() => null);
          if (j?.error === "key_rejected" || j?.configured === false) {
            const reason =
              j?.error === "key_rejected"
                ? "THE NEURAL KEY WAS REJECTED. Groq auto-revokes keys exposed in plaintext — generate a fresh one at console.groq.com and set GROQ_API_KEY server-side."
                : "THE ORACLE IS DORMANT — GROQ_API_KEY is not configured on this node. Everything else in the world remains fully alive.";
            setState(j?.error === "key_rejected" ? "key_rejected" : "sealed");
            setMessages((m) => [...m, { role: "oracle", text: reason }]);
          } else {
            setRetryNote("THE ORACLE STUTTERED — TRY AGAIN");
          }
          setStreaming(false);
          return;
        }

        setState("live");
        let acc = "";
        setMessages((m) => [...m, { role: "oracle", text: "" }]);

        for await (const delta of streamOracleDeltas(res)) {
          acc += delta;
          setMessages((m) => {
            const next = [...m];
            next[next.length - 1] = { role: "oracle", text: acc };
            return next;
          });
          if (acc.length % 18 === 0) playSound("key");
        }
        discover("core-oracle");
        unlock("neural-whisperer");
        playSound("confirm");
      } catch {
        setRetryNote("SIGNAL LOST MID-THOUGHT");
      } finally {
        setStreaming(false);
      }
    },
    [discover, unlock]
  );

  const ask = (q: string) => {
    const question = q.trim();
    if (!question || streaming) return;
    const next = [...messages, { role: "user" as const, text: question }];
    setMessages(next);
    setInput("");
    void streamOracle(next);
  };

  const narrate = () => {
    if (streaming) return;
    const next = [...messages, { role: "user" as const, text: "⟡ narrate the live world state" }];
    setMessages(next);
    void streamOracle(next, "narrate");
  };

  const sealed = state === "sealed" || state === "key_rejected";

  return (
    <div className="space-y-3">
      <motion.div variants={fadeUp}>
        <SectionTitle
          right={
            state === "unknown" ? (
              <LiveIndicator state="connecting" label="LINKING" />
            ) : sealed ? (
              <LiveIndicator state="offline" label={state === "key_rejected" ? "KEY REJECTED" : "SEALED"} />
            ) : (
              <LiveIndicator state="live" label="NEURAL LINK" />
            )
          }
        >
          NEURAL LINK — SPEAK TO THE ORACLE
        </SectionTitle>
      </motion.div>

      {/* transcript */}
      <motion.div
        variants={fadeUp}
        ref={scrollRef}
        className="h-56 sm:h-64 overflow-y-auto wx-scroll border border-white/10 bg-black/50 px-3.5 py-3 space-y-3"
        aria-live="polite"
        role="log"
        aria-label="Oracle conversation"
      >
        {messages.length === 0 && !sealed && (
          <div className="text-center py-6">
            <div className="font-mono text-[10px] tracking-[0.3em] text-wx-cyan/70 wx-animate-pulse">
              ◈ THE ORACLE IS LISTENING ◈
            </div>
            <p className="mt-2 font-mono text-[10px] text-wx-dim leading-relaxed">
              Ask it about Prince. The world. The hidden sectors.
              <br />
              It answers with what the world knows — nothing more.
            </p>
          </div>
        )}
        {messages.length === 0 && sealed && (
          <div className="text-center py-6 space-y-2">
            <div className="font-mono text-[10px] tracking-[0.3em] text-wx-dim">
              ORACLE DORMANT
            </div>
            <p className="font-mono text-[10px] text-wx-dim/80 leading-relaxed">
              {state === "key_rejected"
                ? "THE NEURAL KEY WAS REJECTED. GROQ REVOKES KEYS EXPOSED IN PLAINTEXT — GENERATE A FRESH ONE AT CONSOLE.GROQ.COM AND SET GROQ_API_KEY."
                : "THE ORACLE AWAKENS WHEN A GROQ_API_KEY IS CONFIGURED SERVER-SIDE. EVERYTHING ELSE IN THE WORLD REMAINS FULLY ALIVE."}
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={m.role === "user" ? "text-right" : ""}
          >
            <div
              className={
                m.role === "user"
                  ? "inline-block text-left font-mono text-[11px] text-white/90 border border-white/15 bg-white/[0.05] px-3 py-2 max-w-[85%]"
                  : "font-mono text-[11.5px] text-foreground/80 leading-relaxed border-l-2 border-wx-cyan/50 pl-3 whitespace-pre-wrap"
              }
            >
              {m.role === "oracle" && (
                <span className="block font-mono text-[9px] tracking-[0.3em] text-wx-cyan/60 mb-1">
                  ORACLE
                </span>
              )}
              {m.text || (streaming && i === messages.length - 1 ? "▌" : "")}
            </div>
          </motion.div>
        ))}
        {streaming && (
          <div className="font-mono text-[10px] text-wx-cyan/60 wx-animate-pulse pl-3">
            ◈ THINKING...
          </div>
        )}
      </motion.div>

      {/* suggestions — dissolve once the oracle answers */}
      <AnimatePresence>
        {messages.length === 0 && !sealed && (
          <motion.div
            key="suggestions"
            variants={fadeUp}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.25, ease: EASE_EXPO } }}
            className="flex flex-wrap gap-1.5"
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                disabled={streaming}
                className="font-mono text-[9.5px] tracking-wider text-wx-dim border border-white/12 hover:border-wx-cyan/50 hover:text-white px-2.5 py-1.5 clip-tag transition-colors disabled:opacity-40"
              >
                {s.toUpperCase()}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* narrate button */}
      {!sealed && (
        <motion.button
          variants={fadeUp}
          onClick={narrate}
          disabled={streaming}
          className="w-full font-mono text-[10px] tracking-[0.25em] text-wx-violet border border-wx-violet/40 hover:bg-wx-violet/10 px-3 py-2.5 clip-btn transition-colors disabled:opacity-40"
        >
          ⟡ NARRATE LIVE WORLD STATE
        </motion.button>
      )}

      {/* input */}
      <motion.form
        variants={fadeUp}
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={300}
          placeholder={sealed ? "oracle dormant..." : "ask the oracle..."}
          disabled={sealed}
          className="flex-1 min-w-0 bg-white/[0.03] border border-white/12 px-3 py-2.5 font-mono text-[11px] text-white outline-none focus:border-wx-cyan/50 disabled:opacity-40"
          aria-label="Ask the oracle"
        />
        <button
          type="submit"
          disabled={streaming || sealed || !input.trim()}
          className="font-mono text-[10px] tracking-[0.2em] border border-wx-cyan/40 text-wx-cyan px-3.5 clip-btn hover:bg-wx-cyan/10 disabled:opacity-40 transition-colors"
        >
          {streaming ? "..." : "ASK"}
        </button>
      </motion.form>

      {retryNote && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_HUD}
          className="font-mono text-[10px] text-wx-amber text-center"
        >
          {retryNote}
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="flex flex-wrap gap-2 pt-1">
        <Chip color="#55e6ff">GROQ · SERVER-ONLY KEY</Chip>
        <Chip>RATE-LIMITED 6/MIN · 40/DAY</Chip>
        <Chip>PUBLIC IDENTITY ONLY</Chip>
      </motion.div>
    </div>
  );
}
