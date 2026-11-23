// The confirmation email sent when someone joins the newsletter, and the page shown after
// they click the link. Same look as the issues: sunshine plate, cream body, coral labels.
import { BRAND } from "./newsletter-template.js";

const SERIF = "Fraunces, Georgia, 'Times New Roman', serif";
const SANS = "Inter, Arial, Helvetica, sans-serif";
const LABEL = "Archivo, Arial, Helvetica, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderConfirmEmail(link, baseUrl = "https://www.conversationswithami.com") {
  const a = `${baseUrl}/assets/still-building`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>Confirm your subscription</title></head>
<body style="margin:0;padding:0;background:${BRAND.cream};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.cream};"><tr><td align="center" style="padding:24px 10px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;">
<tr><td bgcolor="${BRAND.sun}" background="${a}/sb-pattern-sun-band.png" style="background:${BRAND.sun} url('${a}/sb-pattern-sun-band.png') repeat;background-size:560px 112px;padding:28px 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${BRAND.sun}" style="background:${BRAND.sun};padding:12px 18px;border-radius:14px;">
    <img src="${a}/sb-logo-blue.png" width="210" alt="Still Building with Ami" style="display:block;width:210px;max-width:100%;height:auto;border:0;">
  </td></tr></table>
</td></tr>
<tr><td style="padding:32px 32px 8px;">
  <p style="margin:0 0 8px;font-family:${LABEL};font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${BRAND.coral};">One more step</p>
  <h1 style="margin:0 0 14px;font-family:${SERIF};font-size:30px;line-height:1.15;font-weight:700;color:${BRAND.deep};">Confirm your subscription</h1>
  <p style="margin:0 0 16px;font-family:${SANS};font-size:17px;line-height:1.6;color:${BRAND.ink};">Thanks for joining Still Building with Ami. Every two weeks you'll get one idea from a real conversation, tested honestly against my own business, with a takeaway you can use.</p>
  <p style="margin:0 0 24px;font-family:${SANS};font-size:17px;line-height:1.6;color:${BRAND.ink};">Tap the button to confirm it's really you:</p>
  <p style="margin:0 0 28px;"><a href="${esc(link)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:${BRAND.blue};color:#ffffff;font-family:${LABEL};font-size:16px;font-weight:700;text-decoration:none;">Yes, subscribe me</a></p>
  <p style="margin:0 0 6px;font-family:${SANS};font-size:13px;line-height:1.6;color:${BRAND.soft};">If the button doesn't work, paste this link into your browser:<br><span style="word-break:break-all;color:${BRAND.blue};">${esc(link)}</span></p>
  <p style="margin:14px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${BRAND.soft};">Didn't ask for this? Ignore this email and nothing happens. You won't be subscribed. The link expires in 48 hours.</p>
</td></tr>
<tr><td style="padding:26px 32px 28px;"><p style="margin:0;font-family:${SERIF};font-size:18px;font-weight:700;color:${BRAND.deep};">Still building. Same as you.<br><span style="font-weight:400;font-size:16px;">&mdash; Ami</span></p></td></tr>
</table></td></tr></table></body></html>`;
}

// A small branded page for the result of clicking the confirmation link.
export function renderConfirmPage({ ok, heading, message }, baseUrl = "") {
  const a = `${baseUrl}/assets/still-building`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(heading)} | Still Building with Ami</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Archivo:wght@700;800&family=Inter:wght@400;600&display=swap">
<style>
body{margin:0;background:${BRAND.cream};font-family:Inter,system-ui,sans-serif;color:${BRAND.ink};line-height:1.65}
.h{background:${BRAND.sun} url('${a}/still-building-pattern-sun.svg') 0 0/240px;padding:2rem 1.25rem}
.p{display:inline-block;background:${BRAND.sun};padding:.9rem 1.3rem;border-radius:18px}.p img{width:min(260px,70vw);display:block}
main{max-width:34rem;margin:0 auto;padding:2.5rem 1.25rem 4rem}
.l{font-family:Archivo,Arial,sans-serif;font-weight:800;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:${ok ? BRAND.coral : BRAND.red}}
h1{font-family:Fraunces,Georgia,serif;font-size:2.2rem;line-height:1.15;color:${BRAND.deep};margin:.4rem 0 1rem}
a.b{display:inline-block;margin:.5rem .6rem .5rem 0;padding:.75rem 1.5rem;border-radius:999px;background:${BRAND.blue};color:#fff;text-decoration:none;font-family:Archivo,Arial,sans-serif;font-weight:700}
a.o{background:#fff;color:${BRAND.blue};border:2px solid ${BRAND.blue}}
</style></head><body>
<div class="h"><span class="p"><img src="${a}/sb-logo-blue.png" alt="Still Building with Ami"></span></div>
<main><p class="l">${ok ? "You're in" : "Something's off"}</p><h1>${esc(heading)}</h1><p>${esc(message)}</p>
<p><a class="b" href="${baseUrl}/newsletter">Read past issues</a><a class="b o" href="${baseUrl}/podcast">Listen now</a></p></main></body></html>`;
}
