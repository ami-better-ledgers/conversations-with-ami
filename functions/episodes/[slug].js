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
import { curatedBySlug } from "../_lib/curated.js";
import { fetchFaqsForEpisode, fetchTopAdviceForEpisode, hasTranscriptSheetRow } from "../_lib/episode-extras.js";

const SITE_URL = "https://www.conversationswithami.com";

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

  // FAQs/Top Advice are hand-written in a Google Sheet (never
  // AI-generated) — layer them on top of whatever else this episode
  // already has, so they don't require a full content/episodes.json
  // entry of their own. A row whose Episode number doesn't match a
  // published episode is simply absent here, not an error.
  const [faqs, topAdvice, hasSheetTranscript] = await Promise.all([
    fetchFaqsForEpisode(context.env, feedItem.episode),
    fetchTopAdviceForEpisode(context.env, feedItem.episode),
    hasTranscriptSheetRow(context.env, feedItem.episode),
  ]);
  if (faqs.length || topAdvice.length) {
    curated = { ...(curated || {}), faqs, topAdvice };
  }

  const hasTranscript = hasSheetTranscript || !!feedItem.transcriptUrl;

  const html = renderEpisodePage({ slug, curated, feedItem, hasTranscript, allFeedEpisodes: feedEpisodes });
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function renderEpisodePage({ slug, curated, feedItem, hasTranscript, allFeedEpisodes }) {
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

  const shareText = `I really enjoyed listening to "${pageTitle}" on Conversations with Ami and thought others in my network would enjoy it too.`;
  const shareLinks = buildShareLinks(canonicalUrl, shareText);

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
    <p class="eyebrow">${episodeNum ? `Episode ${episodeNum}` : "The Podcast"}</p>
    <h1>${esc(pageTitle)}</h1>
    <p class="lede">${dateLabel}${feedItem.duration ? " · " + esc(feedItem.duration) : ""}</p>

    ${(curated?.pillars?.length || curated?.subjects?.length) ? `<div class="tag-row">
      ${(curated?.pillars || []).map((p) => `<span class="tag-pillar">${esc(p)}</span>`).join("")}
      ${(curated?.subjects || []).map((s) => `<span class="tag-subject">${esc(s)}</span>`).join("")}
    </div>` : ""}
  </section>

  <section class="wrap episode-layout">
    <div class="episode-main">
      <div class="episode-embed" id="episode-watch-embed" hidden></div>

      ${curated?.problemSolved ? `<div class="problem-callout"><span>The problem this episode solves</span>${esc(curated.problemSolved)}</div>` : ""}

      <div class="episode-summary">
        ${curated?.summary
          ? curated.summary.split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join("")
          : `<div>${feedItem.content || `<p>${esc(feedItem.description)}</p>`}</div>`}
      </div>

      ${curated?.summary && feedItem.content ? `<details style="margin-top:1.5rem;">
        <summary style="cursor:pointer; font-family: var(--font-label); font-size:0.85rem; color: var(--blue);">Full show notes</summary>
        <div class="episode-notes-full" style="display:block; margin-top:1rem;">${feedItem.content}</div>
      </details>` : ""}

      ${curated?.topAdvice?.length ? `<div class="top-advice-block">
        <h2>Top advice from this episode</h2>
        <ul class="top-advice-list">
          ${curated.topAdvice.slice(0, 4).map((t) => renderAdviceItem(t, feedItem.audioUrl)).join("")}
        </ul>
        ${curated.topAdvice.length > 4 ? `<details class="show-more">
          <summary>Show ${curated.topAdvice.length - 4} more</summary>
          <ul class="top-advice-list">
            ${curated.topAdvice.slice(4).map((t) => renderAdviceItem(t, feedItem.audioUrl)).join("")}
          </ul>
        </details>` : ""}
      </div>` : ""}

      ${curated?.faqs?.length ? `<div class="faq-block">
        <h2>FAQs</h2>
        ${curated.faqs.slice(0, 4).map((f) => renderFaqItem(f, feedItem.audioUrl)).join("")}
        ${curated.faqs.length > 4 ? `<details class="show-more">
          <summary>Show ${curated.faqs.length - 4} more</summary>
          ${curated.faqs.slice(4).map((f) => renderFaqItem(f, feedItem.audioUrl)).join("")}
        </details>` : ""}
      </div>` : ""}

      ${relatedList.length ? `<div class="related-episodes">
        <h2>Related episodes</h2>
        <div class="related-grid">
          ${relatedList.map((r) => `<a class="related-card" href="/episodes/${esc(r.slug)}">
            <span class="related-card-text">
              <span class="related-eyebrow">Listen next</span>
              <span class="related-title">${esc(r.pageTitle || r.slug)}</span>
            </span>
            <span class="related-arrow">&rarr;</span>
          </a>`).join("")}
        </div>
      </div>` : ""}

      <p style="margin-top:2rem;"><a href="/podcast.html">&larr; Back to all episodes</a></p>
    </div>

    <aside class="episode-sidebar">
      ${feedItem.image ? `<img class="sidebar-thumb" src="${esc(feedItem.image)}" alt="">` : ""}

      <div class="sidebar-card">
        ${feedItem.audioUrl ? `<audio id="episode-audio" controls preload="none" src="${esc(feedItem.audioUrl)}" style="width:100%;"></audio>` : ""}
        <button type="button" class="episode-watch" id="episode-watch-btn" data-title="${esc(feedItem.title)}" hidden aria-expanded="false" style="margin-top:0.75rem;">Watch on YouTube</button>
        ${hasTranscript ? `<button type="button" class="read-link" id="transcript-open-btn" data-episode="${esc(feedItem.episode)}" style="background:none;border:none;padding:0;cursor:pointer;">Read the transcript &rarr;</button>` : ""}
      </div>

      ${guestName ? `<div class="sidebar-card">
        <p class="sidebar-label">Guest</p>
        <p class="guest-name">${esc(guestName)}</p>
        <p class="guest-meta">${[guestCompany, curated?.guestRole].filter(Boolean).map(esc).join(" · ")}</p>
        ${curated?.guestBio ? `<p class="bio-line">${esc(curated.guestBio)}</p>` : ""}
        ${curated?.companyBio ? `<p class="bio-line">${boldFirstMention(curated.companyBio, guestCompany)}</p>` : ""}
        ${(curated?.guestLinks || []).length ? `<p class="guest-links">${(curated?.guestLinks || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join(" · ")}</p>` : ""}
      </div>` : ""}

      <div class="sidebar-card share-row" aria-label="Share this episode">
        <p class="sidebar-label">Share</p>
        <div class="share-icons">
          <a href="${shareLinks.linkedin}" target="_blank" rel="noopener" aria-label="Share on LinkedIn"><img src="/assets/social-icons/linkedin.png" alt=""></a>
          <a href="${shareLinks.facebook}" target="_blank" rel="noopener" aria-label="Share on Facebook"><img src="/assets/social-icons/facebook.png" alt=""></a>
          <a href="${shareLinks.threads}" target="_blank" rel="noopener" aria-label="Share on Threads"><img src="/assets/social-icons/threads.svg" alt=""></a>
          <a href="${shareLinks.x}" target="_blank" rel="noopener" aria-label="Share on X"><img src="/assets/social-icons/x.png" alt=""></a>
          <a href="${shareLinks.whatsapp}" target="_blank" rel="noopener" aria-label="Share on WhatsApp"><img src="/assets/social-icons/whatsapp.svg" alt=""></a>
          <a href="${shareLinks.sms}" aria-label="Share via text message"><img src="/assets/social-icons/imessage.svg" alt=""></a>
          <button type="button" class="share-more-btn" data-share-title="${esc(pageTitle)}" data-share-url="${canonicalUrl}" aria-label="More sharing options"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"></line><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"></line></svg></button>
        </div>
      </div>
    </aside>
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
    var match = matcher({ title: btn.dataset.title });
    var videoId = match && match.videoId;
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
<script>
(function () {
  var audio = document.getElementById("episode-audio");
  if (!audio) return;
  document.querySelectorAll(".jump-link").forEach(function (btn) {
    btn.addEventListener("click", function () {
      audio.currentTime = Number(btn.dataset.seek);
      audio.play();
      audio.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
})();
</script>
<script src="/js/share-more.js?v=21"></script>

<div class="apply-modal-overlay" id="apply-modal-overlay" hidden>
  <div class="apply-modal-panel">
    <button type="button" class="apply-modal-close" id="apply-modal-close" aria-label="Close">✕</button>
    <iframe id="apply-modal-iframe" title="Apply to be on the show"></iframe>
  </div>
</div>

<div class="transcript-modal-overlay" id="transcript-modal-overlay" hidden>
  <div class="transcript-modal-panel">
    <button type="button" class="transcript-modal-close" id="transcript-modal-close" aria-label="Close">✕</button>
    <h2>Transcript</h2>
    <div class="transcript-modal-toolbar">
      <input type="search" id="transcript-search" placeholder="Search the transcript…" aria-label="Search the transcript">
      <a href="#" id="transcript-download" class="btn-small" hidden>Download .txt</a>
    </div>
    <div class="transcript-modal-body" id="transcript-modal-body">Loading transcript…</div>
  </div>
</div>

<script>
(function () {
  var openBtn = document.getElementById("transcript-open-btn");
  if (!openBtn) return;

  var overlay = document.getElementById("transcript-modal-overlay");
  var closeBtn = document.getElementById("transcript-modal-close");
  var body = document.getElementById("transcript-modal-body");
  var searchInput = document.getElementById("transcript-search");
  var downloadLink = document.getElementById("transcript-download");
  var NEWLINE = String.fromCharCode(10);
  var entries = null; // normalized {text, speaker, seconds} — fetched once, reused for search
  var hasAudio = !!document.getElementById("episode-audio");

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Turns "H:MM:SS" or "M:SS" into whole seconds. No regex — written as
  // literal <script> text, which sits outside this page's normal JS
  // (see the giant HTML template literal that builds this page): any
  // backslash-escape sequence written here gets silently mangled by
  // that template's own escaping before the browser ever sees it, so
  // this file avoids RegExp and newline-escape sequences entirely
  // rather than fighting it.
  function toSeconds(ts) {
    var parts = (ts || "").split(":");
    var total = 0;
    for (var i = 0; i < parts.length; i++) {
      var n = Number(parts[i]);
      if (isNaN(n)) return null;
      total = total * 60 + n;
    }
    return parts.length ? total : null;
  }

  // Plain substring search (no RegExp) — highlights the first match per
  // line. Avoids constructing a regex from user input entirely.
  function renderEntries(query) {
    var q = (query || "").trim();
    var qLower = q.toLowerCase();
    body.innerHTML = entries
      .map(function (e) {
        var text = e.text;
        var textHtml;
        if (!q) {
          textHtml = escapeHtml(text);
        } else {
          var idx = text.toLowerCase().indexOf(qLower);
          textHtml = idx === -1
            ? escapeHtml(text)
            : escapeHtml(text.slice(0, idx)) + "<mark>" + escapeHtml(text.slice(idx, idx + q.length)) + "</mark>" + escapeHtml(text.slice(idx + q.length));
        }
        var speakerHtml = e.speaker ? "<strong>" + escapeHtml(e.speaker) + ":</strong> " : "";
        var seekable = e.seconds !== null && hasAudio;
        var tsHtml = seekable ? '<span class="transcript-ts">' + escapeHtml(e.timestamp) + "</span> " : "";
        var cls = seekable ? "transcript-line seekable" : "transcript-line";
        var seekAttr = seekable ? ' data-seek="' + e.seconds + '"' : "";
        return '<p class="' + cls + '"' + seekAttr + ">" + tsHtml + speakerHtml + textHtml + "</p>";
      })
      .join("");
    if (q) {
      var firstMark = body.querySelector("mark");
      if (firstMark) firstMark.scrollIntoView({ block: "center" });
    }
    body.querySelectorAll(".seekable").forEach(function (p) {
      p.addEventListener("click", function () {
        var audio = document.getElementById("episode-audio");
        if (!audio) return;
        audio.currentTime = Number(p.dataset.seek);
        audio.play();
      });
    });
  }

  function openModal() {
    overlay.hidden = false;
    if (entries) return;

    fetch("/api/transcript?episode=" + encodeURIComponent(openBtn.dataset.episode))
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || result.data.error || (!result.data.lines && !result.data.transcript)) {
          body.innerHTML = '<p class="state-msg">Could not load the transcript right now.</p>';
          return;
        }

        var downloadText;
        if (result.data.lines) {
          // Drive-hosted transcript: real per-speaker-turn timestamps,
          // speakers, and clickable jump-to-audio. Timestamps are
          // intentionally left out of the download — shown on screen
          // (next to the speaker) only to orient the reader, not
          // cluttering the plain-text copy.
          entries = result.data.lines.map(function (l) {
            return { text: l.text, speaker: l.speaker, timestamp: l.timestamp, seconds: toSeconds(l.timestamp) };
          });
          downloadText = entries.map(function (e) {
            return (e.speaker ? e.speaker + ": " : "") + e.text;
          }).join(NEWLINE);
        } else {
          // Riverside's plain transcript file: no timestamps, no
          // speaker column, so no per-line seeking is possible here.
          var rawLines = result.data.transcript.split(NEWLINE);
          entries = [];
          for (var i = 0; i < rawLines.length; i++) {
            if (rawLines[i].trim()) entries.push({ text: rawLines[i], speaker: null, seconds: null });
          }
          downloadText = result.data.transcript;
        }

        renderEntries("");

        var blob = new Blob([downloadText], { type: "text/plain" });
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = "episode-" + openBtn.dataset.episode + "-transcript.txt";
        downloadLink.hidden = false;
      })
      .catch(function () {
        body.innerHTML = '<p class="state-msg">Could not load the transcript right now.</p>';
      });
  }

  function closeModal() {
    overlay.hidden = true;
  }

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });
  searchInput.addEventListener("input", function () {
    if (entries) renderEntries(searchInput.value);
  });
})();
</script>
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

function buildShareLinks(url, text) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    threads: `https://www.threads.net/intent/post?text=${encodeURIComponent(text + " " + url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
    sms: `sms:?&body=${encodeURIComponent(text + " " + url)}`,
  };
}

function timestampToSeconds(ts) {
  const parts = (ts || "").trim().split(":").map(Number);
  if (!parts.length || parts.some((p) => isNaN(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

// Renders a timestamp as a clickable "jump to this moment" button when
// the episode has audio to seek in, or as plain text otherwise.
function timestampLink(timestamp, audioUrl) {
  if (!timestamp) return "";
  const seconds = timestampToSeconds(timestamp);
  if (audioUrl && seconds !== null) {
    return `<button type="button" class="jump-link" data-seek="${seconds}">&#9654; ${esc(timestamp)}</button>`;
  }
  return `<span class="advice-timestamp">${esc(timestamp)}</span>`;
}

function renderAdviceItem(t, audioUrl) {
  return `<li>
    <div class="advice-meta">
      ${t.pillar ? `<span class="advice-tag">${esc(t.pillar)}</span>` : ""}
      ${timestampLink(t.timestamp, audioUrl)}
    </div>
    <p>${esc(t.advice)}</p>
  </li>`;
}

function renderFaqItem(f, audioUrl) {
  return `<details class="faq-item">
    <summary>${esc(f.question)}</summary>
    <p>${esc(f.answer)}</p>
    ${timestampLink(f.timestamp, audioUrl)}
  </details>`;
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

// Bolds the first mention of the company name within its own bio
// sentence (e.g. "**ReSure Financial** helps real estate investors...").
// Falls back to plain escaped text if the name isn't found verbatim.
function boldFirstMention(text, name) {
  if (!name) return esc(text);
  const idx = text.indexOf(name);
  if (idx === -1) return esc(text);
  return `${esc(text.slice(0, idx))}<strong>${esc(name)}</strong>${esc(text.slice(idx + name.length))}`;
}
