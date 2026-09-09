// Shared RSS fetch/parse logic used by both /api/episodes and the
// individual episode pages, so the two stay in sync automatically.

const DEFAULT_FEED_URL = "https://api.riverside.com/hosting/qfuudTdb.rss";

export async function fetchEpisodes(env) {
  const feedUrl = env.PODCAST_RSS_URL || DEFAULT_FEED_URL;
  const res = await fetch(feedUrl, {
    headers: { "User-Agent": "ConversationsWithAmi-Site/1.0" },
    cf: { cacheTtl: 900, cacheEverything: true },
  });

  if (!res.ok) throw new Error(`Feed responded with ${res.status}`);

  const xml = await res.text();
  return parseRssItems(xml);
}

export function parseRssItems(xml) {
  const items = [];
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  for (const block of itemBlocks) {
    // Order matters here: decode entities FIRST, since this feed embeds
    // real HTML (lists, bold text) as HTML-encoded entities inside the
    // XML. Stripping tags before decoding let encoded tags slip through
    // un-stripped once decoded — this fixes that.
    const rawNotes = decodeEntities(
      stripCdata(matchTag(block, "itunes:summary") || matchTag(block, "description"))
    );

    items.push({
      title: decodeEntities(stripCdata(matchTag(block, "title"))),
      description: truncatePlainText(stripAllTags(rawNotes), 220),
      content: sanitizeHtml(rawNotes),
      pubDate: matchTag(block, "pubDate"),
      link: decodeEntities(matchTag(block, "link")),
      duration: matchTag(block, "itunes:duration"),
      episode: matchTag(block, "itunes:episode"),
      audioUrl: matchAttr(block, "enclosure", "url"),
      image: matchAttr(block, "itunes:image", "href"),
      transcriptUrl: matchAttr(block, "podcast:transcript", "url"),
    });
  }

  return items;
}

export function matchTag(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

export function matchAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]*)"[^>]*/?>`, "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

export function stripCdata(str) {
  const m = str.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return m ? m[1] : str;
}

// Full plain-text strip, used only for the short teaser text.
export function stripAllTags(str) {
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function truncatePlainText(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trim() + "…";
}

// Light allow-list sanitizer for the full show-notes HTML: strips
// anything that could execute code, keeps normal formatting tags
// (lists, bold, links, headings, line breaks) intact.
export function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/ on[a-z]+="[^"]*"/gi, "")
    .replace(/ on[a-z]+='[^']*'/gi, "")
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .replace(/href='javascript:[^']*'/gi, "href='#'");
}

export function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

// Same slug rule used client-side in js/episodes.js — keep both in sync.
// Takes the part of the title before " | " (the hook, not the guest
// credit) and kebab-cases it.
export function slugifyTitle(title) {
  const hook = (title || "").split("|")[0];
  return hook
    .toLowerCase()
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
