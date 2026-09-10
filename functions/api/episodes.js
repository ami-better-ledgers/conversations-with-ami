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

// How many episodes can be generating via the live Claude API at once.
// Without this cap, a cache-wide invalidation (e.g. bumping
// CACHE_VERSION in ai-summary.js) makes every uncached episode call the
// API in the same instant on the first page load afterward, which is
// enough concurrent requests to trip Anthropic's rate limit — most
// come back as failures (cached for an hour) instead of real content,
// even though nothing is actually wrong with any of them. Generating a
// few at a time avoids that burst.
const MAX_CONCURRENT_GENERATIONS = 3;

export async function onRequestGet(context) {
  try {
    const episodes = await fetchEpisodes(context.env);
    const enriched = await mapWithConcurrency(episodes, MAX_CONCURRENT_GENERATIONS, async (ep) => {
      const curated = curatedByEpisodeNumber.get(String(ep.episode)) || (await getOrGenerateSummary(context.env, ep));
      return {
        ...ep,
        pillars: (curated && curated.pillars) || [],
        subjects: (curated && curated.subjects) || [],
      };
    });
    return jsonResponse({ episodes: enriched }, 200, 900);
  } catch (err) {
    return jsonResponse({ error: "Could not fetch or parse the feed.", detail: String(err) }, 502);
  }
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function jsonResponse(data, status, cacheSeconds) {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (cacheSeconds) headers["Cache-Control"] = `public, max-age=${cacheSeconds}`;
  return new Response(JSON.stringify(data), { status, headers });
}
