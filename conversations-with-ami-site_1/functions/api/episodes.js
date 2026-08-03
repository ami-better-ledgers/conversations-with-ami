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

// Default feed, so episodes work out of the box. You can override this later
// without touching code by setting PODCAST_RSS_URL under Pages > Settings >
// Environment variables in Cloudflare — that value, if present, always wins.
const DEFAULT_FEED_URL = "https://api.riverside.com/hosting/qfuudTdb.rss";

export async function onRequestGet(context) {
  const feedUrl = context.env.PODCAST_RSS_URL || DEFAULT_FEED_URL;

  if (!feedUrl) {
    return jsonResponse(
      { error: "PODCAST_RSS_URL is not set. Add it under Pages > Settings > Environment variables." },
      500
    );
  }

  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "ConversationsWithAmi-Site/1.0" },
      cf: { cacheTtl: 900, cacheEverything: true }, // cache 15 min at the edge
    });

    if (!res.ok) {
      return jsonResponse({ error: `Feed responded with ${res.status}` }, 502);
    }

    const xml = await res.text();
    const episodes = parseRssItems(xml);

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

/* ---------- minimal, dependency-free RSS parsing ---------- */

function parseRssItems(xml) {
  const items = [];
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  for (const block of itemBlocks) {
    items.push({
      title: decodeEntities(stripCdata(matchTag(block, "title"))),
      description: decodeEntities(
        stripHtml(stripCdata(matchTag(block, "itunes:summary") || matchTag(block, "description")))
      ),
      pubDate: matchTag(block, "pubDate"),
      link: decodeEntities(matchTag(block, "link")),
      duration: matchTag(block, "itunes:duration"),
      episode: matchTag(block, "itunes:episode"),
      audioUrl: matchAttr(block, "enclosure", "url"),
      image: matchAttr(block, "itunes:image", "href"),
    });
  }

  return items;
}

function matchTag(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

function matchAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]*)"[^>]*/?>`, "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

function stripCdata(str) {
  const m = str.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return m ? m[1] : str;
}

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}
