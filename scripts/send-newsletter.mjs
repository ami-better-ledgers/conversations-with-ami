#!/usr/bin/env node
// Send one issue of Still Building with Ami through Resend.
//
//   node scripts/send-newsletter.mjs content/newsletter/issue-11.json --test you@example.com
//   node scripts/send-newsletter.mjs content/newsletter/issue-11.json --send
//
// --test <email>  sends ONE copy to that address (a normal email, so check the unsubscribe link there).
// --send          creates a Resend Broadcast to the whole segment and sends it now.
// (no flag)       dry run: renders the email, saves a preview, sends nothing.
//
// Environment (set in your shell, never committed):
//   RESEND_API_KEY      a FULL ACCESS key from resend.com/api-keys (broadcasts need it)
//   RESEND_SEGMENT_ID    your Segment id in Resend (needed for --send)
//   RESEND_FROM         optional, default: Still Building with Ami <newsletter@conversationswithami.com>
//   RESEND_REPLY_TO     optional, default: ami@conversationswithami.com
//   POSTAL_ADDRESS      optional override; default is the Brooklyn address below (email law requires a physical address)
//
// Resend fills in {{{RESEND_UNSUBSCRIBE_URL}}} per recipient on broadcasts.

import fs from "node:fs";
import path from "node:path";
import { renderEmail } from "../functions/_lib/newsletter-template.js";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && !a.includes("@"));
const testIdx = args.indexOf("--test");
const testTo = testIdx >= 0 ? args[testIdx + 1] : null;
const doSend = args.includes("--send");

if (!file) {
  console.error("Usage: node scripts/send-newsletter.mjs <issue.json> [--test you@example.com | --send]");
  process.exit(1);
}

const issue = JSON.parse(fs.readFileSync(file, "utf8"));
const need = ["number", "title", "date", "conversation", "build", "thinking"];
for (const k of need) if (issue[k] == null) { console.error(`Issue is missing "${k}".`); process.exit(1); }

const key = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM || "Still Building with Ami <newsletter@conversationswithami.com>";
const replyTo = process.env.RESEND_REPLY_TO || "ami@conversationswithami.com";
const address = process.env.POSTAL_ADDRESS || "Conversations with Ami, c/o Better Ledgers Inc., 3611 14th Ave Suite 371, Brooklyn, NY 11218";

const live = Boolean(testTo || doSend);
if (live && !address) { console.error("Set POSTAL_ADDRESS (a real mailing address) before sending."); process.exit(1); }

let html = renderEmail(issue, { baseUrl: "https://www.conversationswithami.com" });
html = html.replace("{{postal_address}}", address.replace(/&/g, "&amp;").replace(/</g, "&lt;") || "{{postal_address}}");
// Broadcasts: Resend substitutes this tag. For a --test email we point it at a real page so the link works.
const unsubTag = "{{{RESEND_UNSUBSCRIBE_URL}}}";
const testHtml = html.replace("{{unsubscribe_url}}", "https://www.conversationswithami.com/newsletter");
html = html.replace("{{unsubscribe_url}}", unsubTag);

const outDir = path.join("assets", "brand", "still-building");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `send-preview-issue-${issue.number}.html`), testHtml);

if (!live) {
  console.log(`Dry run OK. Rendered issue ${issue.number}: "${issue.title}". Preview saved in ${outDir}. Nothing sent.`);
  process.exit(0);
}
if (!key) { console.error("Set RESEND_API_KEY."); process.exit(1); }

const api = async (p, body) => {
  const res = await fetch(`https://api.resend.com${p}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { console.error(`Resend error ${res.status}:`, JSON.stringify(data)); process.exit(1); }
  return data;
};

if (testTo) {
  const r = await api("/emails", { from, to: [testTo], reply_to: replyTo, subject: `[TEST] ${issue.title}`, html: testHtml });
  console.log(`Test email sent to ${testTo}. id: ${r.id}`);
  process.exit(0);
}

const segment = process.env.RESEND_SEGMENT_ID;
if (!segment) { console.error("Set RESEND_SEGMENT_ID."); process.exit(1); }
const b = await api("/broadcasts", {
  segment_id: segment, from, reply_to: replyTo, subject: issue.title,
  name: `Still Building Issue ${String(issue.number).padStart(2, "0")}`, html,
});
const s = await api(`/broadcasts/${b.id}/send`, {});
console.log(`Broadcast ${b.id} sent to the segment.`, JSON.stringify(s));
