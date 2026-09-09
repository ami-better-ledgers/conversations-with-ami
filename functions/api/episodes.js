// Cloudflare Pages Function — served at /api/episodes
//
// Reads the RSS feed URL from an environment variable so nothing
// sensitive or editable lives in client-side code.
//
// SET THIS UP IN CLOUDFLARE:
//   Pages project > Settings > Environment variables
//   Name:  PODCAST_RSS_URL
//   Value: (the RSS feed URL from Riverside / your podcast host)
//   Add it to both "Production" and "Preview" environments, then redeploy.

import { fetchEpisodes } from "../_lib/rss.js";

export async function onRequestGet(context) {
  try {
    const episodes = await fetchEpisodes(context.env);
    return jsonResponse({ episodes }, 200, 900);
  } catch (err) {
    return jsonResponse({ error: "Could not fetch or parse the feed.", detail: String(err) }, 502);
  }
}

function jsonResponse(data, status, cacheSeconds) {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (cacheSeconds) headers["Cache-Control"] = `public, max-age=${cacheSeconds}`;
  return new Response(JSON.stringify(data), { status, headers });
}
