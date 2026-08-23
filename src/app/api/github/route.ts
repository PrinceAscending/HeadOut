import { NextResponse } from "next/server";
import type { GitHubData, GitHubEvent, GitHubRepo } from "@/types";

/* ═══════════════════════════════════════════════════════════
   GitHub integration — public API only.
   Optional GITHUB_TOKEN raises rate limits. Cached 10 min.
   ═══════════════════════════════════════════════════════════ */

export const revalidate = 600;

const USER = "PrinceAscending";

function ghHeaders(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "prince-world/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

async function ghFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: ghHeaders(),
    signal: AbortSignal.timeout(9000),
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`GH ${res.status}`);
  return (await res.json()) as T;
}

function summarizeEvent(e: any): GitHubEvent {
  let summary = "";
  switch (e.type) {
    case "PushEvent": {
      const size = e.payload?.size ?? e.payload?.commits?.length;
      summary = size ? `${size} commit${size > 1 ? "s" : ""}` : "pushed code";
      break;
    }
    case "CreateEvent":
      summary = `created ${e.payload?.ref_type ?? "object"} ${e.payload?.ref ?? ""}`.trim();
      break;
    case "WatchEvent":
      summary = "starred";
      break;
    case "ForkEvent":
      summary = "forked";
      break;
    case "IssuesEvent":
      summary = `${e.payload?.action ?? ""} issue`.trim();
      break;
    case "PullRequestEvent":
      summary = `${e.payload?.action ?? ""} PR`.trim();
      break;
    case "IssueCommentEvent":
      summary = "commented";
      break;
    case "ReleaseEvent":
      summary = `release ${e.payload?.release?.tag_name ?? ""}`.trim();
      break;
    case "PublicEvent":
      summary = "made public";
      break;
    default:
      summary = e.type.replace("Event", "").toLowerCase();
  }
  return {
    id: e.id,
    type: e.type,
    repo: e.repo?.name ?? "",
    created_at: e.created_at,
    payload_summary: summary,
  };
}

export async function GET() {
  try {
    const [user, repos, events] = await Promise.all([
      ghFetch<any>(`https://api.github.com/users/${USER}`),
      ghFetch<any[]>(
        `https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`
      ),
      ghFetch<any[]>(
        `https://api.github.com/users/${USER}/events/public?per_page=30`
      ).catch(() => [] as any[]),
    ]);

    const normalized: GitHubData = {
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      public_repos: user.public_repos,
      followers: user.followers,
      following: user.following,
      created_at: user.created_at,
      repos: (repos as any[])
        .filter((r) => !r.fork)
        .map<GitHubRepo>((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          language: r.language,
          stars: r.stargazers_count ?? 0,
          forks: r.forks_count ?? 0,
          pushedAt: r.pushed_at,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          fork: r.fork,
          archived: r.archived,
          url: r.html_url,
          homepage: r.homepage,
          topics: r.topics,
        })),
      events: (events as any[]).slice(0, 12).map(summarizeEvent),
    };

    return NextResponse.json(normalized);
  } catch (err) {
    return NextResponse.json(
      { error: "github_unreachable", detail: String(err) },
      { status: 502 }
    );
  }
}
