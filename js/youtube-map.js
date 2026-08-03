/* Matches podcast episodes to their YouTube videos by title.
   Videos are fetched live from /api/youtube (see functions/api/youtube.js)
   rather than hardcoded here, so new episodes get matched automatically -
   no manual updates needed when you publish a new one, as long as the
   YouTube video title matches (or closely matches) the RSS episode title. */

function normalizeTitle(str) {
  return (str || "")
    .toLowerCase()
    .replace(/["'\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function fetchYouTubeVideos() {
  try {
    const res = await fetch("/api/youtube");
    const data = await res.json();
    if (!res.ok || data.error) return [];
    return data.videos || [];
  } catch (e) {
    return [];
  }
}

function buildYouTubeMatcher(videos) {
  const normalized = videos.map(function (v) {
    return { videoId: v.videoId, norm: normalizeTitle(v.title) };
  });

  return function (ep) {
    const epNorm = normalizeTitle(ep.title);
    if (!epNorm) return null;

    const exact = normalized.find(function (v) { return v.norm === epNorm; });
    if (exact) return exact.videoId;

    const guestPart = ep.title && ep.title.includes("|")
      ? normalizeTitle(ep.title.split("|").pop())
      : null;
    if (guestPart) {
      const partial = normalized.find(function (v) { return v.norm.includes(guestPart); });
      if (partial) return partial.videoId;
    }

    return null;
  };
}

/* Filters the channel's videos down to whatever ISN'T a full podcast
   episode — i.e. Shorts and other extra clips. Works by excluding any
   video whose title matches (or closely matches) an episode's title,
   the same logic buildYouTubeMatcher uses in reverse. This means it
   doesn't rely on video length, so it keeps working correctly even if
   YouTube changes what counts as a "Short." */
function filterNonEpisodeVideos(videos, episodes) {
  const episodeNorms = (episodes || []).map(function (ep) { return normalizeTitle(ep.title); });
  const episodeGuestParts = (episodes || [])
    .filter(function (ep) { return ep.title && ep.title.includes("|"); })
    .map(function (ep) { return normalizeTitle(ep.title.split("|").pop()); });

  return (videos || []).filter(function (v) {
    const vNorm = normalizeTitle(v.title);
    if (episodeNorms.includes(vNorm)) return false;
    const guestMatch = episodeGuestParts.some(function (g) { return g && vNorm.includes(g); });
    return !guestMatch;
  });
}
