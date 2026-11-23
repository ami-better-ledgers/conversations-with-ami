// Shared page shell for design system v2: head, header, footer and the apply pop-up.
// Used by the Pages Functions that render HTML (episodes, newsletter issues, podcast)
// and by the static pages, which carry a copy of the same markup.

const SOCIAL = [
  ["YouTube", "https://www.youtube.com/@ConversationswithAmi", "/assets/social-icons/youtube.png"],
  ["Instagram", "https://www.instagram.com/conversationswithami", "/assets/social-icons/instagram.png"],
  ["Facebook", "https://www.facebook.com/conversationswithami/", "/assets/social-icons/facebook.png"],
  ["LinkedIn", "https://www.linkedin.com/company/conversations-with-ami/", "/assets/social-icons/linkedin.png"],
  ["TikTok", "https://www.tiktok.com/@conversationswithami", "/assets/social-icons/tiktok.png"],
  ["Threads", "https://www.threads.com/@conversationswithami", "/assets/social-icons/threads.svg"],
  ["X", "https://x.com/ConverseWithAmi", "/assets/social-icons/x.png"],
];

const LISTEN = [
  ["Apple Podcasts", "https://podcasts.apple.com/us/podcast/conversations-with-ami/id1873041580", "/assets/platform-badges/apple-podcasts.png"],
  ["Spotify", "https://open.spotify.com/show/5RKOn6Eu7p6wPZnXXveiHb?si=791fb114c02b4916", "/assets/platform-badges/spotify.png"],
  ["YouTube", "https://youtube.com/playlist?list=PL3x3OopO8PGq6QsnYC_Pp4eX11WwbAsYx&si=LL7pmngiHCHOn8FD", "/assets/platform-badges/youtube.png"],
  ["YouTube Music", "https://music.youtube.com/playlist?list=PL3x3OopO8PGq6QsnYC_Pp4eX11WwbAsYx&si=zAF1mqK5Om0lyoaU", "/assets/platform-badges/youtube-music.svg"],
  ["Amazon Music", "https://music.amazon.com/podcasts/186d37e6-9e61-407e-8842-5d5aa540bffa/conversations-with-ami", "/assets/platform-badges/amazon-music.png"],
  ["iHeartPodcasts", "https://www.iheart.com/podcast/269-conversations-with-ami-320034306", "/assets/platform-badges/iheart.png"],
  ["Deezer", "https://link.deezer.com/s/340oHTszf2kH0iVvzhfrm", "/assets/platform-badges/deezer.png"],
];

const NAV = [
  ["/", "Home"],
  ["/about", "About"],
  ["/podcast", "The Podcast"],
  ["/newsletter", "Newsletter"],
];

export function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function headTags({ title, description, canonical, ogImage = "https://www.conversationswithami.com/assets/og-image.jpg", ogType = "website", noindex = false, extra = "" }) {
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<meta property="og:type" content="${esc(ogType)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:site_name" content="Conversations with Ami">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="shortcut icon" href="/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/css/v2.css">
<link rel="stylesheet" href="/css/v2-legacy.css">
<script>document.documentElement.classList.add("js");</script>
${extra}`;
}

export function header(current = "") {
  const items = NAV.map(([href, label]) => `      <li><a href="${href}"${href === current ? ' aria-current="page"' : ""}>${label}</a></li>`).join("\n");
  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-nav">
  <div class="wrap bar">
    <a class="brand" href="/" aria-label="Conversations with Ami — home">
      <img src="/assets/logos/Logo_blue.svg" alt="Conversations with Ami">
    </a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="primary-nav" aria-label="Toggle menu"><span></span></button>
    <ul class="nav-links" id="primary-nav">
${items}
      <li class="nav-drop">
        <button type="button" class="nav-drop-btn" aria-expanded="false" aria-controls="nav-companies">Our Companies <span class="caret" aria-hidden="true"></span></button>
        <ul class="nav-sub" id="nav-companies">
          <li><a href="/companies">All our companies</a></li>
          <li><a href="/companies/better-ledgers">Better Ledgers</a></li>
          <li><a href="/companies/dash-staff">Dash Staff</a></li>
          <li><a href="/companies/qewlabs">qewlabs</a></li>
        </ul>
      </li>
      <li class="nav-gap"><button type="button" class="btn btn-line-dark btn-sm" id="apply-modal-trigger">Apply to be on the show</button></li>
      <li><a class="btn btn-red btn-sm" href="/#signup">Join Still Building</a></li>
    </ul>
  </div>
</header>`;
}

