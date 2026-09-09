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
