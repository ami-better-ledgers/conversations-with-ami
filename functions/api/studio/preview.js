// POST /api/studio/preview  { issue }  ->  { html, problems, warnings }
// Renders the email exactly as it would be sent (placeholders filled for preview).
import { normalizeIssue } from "../../_lib/studio-issues.js";
import { renderEmail } from "../../_lib/newsletter-template.js";
import { POSTAL_ADDRESS } from "../../_lib/studio-send.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function onRequestPost(context) {
  let body;
  try { body = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const { issue, problems, warnings } = normalizeIssue(body.issue);
  if (!issue.title) return json({ error: "Add a title first.", problems, warnings }, 400);
  const origin = new URL(context.request.url).origin;
  let html = renderEmail({ ...issue, number: Number.isInteger(issue.number) ? issue.number : 0 }, { baseUrl: origin });
  html = html.replace("{{postal_address}}", POSTAL_ADDRESS).replace("{{unsubscribe_url}}", "#unsubscribe-link-appears-here");
  return json({ html, problems, warnings });
}

export async function onRequest() {
  return json({ error: "Method not allowed." }, 405);
}
