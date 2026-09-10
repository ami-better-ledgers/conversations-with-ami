// Cloudflare Pages Function — served at /api/transcript?episode=<number>
//
// Proxies the episode's transcript file from Riverside. This has to go
// through our own server: Riverside's transcript files don't send
// Access-Control-Allow-Origin, so a direct fetch() from the visitor's
// browser is blocked by CORS. A server-to-server fetch (this Function
// calling Riverside) has no such restriction — the browser only ever
// talks to our own domain.

import { fetchEpisodes } from "../_lib/rss.js";

export async function onRequestGet(context) {
  const episodeNumber = new URL(context.request.url).searchParams.get("episode");
  if (!episodeNumber) {
    return jsonResponse({ error: "Missing episode parameter." }, 400);
  }

  try {
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
