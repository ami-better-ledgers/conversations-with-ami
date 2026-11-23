// POST /api/studio/structure  { notes, number?, guest?, episodeUrl?, clipUrl? }
// Turns Ami's rough notes or a transcript excerpt into a structured Still Building issue,
// following the brand rules. Uses only what is in the notes: no invented facts or quotes.
// Needs ANTHROPIC_API_KEY (already used for episode summaries).
import { normalizeIssue } from "../../_lib/studio-issues.js";

const MODEL = "claude-sonnet-5-5";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const SYSTEM = `You turn Ami Morgenstern's rough notes into one issue of "Still Building with Ami", a bi-weekly newsletter.

THE PROMISE of every issue: one idea from a real conversation, tested honestly against Ami's own business, with a takeaway the reader can use.

STRUCTURE (always exactly these three sections, in this order):
1. conversation ("From the conversation"): a guest's idea from the podcast. Name the guest. Say what they said, in Ami's words.
2. build ("From the build"): Ami's own story of testing that idea in a real business, including what went wrong or what she got wrong.
3. thinking ("What I'm thinking"): a closing reflection on something Ami is working through.
Each section has: a specific headline (sentence case, not generic), paragraphs, and ONE takeaway: a single standalone line (under 30 words) that a reader could remember or repeat. Prefer a sentence Ami actually wrote or said in the notes; otherwise a faithful one-line distillation.

VOICE: first person, warm, plain-spoken, a smart friend a step ahead. Short sentences. No jargon, no hype. Honest about mistakes and unfinished thinking ("I'm at maybe 2.5, not stage three" is the spirit). Contractions are fine. 1 to 4 sentences per paragraph. Never use: unlock, leverage, seamless, guru, hack, game-changer, "simply", "just" (as a minimiser).
TITLE: the issue title in sentence case (only the first word and proper nouns capitalised). It is also the email subject.

HARD RULES:
- Use ONLY facts, events, quotes, names and numbers that appear in the notes. Never invent a story, a quote, a statistic, a person, or a detail. Keep Ami's own wording wherever you can; edit lightly for clarity and flow.
- If the notes do not give enough for a section, write what you can and list the gap in "gaps" (for example "From the build: no personal example in the notes"). Do not fill gaps with made-up material.
- Do not name an employee, client or partner who is not named in the notes. If the notes name a guest, name the guest.
- If one of Ami's companies (Better Ledgers, Dash Staff, qewlabs) appears, say so plainly the first time.

OUTPUT: reply with ONLY a JSON object, no prose, no code fence:
{"title": "...", "conversation": {"headline": "...", "paragraphs": ["..."], "takeaway": "..."}, "build": {"headline": "...", "paragraphs": ["..."], "takeaway": "..."}, "thinking": {"headline": "...", "paragraphs": ["..."], "takeaway": "..."}, "gaps": ["..."]}`;

export async function onRequestPost(context) {
  const key = context.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: "The Claude helper isn't configured (ANTHROPIC_API_KEY is missing)." }, 503);
  let body;
  try { body = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }

  const notes = String(body.notes || "").trim().slice(0, 24000);
  if (notes.length < 80) return json({ error: "Paste more of your notes first (at least a few sentences)." }, 400);
  const guest = String(body.guest || "").trim().slice(0, 120);

  const user = `${guest ? `The guest for this issue: ${guest}.\n` : ""}Ami's notes (rough, possibly out of order):\n\n"""\n${notes}\n"""`;

  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 4000, system: SYSTEM, messages: [{ role: "user", content: user }] }),
    });
  } catch {
    return json({ error: "Couldn't reach Claude. Try again." }, 502);
  }
  if (!res.ok) return json({ error: "Claude returned an error. Try again in a moment." }, 502);

  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || "").join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  let parsed;
  try { parsed = JSON.parse(text.slice(start, end + 1)); } catch { return json({ error: "Claude's answer wasn't usable. Try again." }, 502); }

  const today = new Date().toISOString().slice(0, 10);
  const { issue } = normalizeIssue({
    number: body.number,
    date: body.date || today,
    title: parsed.title,
    conversation: { ...parsed.conversation, episodeUrl: body.episodeUrl, clipUrl: body.clipUrl,
      episodeLabel: body.guest ? `Full episode with ${guest}` : "", clipLabel: body.clipUrl ? "Watch the short clip" : "" },
    build: parsed.build,
    thinking: parsed.thinking,
  });
  const gaps = (Array.isArray(parsed.gaps) ? parsed.gaps : []).map((g) => String(g).slice(0, 300)).slice(0, 8);
  return json({ issue, gaps });
}

export async function onRequest() {
  return json({ error: "Method not allowed." }, 405);
}
