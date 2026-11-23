// POST /api/subscribe  { email, website }
// Step 1 of double opt-in: sends a confirmation email with a signed link. Nobody is added to the
// list until they click it (see confirm.js). That stops anyone adding somebody else's address.
//
// Needs (Cloudflare Pages environment variables / .dev.vars locally):
//   RESEND_API_KEY      a FULL ACCESS key (also used to sign the confirmation links)
//   RESEND_SEGMENT_ID   the "Still Building with Ami" segment (used by confirm.js)
// Optional: RESEND_FROM, RESEND_REPLY_TO. Rate limiting uses the D1 database "DB" when it is bound.

import { signToken, shortHash } from "../_lib/subscribe-token.js";
import { renderConfirmEmail } from "../_lib/subscribe-mail.js";

const SITE = "https://www.conversationswithami.com";
const DEFAULT_FROM = "Still Building with Ami <newsletter@conversationswithami.com>";
const DEFAULT_REPLY_TO = "ami@conversationswithami.com";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const OK_MESSAGE = "Almost there. Check your email and tap the confirm button. (If it's not in your inbox in a minute, look in spam.)";

async function throttle(db, secret, email, ip) {
  // Returns "ok", "skip" (same address asked very recently: pretend success, send nothing) or "limit".
  if (!db) return "ok";
  await db.prepare("CREATE TABLE IF NOT EXISTS subscribe_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, k TEXT NOT NULL, at INTEGER NOT NULL)").run();
  const now = Math.floor(Date.now() / 1000);
  const ek = "e:" + (await shortHash(email, secret));
  const ik = "i:" + (await shortHash(ip || "unknown", secret));
  await db.prepare("DELETE FROM subscribe_attempts WHERE at < ?").bind(now - 86400).run();
  const e = await db.prepare("SELECT COUNT(*) AS n FROM subscribe_attempts WHERE k = ? AND at > ?").bind(ek, now - 600).first();
  const i = await db.prepare("SELECT COUNT(*) AS n FROM subscribe_attempts WHERE k = ? AND at > ?").bind(ik, now - 3600).first();
  if ((i?.n || 0) >= 10) return "limit";
  await db.prepare("INSERT INTO subscribe_attempts (k, at) VALUES (?, ?), (?, ?)").bind(ek, now, ik, now).run();
  if ((e?.n || 0) >= 1) return "skip";
  return "ok";
}

export async function onRequestPost(context) {
  let data;
  try {
    data = await context.request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  // Honeypot: real people never fill this hidden field. Pretend success to bots.
  if (data.website) return json({ ok: true, message: OK_MESSAGE });

  const email = String(data.email || "").trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);

  const key = context.env.RESEND_API_KEY;
  if (!key || !context.env.RESEND_SEGMENT_ID) {
    return json({ error: "Signup isn't available right now. Please try again soon." }, 503);
  }

  let verdict = "ok";
  try {
    verdict = await throttle(context.env.DB, key, email, context.request.headers.get("CF-Connecting-IP"));
  } catch {
    verdict = "ok"; // never block a real signup because the rate limiter had a hiccup
  }
  if (verdict === "limit") return json({ error: "Too many attempts. Please try again in a little while." }, 429);
  if (verdict === "skip") return json({ ok: true, message: OK_MESSAGE });

  const host = new URL(context.request.url).hostname;
  const origin = host.endsWith("conversationswithami.com") ? SITE : new URL(context.request.url).origin;
  const token = await signToken(email, key);
  const link = `${origin}/api/confirm?t=${encodeURIComponent(token)}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: context.env.RESEND_FROM || DEFAULT_FROM,
        to: [email],
        reply_to: context.env.RESEND_REPLY_TO || DEFAULT_REPLY_TO,
        subject: "Confirm your subscription to Still Building with Ami",
        html: renderConfirmEmail(link, origin),
      }),
    });
    if (!res.ok) return json({ error: "We couldn't send the confirmation email. Please try again." }, 502);
  } catch {
    return json({ error: "We couldn't send the confirmation email. Please try again." }, 502);
  }

  return json({ ok: true, message: OK_MESSAGE });
}

export async function onRequest() {
  return json({ error: "Method not allowed." }, 405);
}
