import { NextResponse } from "next/server";
import type { SpotifyData } from "@/types";

/* ═══════════════════════════════════════════════════════════
   Spotify enrichment — client-credentials, server-only.
   Fetches PUBLIC data for a favorite artist (Kailash Kher).
   Real-time listening comes from Lanyard, not here.
   Secrets live in env vars; nothing is exposed client-side.
   ═══════════════════════════════════════════════════════════ */

export const revalidate = 3600;

export async function GET() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!id || !secret) {
    return NextResponse.json<SpotifyData>({ configured: false });
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(9000),
    });
    if (!tokenRes.ok) throw new Error("token_failed");
    const { access_token } = await tokenRes.json();

    const searchRes = await fetch(
      "https://api.spotify.com/v1/search?q=Kailash%20Kher&type=artist&limit=1",
      { headers: { Authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(9000) }
    );
    if (!searchRes.ok) throw new Error("search_failed");
    const search = await searchRes.json();
    const artist = search.artists?.items?.[0];
    if (!artist) throw new Error("artist_not_found");

    const topRes = await fetch(
      `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`,
      { headers: { Authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(9000) }
    );
    if (!topRes.ok) throw new Error("top_failed");
    const top = await topRes.json();

    const data: SpotifyData = {
      configured: true,
      artist: {
        name: artist.name,
        followers: artist.followers?.total,
        genres: artist.genres?.slice(0, 4),
        image: artist.images?.[0]?.url,
      },
      topTracks: (top.tracks ?? []).slice(0, 6).map((t: any) => ({
        name: t.name,
        album: t.album?.name ?? "",
        art: t.album?.images?.[0]?.url ?? "",
        url: t.external_urls?.spotify ?? "",
        popularity: t.popularity,
      })),
    };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json<SpotifyData>({ configured: false }, { status: 200 });
  }
}
