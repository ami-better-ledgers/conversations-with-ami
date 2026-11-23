// Still Building with Ami: newsletter templates.
//
// One issue of content in, two renderings out:
//   renderEmail(issue, opts)  -> table-based, inline-styled HTML safe for email clients (Resend)
//   renderWeb(issue, opts)    -> a full web page for the site's newsletter archive
//
// Issue shape:
// {
//   number: 10,
//   title: "I'm paying him to suck (for now)",        // also the email subject
//   date: "2026-11-09",                               // ISO date
//   conversation: { headline, paragraphs: [..], takeaway, episodeUrl, episodeLabel, clipUrl, clipLabel },
//   build:        { headline, paragraphs: [..], takeaway },
//   thinking:     { headline, paragraphs: [..], takeaway }
// }
// "takeaway" (optional, one per section) is the highlighted line that ends the section.
//
// Section order is fixed: From the conversation, From the build, What I'm thinking.
// All text is plain text (escaped here). Placeholders {{unsubscribe_url}} and
// {{postal_address}} are left in the email for the sender to fill in.

export const BRAND = {
  blue: "#21409A", deep: "#162C6C", red: "#ED2024", sky: "#8BC6E7", sun: "#FFC93C",
  coral: "#FF7A59", cream: "#FFF4E6", peach: "#FFD9C2", ink: "#101013", soft: "#3A3A40",
};
const DESCRIPTION =
  "Still Building with Ami is a bi-weekly newsletter by Ami: honest notes from the process of building a business and figuring things out in real time.";

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function prettyDate(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
const pad = (n) => String(n).padStart(2, "0");

const SERIF = "Fraunces, Georgia, 'Times New Roman', serif";
const SANS = "Inter, Arial, Helvetica, sans-serif";
const LABEL = "Archivo, Arial, Helvetica, sans-serif";

/* ------------------------------ EMAIL ------------------------------ */

function emailSection(label, labelColor, sec, extra = "") {
  const paras = (sec.paragraphs || [])
    .map((p) => `<p style="margin:0 0 16px;font-family:${SANS};font-size:17px;line-height:1.65;color:${BRAND.ink};">${esc(p)}</p>`)
    .join("");
  return `
<tr><td style="padding:34px 36px 0;">
  <p style="margin:0 0 8px;font-family:${LABEL};font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${labelColor};">${esc(label)}</p>
  <div style="height:2px;width:44px;background:${labelColor};line-height:2px;font-size:2px;margin:0 0 14px;">&nbsp;</div>
  <h2 style="margin:0 0 16px;font-family:${SERIF};font-size:26px;line-height:1.2;font-weight:700;color:${BRAND.deep};">${esc(sec.headline)}</h2>
  ${paras}${extra}${emailTakeaway(sec.takeaway)}
</td></tr>`;
}

// The highlighted takeaway that ends each section: a sunshine "highlighter" swipe behind the text.
function emailTakeaway(text) {
  if (!text) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 0;"><tr>
    <td width="5" style="width:5px;background:${BRAND.sun};font-size:0;line-height:0;">&nbsp;</td>
    <td style="padding:6px 0 6px 18px;">
      <p style="margin:0 0 6px;font-family:${LABEL};font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${BRAND.coral};">Takeaway</p>
      <p style="margin:0;font-family:${SERIF};font-size:21px;line-height:1.75;font-weight:700;color:${BRAND.deep};"><span style="background:${BRAND.sun};padding:3px 6px;">${esc(text)}</span></p>
    </td></tr></table>`;
}

function button(href, text, filled) {
  if (!href) return "";
  const style = filled
    ? `background:${BRAND.blue};color:#ffffff;border:2px solid ${BRAND.blue};`
    : `background:#ffffff;color:${BRAND.blue};border:2px solid ${BRAND.blue};`;
  return `<a href="${esc(href)}" style="display:inline-block;margin:0 10px 10px 0;padding:11px 22px;border-radius:999px;font-family:${LABEL};font-size:14px;font-weight:700;text-decoration:none;${style}">${esc(text)}</a>`;
}

export function renderEmail(issue, opts = {}) {
  const base = (opts.baseUrl || "https://www.conversationswithami.com").replace(/\/$/, "");
  const a = `${base}/assets/still-building`;
  const c = issue.conversation || {};
  const listen =
    (c.episodeUrl || c.clipUrl)
      ? `<div style="margin:6px 0 0;">${button(c.episodeUrl, c.episodeLabel || "Listen to the full episode", true)}${button(c.clipUrl, c.clipLabel || "Watch the short clip", false)}</div>`
      : "";
  const t = issue.thinking || {};
  const issueLine = `Issue ${pad(issue.number)} &middot; ${esc(prettyDate(issue.date))}`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>${esc(issue.title)}</title>
<style>@media (max-width:620px){.wrap{width:100%!important}.pad{padding-left:22px!important;padding-right:22px!important}h1{font-size:30px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BRAND.cream};">${esc((c.paragraphs && c.paragraphs[0]) || issue.title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.cream};"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">

<tr><td bgcolor="${BRAND.sun}" background="${a}/sb-pattern-sun-band.png" style="background:${BRAND.sun} url('${a}/sb-pattern-sun-band.png') repeat;background-size:600px 120px;padding:30px 36px;">
  <img src="${a}/sb-logo-blue.png" width="250" alt="Still Building with Ami" style="display:block;width:250px;max-width:100%;height:auto;border:0;">
</td></tr>

<tr><td class="pad" style="padding:30px 36px 0;background:${BRAND.cream};">
  <p style="margin:0 0 10px;font-family:${LABEL};font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${BRAND.coral};">${issueLine}</p>
  <h1 style="margin:0 0 26px;font-family:${SERIF};font-size:38px;line-height:1.12;font-weight:700;color:${BRAND.deep};">${esc(issue.title)}</h1>
</td></tr>

<tr><td style="background:${BRAND.cream};padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:0;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>

${emailSection("From the conversation", BRAND.coral, c, listen)}
${emailSection("From the build", BRAND.blue, issue.build || {})}
${emailSection("What I'm thinking", BRAND.coral, t)}

<tr><td style="padding:34px 36px 0;"><p style="margin:0;font-family:${SERIF};font-size:20px;font-weight:700;color:${BRAND.deep};">Still building. Same as you.<br><span style="font-weight:400;font-size:17px;">&mdash; Ami</span></p></td></tr>

<tr><td style="padding:34px 0 0;"><img src="${a}/sb-pattern-cream-band.png" width="600" alt="" style="display:block;width:100%;height:auto;border:0;"></td></tr>
<tr><td class="pad" style="padding:22px 36px 30px;background:${BRAND.cream};">
  <p style="margin:0 0 12px;font-family:${SANS};font-size:13px;line-height:1.6;color:${BRAND.soft};">${esc(DESCRIPTION)}</p>
  <p style="margin:0 0 12px;font-family:${SANS};font-size:13px;line-height:1.6;color:${BRAND.soft};">
    <a href="${base}/podcast" style="color:${BRAND.blue};">Listen to the podcast</a> &nbsp;&middot;&nbsp;
    <a href="${base}/newsletter" style="color:${BRAND.blue};">Read past issues</a> &nbsp;&middot;&nbsp;
    <a href="${base}" style="color:${BRAND.blue};">conversationswithami.com</a>
  </p>
  <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:${BRAND.soft};">You're getting this because you signed up for Still Building with Ami.<br>
    {{postal_address}}<br>
    <a href="{{unsubscribe_url}}" style="color:${BRAND.blue};">Unsubscribe</a>
  </p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

/* ------------------------------- WEB ------------------------------- */

function webSection(label, cls, sec, extra = "") {
  const paras = (sec.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("");
  const take = sec.takeaway
    ? `<div class="sb-take"><p class="sb-label">Takeaway</p><p class="sb-hl"><mark>${esc(sec.takeaway)}</mark></p></div>`
    : "";
  return `<section class="sb-sec ${cls}"><p class="sb-label">${esc(label)}</p><h2>${esc(sec.headline)}</h2>${paras}${extra}${take}</section>`;
}

export function renderWeb(issue, opts = {}) {
  const base = (opts.baseUrl || "").replace(/\/$/, "");
  const a = `${base}/assets/still-building`;
  const c = issue.conversation || {};
  const t = issue.thinking || {};
  const listen = (c.episodeUrl || c.clipUrl)
    ? `<p class="sb-actions">${c.episodeUrl ? `<a class="sb-btn" href="${esc(c.episodeUrl)}" rel="noopener">${esc(c.episodeLabel || "Listen to the full episode")}</a>` : ""}${c.clipUrl ? `<a class="sb-btn sb-btn-line" href="${esc(c.clipUrl)}" rel="noopener">${esc(c.clipLabel || "Watch the short clip")}</a>` : ""}</p>`
    : "";
  const desc = esc(DESCRIPTION);
  const title = `${esc(issue.title)} | Still Building with Ami`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${esc((c.paragraphs && c.paragraphs[0]) || DESCRIPTION).slice(0, 200)}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Archivo:wght@600;700;800&family=Inter:wght@400;500;600&display=swap">
<style>
:root{--blue:${BRAND.blue};--deep:${BRAND.deep};--sun:${BRAND.sun};--coral:${BRAND.coral};--cream:${BRAND.cream};--ink:${BRAND.ink};--soft:${BRAND.soft}}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font-family:Inter,system-ui,sans-serif;font-size:18px;line-height:1.7;-webkit-font-smoothing:antialiased}
a{color:var(--blue)}
.sb-top{background:#fff;border-bottom:1px solid rgba(16,16,19,.1)}
.sb-top div{max-width:760px;margin:0 auto;padding:.8rem 1.25rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;font-family:Archivo,Arial,sans-serif;font-weight:700;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase}
.sb-top a{text-decoration:none;color:var(--soft)}.sb-top a:hover{color:var(--blue)}
.sb-head{background:var(--sun) url('${a}/still-building-pattern-sun.svg') 0 0/240px;padding:2.2rem 1.25rem}
.sb-head div{max-width:760px;margin:0 auto}
.sb-head img{width:min(300px,80%);height:auto}
.sb-wrap{max-width:760px;margin:0 auto;padding:0 1.25rem 3rem}
.sb-meta{font-family:Archivo,Arial,sans-serif;font-weight:800;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:var(--coral);margin:2.2rem 0 .6rem}
h1{font-family:Fraunces,Georgia,serif;font-weight:700;color:var(--deep);font-size:clamp(2.2rem,1.6rem + 3vw,3.6rem);line-height:1.08;margin:0 0 1.5rem}
.sb-sec{margin-top:2.6rem}
.sb-label{font-family:Archivo,Arial,sans-serif;font-weight:800;font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;color:var(--coral);margin:0 0 .5rem}
.sb-sec.build .sb-label{color:var(--blue)}
.sb-sec .sb-label::after{content:"";display:block;width:44px;height:3px;background:currentColor;margin-top:.5rem}
.sb-sec h2{font-family:Fraunces,Georgia,serif;font-weight:700;color:var(--deep);font-size:clamp(1.6rem,1.3rem + 1.4vw,2.1rem);line-height:1.15;margin:1rem 0 1rem}
.sb-sec p{margin:0 0 1.1rem}
.sb-actions{display:flex;flex-wrap:wrap;gap:.7rem;margin-top:1.2rem!important}
.sb-btn{display:inline-block;font-family:Archivo,Arial,sans-serif;font-weight:700;border-radius:999px;padding:.7rem 1.4rem;text-decoration:none;background:var(--blue);color:#fff;border:2px solid var(--blue);font-size:.95rem}
.sb-btn:hover{transform:translateY(-2px)}.sb-btn-line{background:#fff;color:var(--blue)}
.sb-take{border-left:6px solid var(--sun);padding:.3rem 0 .3rem 1.2rem;margin-top:1.6rem}
.sb-take .sb-label{font-size:.7rem;margin:0 0 .4rem}.sb-take .sb-label::after{display:none}
.sb-hl{font-family:Fraunces,Georgia,serif;font-weight:700;font-size:clamp(1.25rem,1.1rem + .8vw,1.5rem);line-height:1.8;color:var(--deep);margin:0!important}
.sb-hl mark{background:var(--sun);color:var(--deep);padding:.12em .35em;border-radius:.2em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.sb-sign{margin-top:2.6rem;font-family:Fraunces,Georgia,serif;font-weight:700;font-size:1.4rem;color:var(--deep)}
.sb-sign span{font-weight:400;font-size:1.1rem}
.sb-sub{margin-top:3rem;background:var(--deep) url('${a}/still-building-pattern-cream.svg') 0 0/240px;border-radius:22px;padding:0}
.sb-sub div{background:rgba(22,44,108,.94);border-radius:22px;padding:2rem;color:#fff}
.sb-sub h2{font-family:Fraunces,Georgia,serif;color:#fff;margin:0 0 .5rem;font-size:1.8rem}
.sb-sub p{margin:0 0 1rem;color:#e9eefb}.sb-sub .sb-btn{background:var(--sun);color:var(--deep);border-color:var(--sun)}
.sb-foot{margin-top:2.2rem;font-size:.9rem;color:var(--soft)}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head>
<body>
<header class="sb-top"><div><a href="${base}/">Conversations with Ami</a><a href="${base}/newsletter">All issues</a></div></header>
<div class="sb-head"><div><img src="${a}/sb-logo-blue.png" alt="Still Building with Ami"></div></div>
<main class="sb-wrap">
  <p class="sb-meta">Issue ${pad(issue.number)} &middot; ${esc(prettyDate(issue.date))}</p>
  <h1>${esc(issue.title)}</h1>
  ${webSection("From the conversation", "conv", c, listen)}
  ${webSection("From the build", "build", issue.build || {})}
  ${webSection("What I'm thinking", "think", t)}
  <p class="sb-sign">Still building. Same as you.<br><span>&mdash; Ami</span></p>
  <section class="sb-sub"><div>
    <h2>Get the next issue</h2>
    <p>One idea from a real conversation, tested honestly against my own business, with one thing you can try this week.</p>
    <p><a class="sb-btn" href="${base}/newsletter#join">Join Still Building</a></p>
  </div></section>
  <p class="sb-foot">${desc}</p>
</main>
</body></html>`;
}
