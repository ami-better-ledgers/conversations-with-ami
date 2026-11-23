// /api/muse/thumbnails: the drop-off for Muse (Ami's AI assistant).
//   POST  { episode, hook, guest, company, kind?, photoBase64?, photoType? }  -> { ok, id }
//   GET                                                                       -> { waiting: [...] } (no photos)
// Needs the header  Authorization: Bearer <MUSE_API_KEY>.  MUSE_API_KEY is a Cloudflare Pages secret
// (never in the repo). If the secret isn't set, this refuses everything.
// Muse only ADDS to the waiting list; Ami picks from it inside the Studio (behind Cloudflare Access).
import { normalize, createRequest, listRequests } from "../../_lib/thumbnail-requests.js";
import { sendThumbnailEmail } from "../../_lib/thumbnail-email.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function sameSecret(a, b) {
  // constant-time compare of SHA-256 digests
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const A = new Uint8Array(x), B = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < A.length; i++) diff |= A[i] ^ B[i];
  return diff === 0;
}

export async function onRequest(context) {
  const { request, env } = context;
  const key = env.MUSE_API_KEY;
  if (!key || key.length < 24) return json({ error: "Not set up yet." }, 503);
  const given = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!given || !(await sameSecret(given, key))) return json({ error: "Not allowed." }, 401);
  const db = env.DB;
  if (!db) return json({ error: "Database isn't connected." }, 503);

  try {
    if (request.method === "GET") {
      return json({ waiting: await listRequests(db) });
    }
    if (request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "Send JSON." }, 400); }
      const { problems, value } = normalize(body);
      if (problems.length) return json({ error: problems.join(" "), problems }, 400);
      const id = await createRequest(db, value);
      // Email the people who make the thumbnails. If this fails the drop-off is still saved.
      const mail = await sendThumbnailEmail(env, value, id);
      return json({ ok: true, id, emailed: mail.ok, ...(mail.ok ? {} : { emailError: mail.error }), next: "Open /studio-thumbnails and pick it under 'Waiting from Muse'." }, 201);
    }
  } catch (err) {
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
  return json({ error: "Method not allowed." }, 405);
}
