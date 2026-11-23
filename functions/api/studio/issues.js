// /api/studio/issues
//   GET            list all issues (number, title, date, status)
//   GET ?number=N  one issue
//   POST           save a draft  { issue: {...} }   (validates; returns problems and warnings)
//   DELETE ?number=N  delete a draft
// Behind Cloudflare Access (see _middleware.js).
import { listIssues, getIssue, normalizeIssue, saveDraft, deleteDraft } from "../../_lib/studio-issues.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function onRequest(context) {
  const db = context.env.DB;
  if (!db) return json({ error: "Database isn't connected." }, 503);
  const url = new URL(context.request.url);
  const method = context.request.method;
  const number = Number.parseInt(url.searchParams.get("number"), 10);

  try {
    if (method === "GET") {
      if (Number.isInteger(number)) {
        const issue = await getIssue(db, number);
        return issue ? json({ issue }) : json({ error: "Issue not found." }, 404);
      }
      return json({ issues: await listIssues(db) });
    }

    if (method === "POST") {
      let body;
      try { body = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
      const { issue, problems, warnings } = normalizeIssue(body.issue);
      // Saving a draft only needs a number, title and date; incomplete sections are fine mid-writing.
      const blocking = problems.filter((p) => /number|Title|Date/.test(p));
      if (blocking.length) return json({ error: blocking.join(" "), problems, warnings }, 400);
      const result = await saveDraft(db, issue);
      if (!result.ok) return json({ error: result.error }, 409);
      return json({ ok: true, problems, warnings, issue });
    }

    if (method === "DELETE") {
      if (!Number.isInteger(number)) return json({ error: "Issue number required." }, 400);
      const result = await deleteDraft(db, number);
      return result.ok ? json({ ok: true }) : json({ error: result.error }, 409);
    }
  } catch (err) {
    return json({ error: "Something went wrong saving. Please try again." }, 500);
  }
  return json({ error: "Method not allowed." }, 405);
}