export function footer() {
  const social = SOCIAL.map(([n, h, i]) => `          <a href="${h}" target="_blank" rel="noopener" aria-label="${n}"><img src="${i}" alt="${n}"></a>`).join("\n");
  const listen = LISTEN.map(([n, h, i]) => `          <a href="${h}" target="_blank" rel="noopener"><img src="${i}" alt="${n}"></a>`).join("\n");
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      <a class="footer-logo" href="/"><img src="/assets/logos/Logo_white.svg" alt="Conversations with Ami"></a>
      <div class="footer-cols">
        <ul class="footer-links">
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/podcast">The Podcast</a></li>
          <li><a href="/newsletter">Newsletter Archive</a></li>
          <li><a href="/companies">Our Companies</a></li>
          <li><a href="/links">Our Links</a></li>
        </ul>
        <div class="footer-row footer-social">
          <span class="footer-label">Follow</span>
${social}
        </div>
        <div class="footer-row footer-listen">
          <span class="footer-label">Listen on</span>
${listen}
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; <span id="year"></span> Conversations with Ami</span>
      <span>Conversations with Ami, c/o Better Ledgers Inc., 3611 14th Ave Suite 371, Brooklyn, NY 11218</span>
    </div>
  </div>
</footer>`;
}

export function applyModal() {
  return `<div class="apply-modal-overlay" id="apply-modal-overlay" hidden>
  <div class="apply-modal-panel">
    <button type="button" class="apply-modal-close" id="apply-modal-close" aria-label="Close">✕</button>
    <iframe id="apply-modal-iframe" title="Apply to be on the show"></iframe>
  </div>
</div>`;
}

// Newsletter signup panel (the form itself is filled in by /js/newsletter-embed.js).
export function signupPanel({ title = "One idea, every two weeks", text = "The newsletter that goes with the show. Each issue: one idea from a real conversation, tested honestly against my own business, with a takeaway you can use." } = {}) {
  return `<section class="sec bg-sun pat-calm" id="signup">
  <div class="wrap" style="max-width:46rem">
    <div class="news-panel">
      <p class="eyebrow" style="color:var(--sun)">Still Building with Ami</p>
      <h2>${esc(title)}</h2>
      <p>${esc(text)}</p>
      <div class="signup-form-slot"></div>
    </div>
  </div>
</section>`;
}

export function pageHero({ eyebrow, title, lede = "" }) {
  return `<section class="page-hero bg-blue pat-dark">
  <div class="wrap">
    ${eyebrow ? `<p class="eyebrow" style="color:var(--sun)">${esc(eyebrow)}</p>` : ""}
    <h1>${title}</h1>
    ${lede ? `<p class="lede">${lede}</p>` : ""}
  </div>
</section>`;
}

export const BASE_SCRIPTS = ["/js/config.js?v=27", "/js/nav.js?v=27", "/js/apply-modal.js?v=27", "/js/newsletter-embed.js?v=27"];

export function scriptTags(extra = []) {
  return [...BASE_SCRIPTS, ...extra].map((s) => `<script src="${s}"></script>`).join("\n") + `\n<script>document.getElementById("year").textContent = new Date().getFullYear();</script>`;
}

// Just the font + stylesheet links, for pages that build their own <head>.
export const V2_HEAD_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/css/v2.css">
<link rel="stylesheet" href="/css/v2-legacy.css">
<script>document.documentElement.classList.add("js");</script>`;
