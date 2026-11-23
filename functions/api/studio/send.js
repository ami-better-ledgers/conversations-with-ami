// POST /api/studio/send
//   { number, mode: "test", to: "you@example.com" }   -> one test email
//   { number, mode: "send", confirm: "SEND 11" }       -> broadcast to the whole segment
// Always sends the SAVED draft from the database (what you previewed and saved), never a
// body from the browser. A real send needs the typed confirmation and a clean validation.
import { getIssue, normalizeIssue, markSent } from "../../_lib/studio-issues.js";
import { sendTest, sendBroadcast } from "../../_lib/studio-send.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return json({ error: "Database isn't connected." }, 503);
  let body;
  try { body = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }

  const number = Number.parseInt(body.number, 10);
  if (!Number.isInteger(number)) return json({ error: "Issue number required." }, 400);
  const saved = await getIssue(db, number);
  if (!saved) return json({ error: "Save the draft first." }, 404);
  if (saved.status !== "draft") return json({ error: "That issue was already sent." }, 409);

  const { issue, problems, warnings } = normalizeIssue(saved);
  if (problems.length) return json({ error: "Fix these first: " + problems.join(" "), problems, warnings }, 400);

  if (body.mode === "test") {
    const to = String(body.to || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "Enter a valid email for the test." }, 400);
    const r = await sendTest(context.env, issue, to);
    return r.ok ? json({ ok: true, message: `Test sent to ${to}.` }) : json({ error: r.error }, 502);
  }

  if (body.mode === "send") {
    if (body.confirm !== `SEND ${number}`) return json({ error: `Type "SEND ${number}" to confirm.` }, 400);
    // Re-check the unsubscribe-safe path: broadcasts only, never a loop of single emails.
    const r = await sendBroadcast(context.env, issue);
    if (!r.ok) return json({ error: r.error, broadcastId: r.broadcastId }, 502);
    await markSent(db, number, r.broadcastId);
    return json({ ok: true, message: `Issue ${number} sent to your subscribers.`, broadcastId: r.broadcastId });
  }
  return json({ error: "Unknown mode." }, 400);
}

export async function onRequest() {
  return json({ error: "Method not allowed." }, 405);
}
