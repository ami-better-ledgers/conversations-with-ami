// Cloudflare Pages Function — served at /podcast
//
// Serves the static podcast.html, but rebuilds the "All episodes" archive
// list (the server-rendered links Google crawls) from the RSS feed on each
// request, so a new episode appears there automatically. If the feed can't
// be read, the hand-written list already in podcast.html is served as-is.

import { fetchEpisodes, slugifyTitle } from "./_lib/rss.js";
import { curatedByEpisodeNumber } from "./_lib/curated.js";

export async function onRequestGet(context) {
  const response = await context.next();

  let listHtml;
  try {
    const items = await fetchEpisodes(context.env);
    listHtml = items
      .slice()
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .map((item) => {
        const slug = curatedByEpisodeNumber.get(String(item.episode))?.slug || slugifyTitle(item.title);
        const hook = (item.title || "").split("|")[0].trim();
        if (!slug || !hook) return "";
        const label = item.episode ? `Episode ${item.episode} — ${hook}` : hook;
        return `<li><a href="/episodes/${esc(slug)}">${esc(label)}</a></li>`;
      })
      .filter(Boolean)
      .join("\n      ");
  } catch (err) {
    return response;
  }

  if (!listHtml) return response;

  return new HTMLRewriter()
    .on("ul.episode-archive-list", {
      element(el) {
        el.setInnerContent(listHtml, { html: true });
      },
    })
    .transform(response);
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
