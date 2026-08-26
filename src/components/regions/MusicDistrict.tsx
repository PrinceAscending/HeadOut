"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RegionPanelShell } from "./RegionPanelShell";
import { useWorld } from "@/lib/world/store";
import { useGame } from "@/lib/game/store";
import { playSound } from "@/lib/audio/sound";
import { Chip, LiveIndicator, SectionTitle, SystemLabel } from "@/components/ui/holo/primitives";
import { fadeUp } from "@/lib/world/motion";

/* ═══════════════════════════════════════════════════════════
   Music District — reacts to whatever is actually playing.
   Live playback via Lanyard. Enrichment via Spotify API when
   configured. Never fabricated.
   ═══════════════════════════════════════════════════════════ */

/* drawn once per session so offline/online flips and track changes
   never re-randomize the waveform silhouette */
const BAR_LEVELS = Array.from({ length: 28 }, () => 0.2 + Math.random() * 0.8);

function Waveform({ playing, color }: { playing: boolean; color: string }) {
  /* compositor-only: bars keep a fixed height and pulse via scaleY */
  return (
    <div className="flex items-end gap-[3px] h-10" aria-hidden>
      {BAR_LEVELS.map((b, i) => (
        <motion.span
          key={i}
          className="w-[3px] h-full"
          style={{
            background: playing ? color : "rgba(160,190,220,0.16)",
            boxShadow: playing ? `0 0 8px ${color}88` : undefined,
            transformOrigin: "bottom",
          }}
          animate={
            playing
              ? { scaleY: [b * 0.18, b, b * 0.3, b * 0.85, b * 0.18] }
              : { scaleY: b * 0.22 }
          }
          transition={
            playing
              ? {
                  duration: 1.6 + (i % 5) * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.04,
                }
              : { duration: 0.8, ease: "easeInOut" }
          }
        />
      ))}
    </div>
  );
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function NowPlaying() {
  const lanyard = useWorld((s) => s.lanyard);
  const spotify = lanyard?.spotify;
  const playing = !!lanyard?.listening_to_spotify && !!spotify;
  const discover = useGame((s) => s.discover);
  const unlock = useGame((s) => s.unlockAchievement);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => {
    if (playing) {
      discover("music-now");
      unlock("music-detector");
    }

  }, [playing]);

  if (!playing || !spotify) {
    return (
      <motion.div
        variants={fadeUp}
        className="border border-white/8 bg-white/[0.015] p-5 clip-panel text-center"
      >
        <Waveform playing={false} color="#3ddc97" />
        <div className="mt-4 font-mono text-[10px] tracking-[0.3em] text-wx-dim">
          NO LIVE FREQUENCY
        </div>
        <p className="mt-2 text-[11px] text-foreground/45 leading-relaxed font-light">
          The district is still. When music plays on Prince&apos;s end, this room
          lights up in real time — track, artist, artwork, progress.
        </p>
        <div className="mt-3">
          <LiveIndicator state="offline" label="LAST KNOWN — SILENT" />
        </div>
      </motion.div>
    );
  }

  const start = spotify.timestamps.start;
  const end = spotify.timestamps.end;
  const total = Math.max(1, end - start);
  const elapsed = Math.min(Math.max(0, now - start), total);

  return (
    <motion.div
      variants={fadeUp}
      className="relative border border-wx-green/35 bg-wx-green/[0.03] p-5 clip-panel overflow-hidden"
    >
      {/* art aura */}
      <div
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, #3ddc97, transparent 70%)" }}
        aria-hidden
      />
      <div className="flex items-center justify-between">
        <SystemLabel className="text-wx-green">LIVE FREQUENCY</SystemLabel>
        <LiveIndicator state="live" label="STREAMING" />
      </div>
      <div className="mt-4 flex gap-4">
        { }
        <img
          src={spotify.album_art_url}
          alt={`${spotify.album} album artwork`}
          className="w-20 h-20 object-cover border border-wx-green/30 shrink-0"
          style={{ boxShadow: "0 0 30px rgba(61,220,151,0.3)" }}
        />
        <div className="min-w-0 flex-1">
          <div className="font-sans text-lg font-semibold text-white leading-tight truncate">
            {spotify.song}
          </div>
          <div className="font-mono text-[11px] text-foreground/60 truncate mt-0.5">
            {spotify.artist}
          </div>
          <div className="font-mono text-[10px] text-wx-dim truncate mt-0.5 tracking-wider">
            {spotify.album}
          </div>
          <div className="mt-3">
            <Waveform playing color="#3ddc97" />
          </div>
        </div>
      </div>
      {/* progress */}
      <div className="mt-4">
        <div className="flex justify-between font-mono text-[10px] text-wx-dim tabular-nums">
          <span>{fmt(elapsed)}</span>
          <span>{fmt(total)}</span>
        </div>
        <div className="h-[3px] bg-white/8 mt-1 overflow-hidden">
          {/* compositor-only: scaleX instead of width */}
          <div
            className="h-full w-full origin-left transition-transform duration-1000 ease-linear"
            style={{
              transform: `scaleX(${elapsed / total})`,
              background: "linear-gradient(90deg, #3ddc9788, #3ddc97)",
              boxShadow: "0 0 10px #3ddc9766",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* hidden saffron easter egg — Kailash Kher homage */
function SaffronSignal() {
  const [found, setFound] = useState(false);
  const discover = useGame((s) => s.discover);
  return (
    <motion.div variants={fadeUp} className="relative">
      <button
        onClick={() => {
          if (!found) {
            setFound(true);
            playSound("secret");
            discover("music-saffron");
          }
        }}
        className="absolute -top-1 right-0 font-mono text-[9.5px] text-transparent hover:text-amber-400/70 transition-colors tracking-[0.4em]"
        aria-label="A faint inscription"
      >
        स ा
      </button>
      <AnimatePresence>
        {found && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border border-amber-400/30 bg-amber-400/[0.04] p-4 clip-panel"
          >
            <SystemLabel className="text-amber-300">SAFFRON SIGNAL DECODED</SystemLabel>
            <p className="mt-2 text-[12px] leading-relaxed text-foreground/70 font-light">
              Deep in the district&apos;s foundation, one voice is etched into the
              architecture — <span className="text-amber-300">Kailash Kher</span>.
              Sufi-trained, storm-throated. The district&apos;s warmest light
              carries his frequency.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function MusicDistrict() {
  const spotify = useWorld((s) => s.spotify);
  const health = useWorld((s) => s.health.spotify);
  const discover = useGame((s) => s.discover);

  return (
    <RegionPanelShell regionId="music">
      <div className="space-y-6">
        <NowPlaying />
        <SaffronSignal />

        {spotify?.configured && spotify.artist ? (
          <motion.div variants={fadeUp}>
            <SectionTitle
              right={<LiveIndicator state="live" label="SPOTIFY LINK" />}
            >
              DISTRICT FOUNDATION — {spotify.artist.name.toUpperCase()}
            </SectionTitle>
            {spotify.artist.image && (
              <div className="flex gap-4 items-center">
                { }
                <img
                  src={spotify.artist.image}
                  alt={spotify.artist.name}
                  className="w-16 h-16 object-cover border border-amber-400/30"
                />
                <div className="font-mono text-[10px] text-wx-dim space-y-1">
                  {spotify.artist.followers != null && (
                    <div>{spotify.artist.followers.toLocaleString()} LISTENERS IN RANGE</div>
                  )}
                  {spotify.artist.genres && (
                    <div className="text-foreground/50">
                      {(spotify.artist.genres ?? []).join(" · ").toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="mt-4 space-y-1.5">
              {spotify.topTracks?.map((t, i) => (
                <button
                  key={t.url + i}
                  onClick={() => discover("music-taste")}
                  className="w-full flex items-center gap-3 border border-white/8 hover:border-wx-green/40 px-3 py-2 clip-panel transition-colors group"
                >
                  <span className="font-mono text-[10px] text-wx-dim w-4">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {t.art && (

                    <img src={t.art} alt="" className="w-8 h-8 object-cover" />
                  )}
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block font-mono text-[11px] text-foreground/80 group-hover:text-white truncate">
                      {t.name}
                    </span>
                    <span className="block font-mono text-[10px] text-wx-dim truncate">
                      {t.album}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-wx-green/70">
                    {t.popularity ?? "—"}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={fadeUp}
            className="border border-white/8 bg-white/[0.015] p-4 clip-panel"
          >
            <SectionTitle>ARCHIVE LINK</SectionTitle>
            <p className="text-[11px] text-foreground/50 leading-relaxed font-light">
              The district&apos;s long-term archive (top artists, saved history)
              connects through the official Spotify API. Credentials are not
              configured on this node — live playback above is unaffected and
              fully real.
            </p>
            <div className="mt-3">
              <LiveIndicator state="unconfigured" label="SPOTIFY API — NOT CONNECTED" />
            </div>
          </motion.div>
        )}

        <motion.div
          variants={fadeUp}
          className="font-mono text-[10px] leading-relaxed tracking-wider text-wx-dim/70 border-l border-wx-green/25 pl-3"
        >
          THIS DISTRICT SYNCS TO PLAYBACK PROGRESS. PARTICLES OUTSIDE THIS PANEL
          PULSE TO THE SAME CLOCK.
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
          <Chip color="#3ddc97">LANYARD · REALTIME</Chip>
          <Chip>SPOTIFY OAUTH · SERVER-SIDE</Chip>
          <Chip>NO CLIENT CREDENTIALS</Chip>
        </motion.div>
      </div>
    </RegionPanelShell>
  );
}
