// Shared lookup maps for content/episodes.json (hand-written episode
// entries), used by both the individual episode pages and /api/episodes
// so the two can't drift out of sync on how curated content is found.
//
// FAQs and key takeaways live in a Google Sheet instead, not here — see
// functions/_lib/episode-extras.js.

import episodesData from "../../content/episodes.json";

export const curatedBySlug = new Map(episodesData.episodes.map((e) => [e.slug, e]));
export const curatedByEpisodeNumber = new Map(episodesData.episodes.map((e) => [String(e.episodeNumber), e]));
