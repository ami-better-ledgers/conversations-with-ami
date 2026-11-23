// Storage + validation for newsletter issues (Cloudflare D1, bound as "DB").
// Status flow: draft -> sent. Only drafts can be edited or deleted.

export async function ensureTable(db) {
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS newsletter_issues (id INTEGER PRIMARY KEY AUTOINCREMENT, number INTEGER NOT NULL UNIQUE, title TEXT NOT NULL, date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sent_at TEXT, broadcast_id TEXT)"
    )
    .run();
}

const clean = (s, max) => String(s ?? "").replace(/\r/g, "").trim().slice(0, max);
const cleanUrl = (u) => {
  const s = clean(u, 500);
  if (!s) return "";
  try {
    const url = new URL(s);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
};

function cleanSection(sec, withLinks) {
  sec = sec || {};
  const out = {
    headline: clean(sec.headline, 200),
    paragraphs: (Array.isArray(sec.paragraphs) ? sec.paragraphs : []).map((p) => clean(p, 4000)).filter(Boolean).slice(0, 40),
    takeaway: clean(sec.takeaway, 600),
  };
  if (withLinks) {
    out.episodeUrl = cleanUrl(sec.episodeUrl);
    out.episodeLabel = clean(sec.episodeLabel, 120);
    out.clipUrl = cleanUrl(sec.clipUrl);
    out.clipLabel = clean(sec.clipLabel, 120);
  }
  return out;
}

// Returns { issue, problems[], warnings[] }. "problems" block sending; "warnings" are advice.
export function normalizeIssue(raw) {
  raw = raw || {};
  const issue = {
    number: Number.parseInt(raw.number, 10),
    title: clean(raw.title, 200),
    date: clean(raw.date, 10),
    conversation: cleanSection(raw.conversation, true),
    build: cleanSection(raw.build, false),
    thinking: cleanSection(raw.thinking, false),
  };
  const problems = [];
  const warnings = [];
  if (!Number.isInteger(issue.number) || issue.number < 1) problems.push("Issue number is required.");
  if (!issue.title) problems.push("Title is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issue.date)) problems.push("Date must look like 2026-11-23.");
  for (const [key, label] of [["conversation", "From the conversation"], ["build", "From the build"], ["thinking", "What I'm thinking"]]) {
    const s = issue[key];
    if (!s.headline) problems.push(`${label}: headline is required.`);
    if (!s.paragraphs.length) problems.push(`${label}: add at least one paragraph.`);
    if (!s.takeaway) warnings.push(`${label}: no takeaway (every section should end with one).`);
  }
  if (!issue.conversation.episodeUrl) warnings.push("No episode link in From the conversation.");
  // Brand rule: sentence-case subject lines. Flag Title Case (3+ capitalised words after the first).
  const words = issue.title.split(/\s+/).slice(1).filter((w) => /^[A-Z][a-z]/.test(w));
  if (words.length >= 3) warnings.push("The title looks like Title Case. Brand rule: sentence case.");
  return { issue, problems, warnings };
}

export async function listIssues(db) {
  await ensureTable(db);
  const { results } = await db
    .prepare("SELECT number, title, date, status, updated_at, sent_at FROM newsletter_issues ORDER BY number DESC")
    .all();
  return results || [];
}

export async function getIssue(db, number) {
  await ensureTable(db);
  const row = await db.prepare("SELECT * FROM newsletter_issues WHERE number = ?").bind(number).first();
  if (!row) return null;
  return { ...JSON.parse(row.data), number: row.number, title: row.title, date: row.date, status: row.status, sentAt: row.sent_at, broadcastId: row.broadcast_id };
}

// Insert or update a DRAFT. Refuses to touch an issue that was already sent.
export async function saveDraft(db, issue) {
  await ensureTable(db);
  const existing = await db.prepare("SELECT status FROM newsletter_issues WHERE number = ?").bind(issue.number).first();
  if (existing && existing.status !== "draft") return { ok: false, error: "That issue was already sent and can't be edited." };
  const now = new Date().toISOString();
  const { number, title, date, ...rest } = issue;
  const data = JSON.stringify(rest);
  if (existing) {
    await db.prepare("UPDATE newsletter_issues SET title = ?, date = ?, data = ?, updated_at = ? WHERE number = ?").bind(title, date, data, now, number).run();
  } else {
    await db.prepare("INSERT INTO newsletter_issues (number, title, date, status, data, created_at, updated_at) VALUES (?, ?, ?, 'draft', ?, ?, ?)").bind(number, title, date, data, now, now).run();
  }
  return { ok: true };
}

export async function deleteDraft(db, number) {
  await ensureTable(db);
  const existing = await db.prepare("SELECT status FROM newsletter_issues WHERE number = ?").bind(number).first();
  if (!existing) return { ok: false, error: "Issue not found." };
  if (existing.status !== "draft") return { ok: false, error: "Sent issues can't be deleted." };
  await db.prepare("DELETE FROM newsletter_issues WHERE number = ?").bind(number).run();
  return { ok: true };
}

export async function markSent(db, number, broadcastId) {
  await db.prepare("UPDATE newsletter_issues SET status = 'sent', sent_at = ?, broadcast_id = ?, updated_at = ? WHERE number = ?")
    .bind(new Date().toISOString(), broadcastId || null, new Date().toISOString(), number).run();
}
