// Public page for one newsletter issue: /newsletter/issue-10
// Shows the migrated issues (1 to 10) plus any issue sent from the studio.
// Anything else under /newsletter/ is a 404.
import { getPublicIssue } from "../_lib/studio-issues.js";
import { renderWeb } from "../_lib/newsletter-template.js";

const notFound = () =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Issue not found</title>
<body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>We couldn't find that issue</h1>
<p><a href="/newsletter">See all issues of Still Building with Ami</a></p></body>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

export async function onRequestGet(context) {
  const m = /^issue-(\d{1,4})$/.exec(String(context.params.slug || ""));
  if (!m) return notFound();
  let issue = null;
  try {
    issue = await getPublicIssue(context.env.DB, Number.parseInt(m[1], 10));
  } catch {
    return new Response("Something went wrong. Please try again.", { status: 500 });
  }
  if (!issue) return notFound();
  const origin = new URL(context.request.url).origin;
  return new Response(renderWeb(issue, { baseUrl: origin }), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
