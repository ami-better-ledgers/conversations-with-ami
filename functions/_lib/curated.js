// Shared lookup maps for the two hand-written content files, used by
// both the individual episode pages and /api/episodes so the two can't
// drift out of sync on how curated content is found.
//
// content/episodes.json — full hand-written episode entries (summary,
// guest bio, etc.) that override the AI-generated version entirely.
//
// content/episode-extras.json — FAQs and key takeaways, written and
// uploaded manually (never AI-generated). Layers on top of whichever
// base content the episode already has, AI-generated or hand-written.

import episodesData from "../../content/episodes.json";
import extrasData from "../../content/episode-extras.json";

export const curatedBySlug = new Map(episodesData.episodes.map((e) => [e.slug, e]));
export const curatedByEpisodeNumber = new Map(episodesData.episodes.map((e) => [String(e.episodeNumber), e]));
export const extrasByEpisodeNumber = new Map(extrasData.extras.map((e) => [String(e.episodeNumber), e]));
