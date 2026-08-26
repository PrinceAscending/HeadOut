"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RegionPanelShell } from "./RegionPanelShell";
import { useGame } from "@/lib/game/store";
import { playSound } from "@/lib/audio/sound";
import { Chip, MetricDisplay, SectionTitle, SystemLabel } from "@/components/ui/holo/primitives";
import { fadeUp } from "@/lib/world/motion";
import { useWorld } from "@/lib/world/store";
import { DISCOVERIES, ACHIEVEMENTS } from "@/lib/game/catalog";

/* ═══════════════════════════════════════════════════════════
   Archive — memory vault: identity timeline, discovery log,
   privacy charter. Includes a seal that is... weakening.
   ═══════════════════════════════════════════════════════════ */

const TIMELINE = [
  {
    year: "ORIGIN",
    title: "FIRST BOOT",
    body: "A machine, a connection, and a kid who wanted to know how both worked. Everything after this is iteration.",
  },
  {
    year: "EARLY",
    title: "THE PARALLEL HABIT",
    body: "Code in one window. A game lobby in another. Music underneath it all. The multitasking pattern was already there — it just hadn't been named yet.",
  },
  {
    year: "GROWTH",
    title: "MULTI-TRACK",
    body: "Repositories appear. A chess account sharpens. A Valorant rank climbs. Skills don't compete for space; they compound.",
  },
  {
    year: "NOW",
    title: "ASCENDING",
    body: "The handle says it: PrinceAscending. Still building, still playing, still listening — all at once, on purpose.",
  },
];

function SealFragment() {
  const [cracked, setCracked] = useState(false);
  const discover = useGame((s) => s.discover);
  return (
    <motion.div
      variants={fadeUp}
      className="relative border border-white/8 bg-black/40 p-4 clip-panel overflow-hidden"
    >
      <SystemLabel>RECOVERED FRAGMENT — INTEGRITY 61%</SystemLabel>
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-foreground/40 tracking-wider">
        ...archive notes recovered from a corrupted sector. most of the text is
        gone. what remains: a spiral symbol, nine rotations, and a single
        legible line —
      </p>
      <button
        onClick={() => {
          if (!cracked) {
            setCracked(true);
            playSound("secret");
            discover("archive-seal");
          }
        }}
        className="mt-3 font-mono text-[11px] tracking-[0.3em] text-wx-dim hover:text-wx-amber transition-colors"
        aria-label="Read the legible line"
      >
        {cracked ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-wx-amber"
          >
            &ldquo;THE SEAL WEAKENS. WHAT WAS LOCKED LEARNS TO LEAK.&rdquo;
          </motion.span>
        ) : (
          <span className="opacity-60">[ READ THE LINE ]</span>
        )}
      </button>
    </motion.div>
  );
}

export function Archive() {
  const discoveries = useGame((s) => s.discoveries);
  const achievements = useGame((s) => s.achievements);
  const visited = useGame((s) => s.visitedRegions);
  const github = useWorld((s) => s.github);
  const chess = useWorld((s) => s.chess);
  const [readAll, setReadAll] = useState(false);

  useEffect(() => {
    if (readAll) {
      useGame.getState().discover("archive-timeline");
    }
  }, [readAll]);

  return (
    <RegionPanelShell regionId="archive">
      <div className="space-y-6">
        <motion.div variants={fadeUp}>
          <SectionTitle>MEMORY TIMELINE</SectionTitle>
          <div className="relative pl-5 space-y-5">
            <span
              className="absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-wx-cyan/40 via-white/10 to-transparent"
              aria-hidden
            />
            {TIMELINE.map((t, i) => (
              <motion.div key={t.title} variants={fadeUp} className="relative">
                <span
                  className="absolute -left-5 top-1 w-[9px] h-[9px] border bg-[#04040a]"
                  style={{ borderColor: i === TIMELINE.length - 1 ? "var(--wx-cyan)" : "rgba(255,255,255,0.25)" }}
                  aria-hidden
                />
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] tracking-[0.3em] text-wx-dim">
                    {t.year}
                  </span>
                  <span className="font-sans text-sm font-semibold tracking-[0.15em] text-foreground/90">
                    {t.title}
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/50 font-light">
                  {t.body}
                </p>
              </motion.div>
            ))}
          </div>
          {!readAll && (
            <button
              onClick={() => {
                setReadAll(true);
                playSound("confirm");
              }}
              className="mt-4 font-mono text-[10px] tracking-[0.3em] text-wx-cyan border border-wx-cyan/30 px-3 py-1.5 clip-btn hover:bg-wx-cyan/10 transition-colors"
            >
              [ MARK TIMELINE AS READ ]
            </button>
          )}
        </motion.div>

        <SealFragment />

        <motion.div variants={fadeUp}>
          <SectionTitle>VISITOR RECORD</SectionTitle>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MetricDisplay
              className="border border-white/8 py-3 clip-panel"
              label="REGIONS"
              value={
                <>
                  {visited.length}
                  <span className="text-wx-dim text-sm">/10</span>
                </>
              }
            />
            <MetricDisplay
              className="border border-white/8 py-3 clip-panel"
              label="DISCOVERIES"
              value={
                <>
                  {discoveries.length}
                  <span className="text-wx-dim text-sm">/{DISCOVERIES.length}</span>
                </>
              }
            />
            <MetricDisplay
              className="border border-white/8 py-3 clip-panel"
              label="ACHIEVEMENTS"
              value={
                <>
                  {achievements.length}
                  <span className="text-wx-dim text-sm">/{ACHIEVEMENTS.length}</span>
                </>
              }
            />
          </div>
          <div className="mt-3 font-mono text-[9.5px] text-wx-dim/60 tracking-wider">
            PROGRESS LIVES IN YOUR BROWSER ONLY — NOTHING IS UPLOADED, NOTHING
            TRACKED SERVER-SIDE.
          </div>
        </motion.div>

        {(github || chess) && (
          <motion.div variants={fadeUp}>
            <SectionTitle>ARCHIVED SYSTEMS</SectionTitle>
            <div className="space-y-1.5 font-mono text-[10px]">
              {github && (
                <div className="flex justify-between text-foreground/60">
                  <span>GITHUB NODE</span>
                  <span className="text-wx-dim">
                    EST. {new Date(github.created_at).toLocaleDateString()} · {github.public_repos} STRUCTURES
                  </span>
                </div>
              )}
              {chess && (
                <div className="flex justify-between text-foreground/60">
                  <span>CHESS NODE</span>
                  <span className="text-wx-dim">
                    EST. {new Date(chess.joined * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <SectionTitle>PRIVACY / DATA CHARTER</SectionTitle>
          <ul className="space-y-2 text-[11px] leading-relaxed text-foreground/50 font-light list-none">
            <li>— Every signal on this world is PUBLIC data: Discord presence via Lanyard, GitHub repositories, Chess.com statistics, Spotify status when shared.</li>
            <li>— No tokens, credentials or secrets ever reach the browser. Server-side keys live only in environment variables.</li>
            <li>— No private messages, private repositories, emails, phone numbers or precise locations are — or can be — displayed.</li>
            <li>— Your exploration progress is stored locally in your browser and never transmitted.</li>
          </ul>
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
          <Chip>LOCAL PROGRESS ONLY</Chip>
          <Chip>PUBLIC APIs ONLY</Chip>
        </motion.div>
      </div>
    </RegionPanelShell>
  );
}
