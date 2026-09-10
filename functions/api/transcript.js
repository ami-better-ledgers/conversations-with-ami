// Cloudflare Pages Function — served at /api/transcript?episode=<number>
//
// Prefers Ami's own transcript (a Drive-hosted .txt file per episode,
// linked from a Google Sheet and parsed for real per-line timestamps —
// see functions/_lib/episode-extras.js) since that's what makes the
// transcript popup's "jump to this moment" links possible. Falls back
// to Riverside's plain transcript file (no timestamps at all) for any
// episode not yet in that sheet.
//
// Both sources have to be proxied through here rather than fetched
// directly from the visitor's browser: neither Riverside's file nor a
// Drive download sends Access-Control-Allow-Origin, so a client-side
// fetch() would be blocked by CORS. A server-to-server fetch (this
// Function calling out) has no such restriction.

import { fetchEpisodes } from "../_lib/rss.js";
import { fetchTranscriptForEpisode } from "../_lib/episode-extras.js";

export async function onRequestGet(context) {
  const episodeNumber = new URL(context.request.url).searchParams.get("episode");
  if (!episodeNumber) {
    return jsonResponse({ error: "Missing episode parameter." }, 400);
  }

  try {
    const lines = await fetchTranscriptForEpisode(context.env, episodeNumber);
    if (lines.length) {
      return jsonResponse({ lines }, 200, 600);
    }

    const episodes = await fetchEpisodes(context.env);
    const item = episodes.find((ep) => ep.episode === episodeNumber);

    if (!item || !item.transcriptUrl) {
      return jsonResponse({ error: "No transcript available for this episode." }, 404);
    }

    const res = await fetch(item.transcriptUrl, { cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!res.ok) {
      return jsonResponse({ error: `Transcript responded with ${res.status}` }, 502);
    }

    const transcript = await res.text();
    return jsonResponse({ transcript }, 200, 86400);
  } catch (err) {
    return jsonResponse({ error: "Could not fetch the transcript.", detail: String(err) }, 502);
  }
}

function jsonResponse(data, status, cacheSeconds) {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (cacheSeconds) headers["Cache-Control"] = `public, max-age=${cacheSeconds}`;
  return new Response(JSON.stringify(data), { status, headers });
}
