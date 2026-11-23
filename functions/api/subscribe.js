// POST /api/subscribe  { email, name?, website }
// Adds a person as a contact in Resend and puts them in the Still Building with Ami segment.
//
// Needs two environment variables on the Cloudflare Pages project (Settings >
// Environment variables, as encrypted values), plus .dev.vars for local testing:
//   RESEND_API_KEY      a FULL ACCESS API key (resend.com/api-keys). A "sending access" key cannot manage contacts.
//   RESEND_SEGMENT_ID   the Segment id (Resend dashboard > Audience > Segments)
//
// If either is missing the endpoint fails closed with a polite error. It never
// pretends someone subscribed.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export async function onRequestPost(context) {
  let data;
  try {
    data = await context.request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  // Honeypot: real people never fill this hidden field. Pretend success to bots.
  if (data.website) return json({ ok: true });

  const email = String(data.email || "").trim().toLowerCase().slice(0, 200);
  const name = String(data.name || "").trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  const key = context.env.RESEND_API_KEY;
  const segment = context.env.RESEND_SEGMENT_ID;
  if (!key || !segment) {
    return json({ error: "Signup isn't available right now. Please try again soon." }, 503);
  }

  const [firstName, ...rest] = name.split(/\s+/).filter(Boolean);
  try {
    const res = await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        first_name: firstName || undefined,
        last_name: rest.join(" ") || undefined,
        unsubscribed: false,
        segments: [{ id: segment }],
      }),
    });
    if (!res.ok) {
      // Don't leak provider details to the browser.
      return json({ error: "Something went wrong. Please try again." }, 502);
    }
  } catch {
    return json({ error: "Something went wrong. Please try again." }, 502);
  }

  return json({ ok: true });
}

export async function onRequest() {
  return json({ error: "Method not allowed." }, 405);
}
