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
//
// Each episode is also tagged with pillars/subjects here (same curated
// content or AI-generated fallback used on the individual episode
// pages — see functions/episodes/[slug].js) so the podcast list page
// can show tag badges and search without a second round-trip.

import { fetchEpisodes } from "../_lib/rss.js";
import { curatedByEpisodeNumber } from "../_lib/curated.js";
import { getOrGenerateSummary } from "../_lib/ai-summary.js";

export async function onRequestGet(context) {
  try {
    const episodes = await fetchEpisodes(context.env);
    const enriched = await Promise.all(
      episodes.map(async (ep) => {
        const curated = curatedByEpisodeNumber.get(String(ep.episode)) || (await getOrGenerateSummary(context.env, ep));
        return {
          ...ep,
          pillars: (curated && curated.pillars) || [],
          subjects: (curated && curated.subjects) || [],
        };
      })
    );
    return jsonResponse({ episodes: enriched }, 200, 900);
  } catch (err) {
    return jsonResponse({ error: "Could not fetch or parse the feed.", detail: String(err) }, 502);
  }
}

function jsonResponse(data, status, cacheSeconds) {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (cacheSeconds) headers["Cache-Control"] = `public, max-age=${cacheSeconds}`;
  return new Response(JSON.stringify(data), { status, headers });
}
