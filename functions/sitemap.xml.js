// Cloudflare Pages Function — served at /sitemap.xml
//
// Generated from the same Riverside RSS feed the rest of the site uses, so a
// new episode shows up in the sitemap automatically on release day with no
// code or file edits. Slugs follow the exact rule used by the episode pages
// (curated slug from content/episodes.json if one exists, else slugifyTitle).

import { fetchEpisodes, slugifyTitle } from "./_lib/rss.js";
import { curatedByEpisodeNumber } from "./_lib/curated.js";

const SITE_URL = "https://www.conversationswithami.com";

const STATIC_PAGES = [
  { path: "/", lastmod: "2026-09-09", changefreq: "weekly", priority: "1.0" },
  { path: "/about", lastmod: "2026-09-09", changefreq: "monthly", priority: "0.8" },
  { path: "/podcast", lastmod: "2026-09-09", changefreq: "weekly", priority: "0.9" },
  { path: "/newsletter", lastmod: "2026-09-09", changefreq: "weekly", priority: "0.7" },
  { path: "/apply/", lastmod: "2026-09-09", changefreq: "monthly", priority: "0.5" },
  { path: "/links", lastmod: "2026-09-18", changefreq: "monthly", priority: "0.6" },
];

// Only used if the RSS fetch/parse fails — a snapshot of episodes 1-18.
const FALLBACK_EPISODES = [
  ["the-danger-of-being-too-small-to-hack", "2026-10-15"],
  ["overcoming-the-fear-of-your-finances", "2026-10-01"],
  ["self-directed-retirement-accounts-explained-no-fluff", "2026-09-15"],
  ["stop-losing-money-the-1031-exchange-mistake-that-costs-thousands", "2026-09-01"],
  ["is-ai-dangerous-for-your-business-trust-but-verify", "2026-08-15"],
  ["why-your-website-isnt-generating-leads-its-not-what-you-think", "2026-08-01"],
  ["the-tax-turkey-rule-why-viral-tax-strategies-get-you-audited", "2026-07-15"],
  ["how-to-tell-if-a-client-actually-wants-you-not-just-your-price", "2026-07-01"],
  ["how-banks-actually-decide-to-lend-you-money", "2026-06-15"],
  ["lighthouse-or-tugboat-a-better-way-to-market-yourself", "2026-06-01"],
  ["what-effective-leaders-do-differently", "2026-05-15"],
  ["dont-hire-a-cfo-on-day-one-a-stage-by-stage-hiring-guide", "2026-05-01"],
  ["the-insurance-mistake-that-can-bankrupt-your-business", "2026-04-15"],
  ["the-customer-is-not-always-right-and-other-sales-myths", "2026-04-01"],
  ["dont-chase-the-50k-job-on-day-one", "2026-03-15"],
  ["the-hiring-mistake-that-makes-you-a-single-point-of-failure", "2026-03-01"],
  ["its-not-what-you-know-its-who-you-know", "2026-02-15"],
  ["why-indecision-is-the-worst-business-decision", "2026-02-01"],
].map(([slug, lastmod]) => ({ slug, lastmod }));

export async function onRequestGet(context) {
  let episodes;
  try {
    episodes = await episodesFromFeed(context.env);
    if (!episodes.length) throw new Error("Feed returned no episodes");
  } catch (err) {
    episodes = FALLBACK_EPISODES;
  }

  return new Response(renderSitemap(episodes), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

async function episodesFromFeed(env) {
  const items = await fetchEpisodes(env);
  const seen = new Set();
  const episodes = [];

  for (const item of items) {
    const curated = curatedByEpisodeNumber.get(String(item.episode));
    const slug = curated?.slug || slugifyTitle(item.title);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    const date = new Date(item.pubDate);
    episodes.push({
      slug,
      lastmod: Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10),
    });
  }

  return episodes.sort((a, b) => (a.lastmod < b.lastmod ? 1 : a.lastmod > b.lastmod ? -1 : 0));
}

function renderSitemap(episodes) {
  const entries = [
    ...STATIC_PAGES.map((p) => ({ ...p, loc: SITE_URL + p.path })),
    ...episodes.map((e) => ({
      loc: `${SITE_URL}/episodes/${e.slug}`,
      lastmod: e.lastmod,
      changefreq: "monthly",
      priority: "0.7",
    })),
  ];

  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${escXml(e.loc)}</loc>${e.lastmod ? `
    <lastmod>${e.lastmod}</lastmod>` : ""}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function escXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
