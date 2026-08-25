# PRINCE // WORLD

> An explorable real-time digital universe.
> **The website is not the profile — the website is the experience of discovering Prince.**

**Live at [princeheadout.vercel.app](https://princeheadout.vercel.app)**

Enter through a cinematic boot sequence, orbit a living WebGL world map, and discover ten regions driven by real, live signals: Discord presence, GitHub repositories, Chess.com ratings, Spotify listening. Everything else — the terminal, the lab, the void — is hidden until you find it.

## The Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **React Three Fiber / three.js** — the explorable world map
- **Framer Motion** — cinematic transitions
- **cmdk** — ⌘K world command palette
- **Zustand** — world state + local discovery persistence
- **WebAudio** — every sound is synthesized at runtime (zero audio files)

## Live Integrations (all public data, no fabrication)

| Signal | Source | Realtime? |
|---|---|---|
| Discord presence / activities / Spotify status | Lanyard WebSocket | ✅ live |
| Repositories, activity feed | GitHub public API (server-cached) | ✅ polled |
| Ratings, records, replays | Chess.com PubAPI (server-cached) | ✅ polled |
| Music District now-playing | via Lanyard Spotify activity | ✅ live |
| Valorant arena state | via Discord presence | ✅ live |
| Spotify artist enrichment | Spotify API (env-gated) | optional |

Adapter architecture lives in `src/lib/integrations/` — Riot, Steam, YouTube, Reddit, X, Telegram adapters are scaffolded with clean fallback states and activate when credentials are configured. **No fake stats. Ever.**

## AI Oracle (Groq)

The **NEURAL LINK** inside Central Core (plus terminal `ask <question>` and `narrate`) is powered by Groq — server-side only via `GROQ_API_KEY`:

- Key lives only in env vars (`.env.local` locally, Vercel dashboard in production) — never shipped to the browser
- Hardened: per-IP rate limit (6/min, 40/day), message caps, length caps, prompt-injection-resistant system prompt
- The oracle only knows Prince's PUBLIC identity and live world state — it refuses to fabricate stats or reveal private info
- No key / invalid key → the oracle shows a designed dormant state; the rest of the world is unaffected

## The Game Layer

- **Discovery system** — 24 discoveries, 12 achievements, 10 regions, persisted in `localStorage` (never uploaded)
- **Terminal** — `help`, `status`, `whoami`, `scan`, `map`, `goto <region>`… and at least a dozen hidden commands
- **Secret rooms** — the void, root, a mirror chamber, an echo well, forgotten memories, and a signal you can resolve
- **Easter eggs** — konami code, `Shift+V`, a logo that notices persistence, a rare "signal fault" that is actually a portal, a chamber that breaks when you try
- **Command palette** — `⌘K / Ctrl+K` for fast travel

## Development

```bash
bun install
bun run dev        # http://localhost:3000
bun run lint
```

Optional integrations activate when you copy `.env.example` → `.env.local` and fill keys.

## Deployment (Vercel)

1. Push to GitHub
2. Import repo on Vercel (framework auto-detected: Next.js)
3. Optionally set `GITHUB_TOKEN`, `SPOTIFY_CLIENT_ID/SECRET`, etc. as env vars
4. Deploy — API routes run as serverless functions with caching

## Privacy

Everything displayed is public data. No tokens or secrets reach the browser. Visitor progress stays in the visitor's browser. See the PRIVACY / DATA section inside the world's ARCHIVE region.

## License

Released under the [MIT License](./LICENSE).

---

`ENTER · EXPLORE · CONNECT · DISCOVER · UNLOCK · MEET PRINCE`
