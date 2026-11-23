// POST /api/brand-kit
// Records that someone accepted the brand kit terms (name + email + timestamp),
// then returns the download link. Storage is a Cloudflare D1 database bound to
// this Pages project as "DB" (see brand-kit-schema.sql and README.md).
//
// The download link is an unguessable path, not a locked file: this is an
// "accept the terms first" step, not security. Rotate the path (see README)
// if the link ever needs to be revoked.

const TERMS_VERSION = "1.0";
const DEFAULT_ZIP_PATH =
  "/assets/kit/c2631bf2890e6df4539cb36b/Conversations-with-Ami-Brand-Kit.zip";

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

  // Honeypot: real people never fill this hidden field.
  if (data.website) return json({ ok: true, url: DEFAULT_ZIP_PATH });

  const name = String(data.name || "").trim().slice(0, 120);
  const email = String(data.email || "").trim().toLowerCase().slice(0, 200);
  const agreed = data.agree === true;

  if (!name) return json({ error: "Enter your name." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }
  if (!agreed) {
    return json({ error: "Tick the box to accept the terms." }, 400);
  }

  const db = context.env.DB;
  if (!db) {
    // Fail closed: if we can't keep a record, don't hand out the file.
    return json(
      { error: "The brand kit isn't available right now. Please email ami@conversationswithami.com." },
      503
    );
  }

  try {
    // Idempotent: creates the table on first use (same schema as brand-kit-schema.sql).
    await db
      .prepare(
        "CREATE TABLE IF NOT EXISTS brand_kit_acceptances (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, terms_version TEXT NOT NULL, accepted_at TEXT NOT NULL, user_agent TEXT)"
      )
      .run();
    await db
      .prepare(
        "INSERT INTO brand_kit_acceptances (name, email, terms_version, accepted_at, user_agent) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(
        name,
        email,
        TERMS_VERSION,
        new Date().toISOString(),
        (context.request.headers.get("User-Agent") || "").slice(0, 300)
      )
      .run();
  } catch (err) {
    return json({ error: "Something went wrong saving your acceptance. Please try again." }, 500);
  }

  return json({ ok: true, url: context.env.BRAND_KIT_ZIP_PATH || DEFAULT_ZIP_PATH });
}

// Anything but POST: not allowed.
export async function onRequest() {
  return json({ error: "Method not allowed." }, 405);
}
