// Sending helpers for the newsletter studio (Resend).
import { renderEmail } from "./newsletter-template.js";

export const POSTAL_ADDRESS = "Conversations with Ami, c/o Better Ledgers Inc., 3611 14th Ave Suite 371, Brooklyn, NY 11218";
const DEFAULT_FROM = "Still Building with Ami <newsletter@conversationswithami.com>";
const DEFAULT_REPLY_TO = "ami@conversationswithami.com";
const SITE = "https://www.conversationswithami.com";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

async function resend(env, path, body) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// One copy to one address. Unsubscribe points at the newsletter page (tests aren't broadcasts).
export async function sendTest(env, issue, to) {
  if (!env.RESEND_API_KEY) return { ok: false, error: "Resend isn't configured." };
  let html = renderEmail(issue, { baseUrl: SITE });
  html = html.replace("{{postal_address}}", esc(POSTAL_ADDRESS)).replace("{{unsubscribe_url}}", `${SITE}/newsletter`);
  const r = await resend(env, "/emails", {
    from: env.RESEND_FROM || DEFAULT_FROM, to: [to], reply_to: env.RESEND_REPLY_TO || DEFAULT_REPLY_TO,
    subject: `[TEST] ${issue.title}`, html,
  });
  return r.ok ? { ok: true, id: r.data.id } : { ok: false, error: "Resend couldn't send the test." };
}

// A Broadcast to the whole segment. Resend fills {{{RESEND_UNSUBSCRIBE_URL}}} per recipient.
export async function sendBroadcast(env, issue) {
  if (!env.RESEND_API_KEY || !env.RESEND_SEGMENT_ID) return { ok: false, error: "Resend isn't configured." };
  let html = renderEmail(issue, { baseUrl: SITE });
  html = html.replace("{{postal_address}}", esc(POSTAL_ADDRESS)).replace("{{unsubscribe_url}}", "{{{RESEND_UNSUBSCRIBE_URL}}}");
  const created = await resend(env, "/broadcasts", {
    segment_id: env.RESEND_SEGMENT_ID, from: env.RESEND_FROM || DEFAULT_FROM, reply_to: env.RESEND_REPLY_TO || DEFAULT_REPLY_TO,
    subject: issue.title, name: `Still Building Issue ${String(issue.number).padStart(2, "0")}`, html,
  });
  if (!created.ok || !created.data.id) return { ok: false, error: "Resend couldn't create the broadcast." };
  const sent = await resend(env, `/broadcasts/${created.data.id}/send`, {});
  if (!sent.ok) return { ok: false, error: "The broadcast was created in Resend but didn't send. Check Resend before retrying.", broadcastId: created.data.id };
  return { ok: true, broadcastId: created.data.id };
}
