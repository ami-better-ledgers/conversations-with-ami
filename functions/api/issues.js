// GET /api/issues: the public list of Still Building with Ami issues, newest first.
// Replaces the old /api/newsletter (Kit) feed for the archive page and the homepage.
import { listPublicIssues } from "../_lib/studio-issues.js";
import { issueExcerpt } from "../_lib/newsletter-template.js";

export async function onRequestGet(context) {
  let issues;
  try {
    issues = await listPublicIssues(context.env.DB);
  } catch {
    return new Response(JSON.stringify({ error: "Couldn't load issues." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const list = issues.map((i) => ({
    number: i.number,
    title: i.title,
    date: i.date,
    excerpt: issueExcerpt(i, 160),
    url: `/newsletter/issue-${String(i.number).padStart(2, "0")}`,
  }));
  return new Response(JSON.stringify({ issues: list }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });
}
