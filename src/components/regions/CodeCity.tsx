"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RegionPanelShell } from "./RegionPanelShell";
import { useWorld } from "@/lib/world/store";
import { useGame } from "@/lib/game/store";
import { playSound } from "@/lib/audio/sound";
import { Chip, DataRow, LiveIndicator, SectionTitle, SystemLabel } from "@/components/ui/holo/primitives";
import type { GitHubRepo } from "@/types";

/* ═══════════════════════════════════════════════════════════
   Code City — repositories rendered as a data-driven skyline.
   Building height = activity, windows = life, color = language.
   ═══════════════════════════════════════════════════════════ */

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#55e6ff",
  JavaScript: "#ffc857",
  Python: "#8b7bff",
  HTML: "#ff5470",
  CSS: "#5ea8ff",
  Java: "#ff9f5a",
  "C++": "#7d8aa0",
  C: "#9db8dd",
  Rust: "#ff7b72",
  Go: "#3ddc97",
  Shell: "#c9d6ea",
  Vue: "#42e8b0",
  Svelte: "#ff8fc5",
  default: "#6b7a94",
};

const langColor = (l: string | null) => LANG_COLORS[l ?? ""] ?? LANG_COLORS.default;

function daysSince(iso: string | null): number {
  if (!iso) return 9999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function activityScore(r: GitHubRepo): number {
  const d = daysSince(r.pushedAt);
  const recency = Math.max(0, 1 - d / 90); // decay over 90 days
  const star = Math.min(1, r.stars / 20);
  return Math.min(1, 0.15 + recency * 0.75 + star * 0.35);
}

/* ── the skyline ─────────────────────────────────────────── */
function Skyline({ repos }: { repos: GitHubRepo[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const seeds = repos.map(() => Math.random() * 1000);

    const draw = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const groundY = h - 14 * dpr;
      ctx.clearRect(0, 0, w, h);

      /* ground grid */
      ctx.strokeStyle = "rgba(120,160,220,0.1)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 8; i++) {
        const x = (i / 8) * w;
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(w / 2 + (x - w / 2) * 2.2, h);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(w, groundY);
      ctx.strokeStyle = "rgba(140,190,255,0.3)";
      ctx.stroke();

      const n = repos.length || 1;
      const gap = 6 * dpr;
      const bw = Math.max(4 * dpr, (w - gap * (n + 1)) / n);

      repos.forEach((r, i) => {
        const score = activityScore(r);
        const x = gap + i * (bw + gap);
        const maxH = h * 0.72;
        const bh = Math.max(h * 0.1, maxH * (0.25 + score * 0.75));
        const c = langColor(r.language);
        const hovered = hoverIdx === i;

        /* building body */
        ctx.fillStyle = "rgba(14,20,34,0.92)";
        ctx.fillRect(x, groundY - bh, bw, bh);
        ctx.strokeStyle = hovered ? "#ffffffcc" : `${c}77`;
        ctx.lineWidth = hovered ? 1.6 * dpr : 1 * dpr;
        ctx.strokeRect(x, groundY - bh, bw, bh);

        /* antenna on the primary structure */
        if (score > 0.6) {
          ctx.beginPath();
          ctx.moveTo(x + bw / 2, groundY - bh);
          ctx.lineTo(x + bw / 2, groundY - bh - 10 * dpr);
          ctx.strokeStyle = `${c}99`;
          ctx.stroke();
          const blink = (Math.sin(t * 2.5 + i) + 1) / 2;
          ctx.beginPath();
          ctx.arc(x + bw / 2, groundY - bh - 10 * dpr, 1.4 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,120,140,${0.3 + blink * 0.7})`;
          ctx.fill();
        }

        /* windows */
        const rows = Math.floor(bh / (7 * dpr));
        const cols = Math.max(1, Math.floor(bw / (5 * dpr)));
        for (let ry = 0; ry < rows; ry++) {
          for (let rx = 0; rx < cols; rx++) {
            const flicker =
              Math.sin(t * 0.8 + seeds[i] + ry * 3.7 + rx * 1.3 + i) > 0.15 - score * 0.3;
            if (!flicker) continue;
            const wx = x + 2 * dpr + rx * (bw - 4 * dpr) / cols;
            const wy = groundY - bh + 4 * dpr + ry * (bh - 6 * dpr) / rows;
            ctx.fillStyle = `${c}${score > 0.4 ? "cc" : "55"}`;
            ctx.fillRect(wx, wy, 1.6 * dpr, 2 * dpr);
          }
        }

        /* glow base for active */
        if (score > 0.45) {
          const g = ctx.createLinearGradient(0, groundY, 0, groundY - bh);
          g.addColorStop(0, `${c}30`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.fillRect(x, groundY - bh, bw, bh);
        }
      });

      /* labels row */
      ctx.font = `${8 * dpr}px "JetBrains Mono", monospace`;
      ctx.fillStyle = "rgba(160,190,230,0.5)";
      ctx.fillText("CODE CITY — LIVE GRID", 8 * dpr, h - 4 * dpr);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [repos, hoverIdx]);

  return (
    <div className="relative">
      <canvas
        ref={ref}
        className="w-full h-44 border border-white/8 bg-black/40"
        role="img"
        aria-label="Repository skyline — building height maps to repository activity"
      />
      {hoverIdx !== null && repos[hoverIdx] && (
        <div className="absolute top-2 left-2 glass px-2 py-1 font-mono text-[10px] tracking-wider">
          {repos[hoverIdx].name}
        </div>
      )}
    </div>
  );
}

function RepoCard({ repo, onOpen }: { repo: GitHubRepo; onOpen: (r: GitHubRepo) => void }) {
  const d = daysSince(repo.pushedAt);
  const active = d <= 30;
  const dim = d > 180;
  return (
    <button
      onClick={() => {
        playSound("click");
        onOpen(repo);
      }}
      className="w-full text-left border border-white/8 hover:border-wx-violet/50 bg-white/[0.015] hover:bg-wx-violet/[0.05] px-3.5 py-3 clip-panel transition-all group"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[12px] font-medium text-foreground/90 group-hover:text-white tracking-wider truncate">
          {repo.name}
        </span>
        <span
          className="shrink-0 font-mono text-[9.5px] tracking-[0.2em] px-1.5 py-0.5 border clip-tag"
          style={{
            color: langColor(repo.language),
            borderColor: `${langColor(repo.language)}44`,
          }}
        >
          {repo.language ?? "—"}
        </span>
      </div>
      {repo.description && (
        <p className="mt-1.5 text-[11px] text-foreground/50 leading-relaxed line-clamp-2 font-light">
          {repo.description}
        </p>
      )}
      <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-wx-dim">
        <span>★ {repo.stars}</span>
        <span>⑂ {repo.forks}</span>
        <span className={active ? "text-wx-green" : dim ? "text-wx-dim/50" : ""}>
          {d === 0 ? "ACTIVE TODAY" : d === 9999 ? "NO PUSH DATA" : `PUSHED ${d}D AGO`}
        </span>
      </div>
    </button>
  );
}

export function CodeCity() {
  const github = useWorld((s) => s.github);
  const health = useWorld((s) => s.health.github);
  const discover = useGame((s) => s.discover);
  const unlock = useGame((s) => s.unlockAchievement);
  const [selected, setSelected] = useState<GitHubRepo | null>(null);

  const repos = useMemo(
    () => (github?.repos ?? []).slice().sort((a, b) => activityScore(b) - activityScore(a)),
    [github]
  );

  const langDist = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of github?.repos ?? []) {
      if (r.language) m.set(r.language, (m.get(r.language) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [github]);

  const activeCount = repos.filter((r) => daysSince(r.pushedAt) <= 30).length;

  return (
    <RegionPanelShell regionId="code">
      <div className="space-y-6">
        {github ? (
          <>
            <Skyline repos={repos.slice(0, 12)} />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="font-mono text-[10px] tracking-[0.25em] text-wx-dim">STRUCTURES</div>
                <div className="font-sans text-2xl font-semibold tabular-nums">{github.public_repos}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.25em] text-wx-dim">ACTIVE / 30D</div>
                <div className="font-sans text-2xl font-semibold tabular-nums text-wx-green">
                  {activeCount}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.25em] text-wx-dim">CITY AGE</div>
                <div className="font-sans text-2xl font-semibold tabular-nums">
                  {new Date(github.created_at).getFullYear()}
                </div>
              </div>
            </div>

            <div>
              <SectionTitle
                right={
                  <LiveIndicator
                    state={health.state}
                    note={health.lastSync ? `SYNCED ${Math.round((Date.now() - health.lastSync) / 1000)}S AGO` : undefined}
                  />
                }
              >
                STRUCTURES
              </SectionTitle>
              <div className="space-y-2">
                {repos.slice(0, 10).map((r) => (
                  <RepoCard
                    key={r.id}
                    repo={r}
                    onOpen={(rr) => {
                      setSelected(rr);
                      unlock("code-hunter");
                      discover("code-structure");
                    }}
                  />
                ))}
              </div>
            </div>

            {selected && (
              <div className="border border-wx-violet/30 bg-wx-violet/[0.04] p-4 clip-panel space-y-2">
                <div className="flex items-center justify-between">
                  <SystemLabel>STRUCTURE FILE</SystemLabel>
                  <button
                    className="font-mono text-[10px] text-wx-dim hover:text-white"
                    onClick={() => setSelected(null)}
                  >
                    [ CLOSE ]
                  </button>
                </div>
                <DataRow k="NAME" v={selected.name} />
                <DataRow k="STATUS" v={selected.archived ? "ARCHIVED" : daysSince(selected.pushedAt) <= 30 ? "ACTIVE" : "DORMANT"} />
                <DataRow k="CREATED" v={new Date(selected.createdAt).toLocaleDateString()} />
                <DataRow k="LAST PUSH" v={selected.pushedAt ? new Date(selected.pushedAt).toLocaleDateString() : "—"} />
                <DataRow k="STARS" v={selected.stars} />
                <DataRow k="FORKS" v={selected.forks} />
                {selected.homepage && <DataRow k="HOMEPAGE" v={selected.homepage} />}
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 font-mono text-[10px] tracking-[0.25em] text-wx-violet hover:text-white border border-wx-violet/40 px-3 py-1.5 clip-btn"
                >
                  OPEN ON GITHUB →
                </a>
              </div>
            )}

            {langDist.length > 0 && (
              <div>
                <SectionTitle>DIALECT DISTRIBUTION</SectionTitle>
                <div className="space-y-2" onMouseEnter={() => discover("code-language")}>
                  {langDist.slice(0, 5).map(([lang, count]) => (
                    <div key={lang} className="flex items-center gap-3">
                      <span className="w-2 h-2 shrink-0" style={{ background: langColor(lang) }} />
                      <span className="font-mono text-[10px] text-foreground/70 w-24 truncate">{lang}</span>
                      <div className="flex-1 h-[3px] bg-white/6">
                        <div
                          className="h-full"
                          style={{
                            width: `${(count / langDist[0][1]) * 100}%`,
                            background: langColor(lang),
                          }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-wx-dim tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {github.events.length > 0 && (
              <div>
                <SectionTitle>ACTIVITY FEED</SectionTitle>
                <div className="space-y-1.5 font-mono text-[10px]">
                  {github.events.slice(0, 6).map((e) => (
                    <div key={e.id} className="flex gap-2 items-baseline">
                      <span className="text-wx-dim/60 shrink-0">
                        {new Date(e.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-foreground/70 truncate">
                        <span className="text-wx-violet">{e.repo.split("/")[1] ?? e.repo}</span>
                        {" — "}
                        {e.payload_summary}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeCount > 0 && (
              <button
                className="hidden"
                onClick={() => discover("code-activity")}
                aria-hidden
                tabIndex={-1}
              />
            )}
          </>
        ) : (
          <div className="space-y-4 py-8 text-center">
            <div className="font-mono text-[10px] tracking-[0.3em] text-wx-amber">
              {health.state === "connecting" ? "CITY SYNC IN PROGRESS..." : "CONNECTION INTERRUPTED"}
            </div>
            <p className="text-[11px] text-wx-dim leading-relaxed">
              {health.state === "connecting"
                ? "Structures are materializing from live GitHub data."
                : "The city went dark. Last known state is preserved. Live data returns when the signal does."}
            </p>
            <LiveIndicator state={health.state === "connecting" ? "connecting" : "degraded"} />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Chip>GITHUB API · PUBLIC</Chip>
          <Chip>NO PRIVATE DATA</Chip>
          <Chip>ADAPTER: /api/github</Chip>
        </div>
      </div>
    </RegionPanelShell>
  );
}
