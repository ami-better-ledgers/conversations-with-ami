// Cloudflare Pages Function — served at /api/youtube
//
// Looks up every video on the Conversations with Ami YouTube channel and
// returns {title, videoId, publishedAt} for each. The client (js/youtube-map.js)
// decides which ones are full episodes vs. Shorts/extra clips, by comparing
// titles against the podcast RSS feed — not by video length, since YouTube
// doesn't reliably expose "is this a Short" via the public API.
//
// SET THIS UP IN CLOUDFLARE:
//   Pages project > Settings > Environment variables
//   Name:  YOUTUBE_API_KEY
//   Value: an API key from Google Cloud Console (see README.md)
//   Add it to both "Production" and "Preview" environments, then redeploy.

const CHANNEL_HANDLE = "ConversationswithAmi";

export async function onRequestGet(context) {
  const apiKey = context.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return jsonResponse(
      { error: "YOUTUBE_API_KEY is not set. Add it under Pages > Settings > Environment variables." },
      500
    );
  }

  try {
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${CHANNEL_HANDLE}&key=${apiKey}`;
    const channelRes = await fetch(channelUrl, { cf: { cacheTtl: 3600, cacheEverything: true } });
    const channelData = await channelRes.json();

    if (!channelRes.ok || !channelData.items || !channelData.items.length) {
      return jsonResponse({ error: "Could not find the YouTube channel.", detail: channelData }, 502);
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    const videos = [];
    let pageToken = "";
    do {
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&key=${apiKey}${pageToken ? "&pageToken=" + pageToken : ""}`;
      const playlistRes = await fetch(playlistUrl, { cf: { cacheTtl: 900, cacheEverything: true } });
      const playlistData = await playlistRes.json();

      if (!playlistRes.ok) {
        return jsonResponse({ error: "Could not fetch channel videos.", detail: playlistData }, 502);
      }

      (playlistData.items || []).forEach((item) => {
        videos.push({
          title: item.snippet.title,
          videoId: item.snippet.resourceId.videoId,
          publishedAt: item.snippet.publishedAt,
        });
      });

      pageToken = playlistData.nextPageToken || "";
    } while (pageToken);

    return jsonResponse({ videos }, 200, 900);
  } catch (err) {
    return jsonResponse({ error: "Could not fetch or parse YouTube data.", detail: String(err) }, 502);
  }
}

function jsonResponse(data, status, cacheSeconds) {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (cacheSeconds) headers["Cache-Control"] = `public, max-age=${cacheSeconds}`;
  return new Response(JSON.stringify(data), { status, headers });
}
