// /api/confirm?t=TOKEN   Step 2 of double opt-in.
//   GET   shows a page with a "Confirm" button (email scanners follow links but don't press buttons,
//         so a scanner can never subscribe someone by itself).
//   POST  verifies the signed token and adds the contact to the Resend segment.
import { verifyToken } from "../_lib/subscribe-token.js";
import { renderConfirmPage } from "../_lib/subscribe-mail.js";

const html = (body, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function confirmPrompt(token, base) {
  // Reuse the branded page, then swap the buttons for the confirm form.
  const page = renderConfirmPage({ ok: true, heading: "One tap to finish", message: "Press the button to confirm your subscription to Still Building with Ami." }, base);
  const form = `<form method="post" action="${base}/api/confirm"><input type="hidden" name="t" value="${esc(token)}"><button class="b" style="border:0;cursor:pointer;font-size:1rem" type="submit">Confirm my subscription</button></form>`;
  return page.replace(/<p><a class="b" href="[^"]*\/newsletter">[\s\S]*?<\/p>/, form).replace("You're in", "Almost done");
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const token = url.searchParams.get("t") || "";
  const key = context.env.RESEND_API_KEY;
  if (!key) return html(renderConfirmPage({ ok: false, heading: "This isn't available right now", message: "Please try again soon." }, url.origin), 503);
  const email = await verifyToken(token, key);
  if (!email) {
    return html(renderConfirmPage({ ok: false, heading: "That link has expired", message: "Confirmation links last 48 hours. Join again from the newsletter page and we'll send a fresh one." }, url.origin), 400);
  }
  return html(confirmPrompt(token, url.origin));
}

export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  const key = context.env.RESEND_API_KEY;
  const segment = context.env.RESEND_SEGMENT_ID;
  if (!key || !segment) return html(renderConfirmPage({ ok: false, heading: "This isn't available right now", message: "Please try again soon." }, url.origin), 503);

  let token = "";
  try {
    token = String((await context.request.formData()).get("t") || "");
  } catch {
    token = "";
  }
  const email = await verifyToken(token, key);
  if (!email) {
    return html(renderConfirmPage({ ok: false, heading: "That link has expired", message: "Confirmation links last 48 hours. Join again from the newsletter page and we'll send a fresh one." }, url.origin), 400);
  }

  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  let done = false;
  try {
    const created = await fetch("https://api.resend.com/contacts", {
      method: "POST", headers,
      body: JSON.stringify({ email, unsubscribed: false, segments: [{ id: segment }] }),
    });
    if (created.ok) {
      done = true;
    } else {
      // Probably already a contact (e.g. they unsubscribed before and are rejoining): resubscribe them.
      const existing = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, { headers });
      if (existing.ok) {
        const upd = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
          method: "PATCH", headers, body: JSON.stringify({ unsubscribed: false }),
        });
        done = upd.ok;
      }
    }
  } catch {
    done = false;
  }

  if (!done) {
    return html(renderConfirmPage({ ok: false, heading: "We couldn't finish that", message: "Something went wrong on our side. Please try the link again in a minute, or email ami@conversationswithami.com." }, url.origin), 502);
  }
  return html(renderConfirmPage({ ok: true, heading: "You're subscribed", message: "Thanks for confirming. Your first issue will arrive with the next one. In the meantime, the past issues are a good place to start." }, url.origin));
}

export async function onRequest() {
  return html("Method not allowed.", 405);
}
