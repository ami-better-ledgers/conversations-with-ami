// Cloudflare Pages Function — served at /episodes/:slug
//
// Renders a real, text-rich HTML page per episode (guest bio, written
// summary, show notes) so Google can index episode content directly,
// instead of only seeing the JS-rendered list on /podcast.
//
// Episodes are matched to curated write-ups in content/episodes.json by
// itunes:episode number — that file is for hand-written entries only
// (see the two Bernard Reisz episodes for an example), and is entirely
// optional. Any episode without one is instead sent to the Claude API
// (see functions/_lib/ai-summary.js) to generate the same fields
// automatically, cached so it only runs once per episode. If neither is
// available (no ANTHROPIC_API_KEY configured yet), the page falls back
// to the plain RSS feed content — so every episode is indexable from
// day one no matter what.

import { fetchEpisodes, slugifyTitle } from "../_lib/rss.js";
import { getOrGenerateSummary } from "../_lib/ai-summary.js";
import episodesData from "../../content/episodes.json";

const SITE_URL = "https://www.conversationswithami.com";
const curatedBySlug = new Map(episodesData.episodes.map((e) => [e.slug, e]));

export async function onRequestGet(context) {
  const { slug } = context.params;

  let feedEpisodes;
  try {
    feedEpisodes = await fetchEpisodes(context.env);
  } catch (err) {
    return new Response("Could not load episode data. Please try again shortly.", { status: 502 });
  }

  let curated = curatedBySlug.get(slug);
  let feedItem;

  if (curated) {
    feedItem = feedEpisodes.find((ep) => ep.episode === String(curated.episodeNumber));
  } else {
    feedItem = feedEpisodes.find((ep) => slugifyTitle(ep.title) === slug);
  }

  if (!feedItem) {
    return new Response("Episode not found.", { status: 404 });
  }

  if (!curated) {
    const aiGenerated = await getOrGenerateSummary(context.env, feedItem);
    if (aiGenerated) {
      curated = { ...aiGenerated, slug, episodeNumber: Number(feedItem.episode) };
    }
  }

  const html = renderEpisodePage({ slug, curated, feedItem, allFeedEpisodes: feedEpisodes });
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function renderEpisodePage({ slug, curated, feedItem, allFeedEpisodes }) {
  const canonicalUrl = `${SITE_URL}/episodes/${slug}`;
  const [hook, guestCredit] = splitTitle(feedItem.title);
  const pageTitle = curated?.pageTitle || hook;
  const guestName = curated?.guestName || (guestCredit ? guestCredit.split(",")[0].trim() : "");
  const guestCompany = curated?.guestCompany || (guestCredit && guestCredit.includes(",") ? guestCredit.split(",").slice(1).join(",").trim() : "");
  const metaDescription = truncate(curated?.summary || feedItem.description || "", 160);
  const ogImage = feedItem.image || `${SITE_URL}/assets/og-image.jpg`;
  const dateLabel = formatDate(feedItem.pubDate);
  const episodeNum = feedItem.episode ? String(feedItem.episode).padStart(2, "0") : "";

  const relatedList = (curated?.relatedSlugs || [])
    .map((s) => curatedBySlug.get(s))
    .filter(Boolean);

  const jsonLd = buildJsonLd({ canonicalUrl, pageTitle, feedItem, guestName, dateLabel: feedItem.pubDate });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(pageTitle)} — Conversations with Ami</title>
<meta name="description" content="${esc(metaDescription)}">
<link rel="canonical" href="${canonicalUrl}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(pageTitle)} — Conversations with Ami">
<meta property="og:description" content="${esc(metaDescription)}">
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:site_name" content="Conversations with Ami">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(pageTitle)} — Conversations with Ami">
<meta name="twitter:description" content="${esc(metaDescription)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="shortcut icon" href="/favicon.ico">
<link rel="stylesheet" href="/css/tokens.css?v=21">
<link rel="stylesheet" href="/css/style.css?v=21">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<header class="site-nav">
  <a class="brand" href="/index.html" aria-label="Conversations with Ami — home">
    <img src="/assets/logos/Logo_blue.svg" alt="Conversations with Ami">
  </a>
  <button class="nav-toggle" aria-expanded="false" aria-controls="primary-nav" aria-label="Toggle menu">☰</button>
  <ul class="nav-links" id="primary-nav">
    <li class="nav-item"><a href="/index.html">Home</a></li>
    <li class="nav-item"><a href="/about.html">About</a></li>
    <li class="nav-item"><a href="/podcast.html" aria-current="page">The Podcast</a></li>
    <li class="nav-item"><a href="/newsletter.html">Newsletter</a></li>
    <li class="nav-cta-stack">
      <button type="button" class="nav-cta" id="apply-modal-trigger">Apply to be on the show</button>
      <a class="nav-cta" href="/podcast.html#signup">Join the newsletter</a>
    </li>
  </ul>
</header>

<main id="main">

  <section class="wrap section-tight">
    <p class="breadcrumbs"><a href="/index.html">Home</a> / <a href="/podcast.html">The Podcast</a> / ${esc(pageTitle)}</p>
    <p class="eyebrow">${episodeNum ? `Episode ${episodeNum}` : "The Podcast"}${curated?.pillar ? " · " + esc(curated.pillar) : ""}</p>
    <h1>${esc(pageTitle)}</h1>
    <p class="lede">${dateLabel}${feedItem.duration ? " · " + esc(feedItem.duration) : ""}</p>

    ${guestName ? `<div class="guest-card">
      <strong>${esc(guestName)}</strong>
      ${guestCompany ? `<span>· ${esc(guestCompany)}</span>` : ""}
      ${curated?.guestRole ? `<span>· ${esc(curated.guestRole)}</span>` : ""}
      ${(curated?.guestLinks || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join(" · ")}
    </div>` : ""}

    <div class="episode-actions" style="margin: 1.25rem 0;">
      ${feedItem.audioUrl ? `<audio controls preload="none" src="${esc(feedItem.audioUrl)}" style="width:100%;"></audio>` : ""}
      <button type="button" class="episode-watch" id="episode-watch-btn" data-title="${esc(feedItem.title)}" hidden aria-expanded="false" style="margin-top:0.75rem;">Watch on YouTube</button>
      <div class="episode-embed" id="episode-watch-embed" hidden></div>
    </div>

    ${curated?.problemSolved ? `<div class="problem-callout"><span>The problem this episode solves</span>${esc(curated.problemSolved)}</div>` : ""}

    <div class="episode-summary">
      ${curated?.summary ? `<p>${esc(curated.summary)}</p>` : `<div>${feedItem.content || `<p>${esc(feedItem.description)}</p>`}</div>`}
    </div>

    ${curated?.summary && feedItem.content ? `<details style="margin-top:1.5rem;">
      <summary style="cursor:pointer; font-family: var(--font-label); font-size:0.85rem; color: var(--blue);">Full show notes</summary>
      <div class="episode-notes-full" style="display:block; margin-top:1rem;">${feedItem.content}</div>
    </details>` : ""}

    ${relatedList.length ? `<div class="related-episodes">
      <h2>Related episodes</h2>
      <ul>
        ${relatedList.map((r) => `<li><a href="/episodes/${esc(r.slug)}">${esc(r.pageTitle || r.slug)}</a></li>`).join("")}
      </ul>
    </div>` : ""}

    <p style="margin-top:2rem;"><a href="/podcast.html">&larr; Back to all episodes</a></p>
  </section>

  <section class="wrap" id="signup">
    <div class="signup-block">
      <div>
        <p class="eyebrow">Still Building with Ami</p>
        <h2>Don't miss the next one</h2>
        <p class="lede">Get a heads-up when new episodes drop, plus the extra stuff that doesn't make it into the show — in the newsletter.</p>
      </div>
      <div class="signup-form-slot"></div>
    </div>
  </section>

</main>

<footer class="site-footer wrap">
  <div class="footer-top">
    <div class="footer-logos">
      <img src="/assets/logos/Logo_black.svg" alt="Conversations with Ami">
    </div>
    <div class="footer-right">
      <nav class="footer-links">
        <ul>
          <li><a href="/index.html">Home</a></li>
          <li><a href="/about.html">About</a></li>
          <li><a href="/podcast.html">The Podcast</a></li>
          <li><a href="/newsletter.html">Newsletter Archive</a></li>
        </ul>
      </nav>
      <div class="footer-social">
        <span class="footer-row-label">Follow</span>
        <a href="https://www.youtube.com/@ConversationswithAmi" target="_blank" rel="noopener" aria-label="YouTube"><img src="/assets/social-icons/youtube.png" alt="YouTube"></a>
        <a href="https://www.instagram.com/conversationswithami" target="_blank" rel="noopener" aria-label="Instagram"><img src="/assets/social-icons/instagram.png" alt="Instagram"></a>
        <a href="https://www.facebook.com/conversationswithami/" target="_blank" rel="noopener" aria-label="Facebook"><img src="/assets/social-icons/facebook.png" alt="Facebook"></a>
        <a href="https://www.linkedin.com/company/conversations-with-ami/" target="_blank" rel="noopener" aria-label="LinkedIn"><img src="/assets/social-icons/linkedin.png" alt="LinkedIn"></a>
        <a href="https://www.tiktok.com/@conversationswithami" target="_blank" rel="noopener" aria-label="TikTok"><img src="/assets/social-icons/tiktok.png" alt="TikTok"></a>
        <a href="https://www.threads.com/@conversationswithami" target="_blank" rel="noopener" aria-label="Threads"><img src="/assets/social-icons/threads.svg" alt="Threads"></a>
        <a href="https://x.com/ConverseWithAmi" target="_blank" rel="noopener" aria-label="X"><img src="/assets/social-icons/x.png" alt="X"></a>
        <a href="https://linktr.ee/conversationswithami" target="_blank" rel="noopener" aria-label="All links"><img src="/assets/social-icons/linktree.svg" alt="All links"></a>
      </div>
      <div class="footer-listen">
        <span class="footer-row-label">Listen on</span>
        <a href="https://podcasts.apple.com/us/podcast/conversations-with-ami/id1873041580" target="_blank" rel="noopener"><img src="/assets/platform-badges/apple-podcasts.png" alt="Apple Podcasts"></a>
        <a href="https://open.spotify.com/show/5RKOn6Eu7p6wPZnXXveiHb?si=791fb114c02b4916" target="_blank" rel="noopener"><img src="/assets/platform-badges/spotify.png" alt="Spotify"></a>
        <a href="https://youtube.com/playlist?list=PL3x3OopO8PGq6QsnYC_Pp4eX11WwbAsYx&si=LL7pmngiHCHOn8FD" target="_blank" rel="noopener"><img src="/assets/platform-badges/youtube.png" alt="YouTube"></a>
        <a href="https://music.youtube.com/playlist?list=PL3x3OopO8PGq6QsnYC_Pp4eX11WwbAsYx&si=zAF1mqK5Om0lyoaU" target="_blank" rel="noopener"><img src="/assets/platform-badges/youtube-music.svg" alt="YouTube Music"></a>
        <a href="https://music.amazon.com/podcasts/186d37e6-9e61-407e-8842-5d5aa540bffa/conversations-with-ami" target="_blank" rel="noopener"><img src="/assets/platform-badges/amazon-music.png" alt="Amazon Music"></a>
        <a href="https://www.iheart.com/podcast/269-conversations-with-ami-320034306" target="_blank" rel="noopener"><img src="/assets/platform-badges/iheart.png" alt="iHeartPodcasts"></a>
        <a href="https://link.deezer.com/s/340oHTszf2kH0iVvzhfrm" target="_blank" rel="noopener"><img src="/assets/platform-badges/deezer.png" alt="Deezer"></a>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; <span id="year"></span> Conversations with Ami</span>
  </div>
</footer>

<script src="/js/config.js?v=21"></script>
<script src="/js/nav.js?v=21"></script>
<script src="/js/apply-modal.js?v=21"></script>
<script src="/js/newsletter-embed.js?v=21"></script>
<script src="/js/youtube-map.js?v=21"></script>
<script>document.getElementById("year").textContent = new Date().getFullYear();</script>
<script>
(function () {
  var btn = document.getElementById("episode-watch-btn");
  var embed = document.getElementById("episode-watch-embed");
  if (!btn || typeof fetchYouTubeVideos !== "function") return;

  fetchYouTubeVideos().then(function (videos) {
    var matcher = buildYouTubeMatcher(videos);
    var videoId = matcher({ title: btn.dataset.title });
    if (!videoId) return;

    btn.hidden = false;
    btn.addEventListener("click", function () {
      var isOpen = !embed.hidden;
      if (isOpen) {
        embed.hidden = true;
        embed.innerHTML = "";
        btn.textContent = "Watch on YouTube";
        btn.setAttribute("aria-expanded", "false");
      } else {
        embed.innerHTML = '<iframe src="https://www.youtube.com/embed/' + videoId + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>';
        embed.hidden = false;
        btn.textContent = "Hide video";
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });
})();
</script>

<div class="apply-modal-overlay" id="apply-modal-overlay" hidden>
  <div class="apply-modal-panel">
    <button type="button" class="apply-modal-close" id="apply-modal-close" aria-label="Close">✕</button>
    <iframe id="apply-modal-iframe" title="Apply to be on the show"></iframe>
  </div>
</div>
</body>
</html>
`;
}

function buildJsonLd({ canonicalUrl, pageTitle, feedItem, guestName, dateLabel }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: pageTitle,
    url: canonicalUrl,
    description: feedItem.description,
    datePublished: toIsoDate(dateLabel),
    partOfSeries: {
      "@type": "PodcastSeries",
      name: "Conversations with Ami",
      url: `${SITE_URL}/podcast`,
    },
  };
  if (feedItem.episode) jsonLd.episodeNumber = Number(feedItem.episode);
  if (feedItem.audioUrl) {
    jsonLd.associatedMedia = { "@type": "MediaObject", contentUrl: feedItem.audioUrl };
  }
  if (guestName) {
    jsonLd.actor = { "@type": "Person", name: guestName };
  }
  return jsonLd;
}

function splitTitle(title) {
  const parts = (title || "").split("|");
  return [parts[0].trim(), parts.length > 1 ? parts.slice(1).join("|").trim() : ""];
}

function formatDate(pubDate) {
  if (!pubDate) return "";
  const d = new Date(pubDate);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function toIsoDate(pubDate) {
  const d = new Date(pubDate);
  return isNaN(d) ? undefined : d.toISOString();
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str || "";
  return str.slice(0, maxLen - 1).trim() + "…";
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
