// Waiting list for the Thumbnail Studio: Muse (or anyone holding the key) drops off a guest photo
// plus the episode details; Ami opens the Studio, picks it from "Waiting from Muse", and downloads
// the thumbnails. Stored in the D1 database bound as "DB". Photos are kept as base64 text and are
// capped so a row always fits (D1 allows about 2 MB per row).

export const MAX_PHOTO_BASE64 = 1_600_000; // about 1.2 MB of image
const TYPES = { "image/png": 1, "image/webp": 1, "image/jpeg": 1 };
const KINDS = ["peer", "literacy", "planning", "nottodo", "skills"];

export async function ensureTable(db) {
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS thumbnail_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, episode TEXT NOT NULL, kind TEXT NOT NULL DEFAULT '', hook TEXT NOT NULL, guest TEXT NOT NULL DEFAULT '', company TEXT NOT NULL DEFAULT '', photo_type TEXT NOT NULL DEFAULT '', photo_b64 TEXT NOT NULL DEFAULT '')"
    )
    .run();
}

const clean = (s, max) => String(s ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

// Accepts { episode, kind?, hook, guest, company, photoBase64? (or a data: URL), photoType? }
export function normalize(raw) {
  raw = raw || {};
  const problems = [];
  const episode = clean(raw.episode, 10);
  if (!/^[0-9]{1,4}$/.test(episode)) problems.push("episode must be a number, like 21.");
  const hook = clean(raw.hook, 120);
  if (!hook) problems.push("hook is required (the title before the |).");
  const kind = KINDS.includes(raw.kind) ? raw.kind : "";
  if (raw.kind && !kind) problems.push("kind must be one of: " + KINDS.join(", ") + ".");

  let photoType = clean(raw.photoType, 30).toLowerCase();
  let b64 = String(raw.photoBase64 ?? raw.photo ?? "").trim();
  const m = /^data:([a-z/+.-]+);base64,(.*)$/is.exec(b64);
  if (m) { photoType = photoType || m[1].toLowerCase(); b64 = m[2]; }
  b64 = b64.replace(/\s+/g, "");
  if (b64) {
    if (!TYPES[photoType]) problems.push("photoType must be image/png, image/webp or image/jpeg.");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) problems.push("photoBase64 isn't valid base64.");
    if (b64.length > MAX_PHOTO_BASE64) problems.push("The photo is too big. Send a PNG or WebP up to about 1.2 MB (around 1000 px wide is plenty).");
  } else {
    photoType = "";
  }
  return {
    problems,
    value: { episode, kind, hook, guest: clean(raw.guest, 60), company: clean(raw.company, 60), photo_type: photoType, photo_b64: b64 },
  };
}

export async function createRequest(db, v) {
  await ensureTable(db);
  // keep the list tidy: drop anything older than 30 days
  await db.prepare("DELETE FROM thumbnail_requests WHERE created_at < datetime('now','-30 days')").run();
  const r = await db
    .prepare("INSERT INTO thumbnail_requests (created_at, episode, kind, hook, guest, company, photo_type, photo_b64) VALUES (datetime('now'),?,?,?,?,?,?,?)")
    .bind(v.episode, v.kind, v.hook, v.guest, v.company, v.photo_type, v.photo_b64)
    .run();
  return r.meta.last_row_id;
}

export async function listRequests(db) {
  await ensureTable(db);
  const r = await db
    .prepare("SELECT id, created_at, episode, kind, hook, guest, company, photo_type, length(photo_b64) AS photo_size FROM thumbnail_requests ORDER BY id DESC LIMIT 50")
    .all();
  return r.results || [];
}

export async function getRequest(db, id) {
  await ensureTable(db);
  return await db.prepare("SELECT * FROM thumbnail_requests WHERE id = ?").bind(id).first();
}

export async function deleteRequest(db, id) {
  await ensureTable(db);
  await db.prepare("DELETE FROM thumbnail_requests WHERE id = ?").bind(id).run();
}
