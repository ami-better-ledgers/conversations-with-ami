// Reads FAQs and "Top Advice by Episode" entries for an episode from a
// published Google Sheet — always hand-written and uploaded by Ami,
// never AI-generated. Same live-editing pattern as
// functions/api/companies.js: edit the sheet, no redeploy needed. A row
// whose Episode number doesn't match any published episode is simply
// skipped, not an error — this is how a row can be pre-written for an
// episode that hasn't gone out yet.
//
// SET THIS UP IN CLOUDFLARE:
//   Pages project > Settings > Environment variables
//   Name:  FAQS_SHEET_CSV_URL
//   Name:  TOP_ADVICE_SHEET_CSV_URL
//   Value: the published-to-web CSV URL for each tab — see README.md
//   Add both to "Production" and "Preview", then redeploy ONCE.
//
// EXPECTED SHEET COLUMNS (in this exact order, with a header row):
//   FAQs tab:        Question | Answer | Episode | Timestamp
//   Top Advice tab:  Advice | Pillar | Timestamp | Episode
//
// "Pillar" on the Top Advice tab is Ami's own per-line categorization
// (e.g. "Core Skills", "Peer Story") — a different, more granular
// taxonomy than the episode-level pillars the AI assigns, and it's
// rendered as free text, not validated against a fixed list.
//
// Timestamp is "H:MM:SS" or "M:SS" matching a point in the episode
// audio — the episode page turns it into a clickable jump-to-that-
// moment link when the episode has an audio file.

import { fetchCsvRows } from "./csv.js";

export async function fetchFaqsForEpisode(env, episodeNumber) {
  const rows = await fetchCsvRows(env.FAQS_SHEET_CSV_URL, 600);
  return rows
    .filter((r) => (r[2] || "").trim() === String(episodeNumber))
    .map((r) => ({
      question: (r[0] || "").trim(),
      answer: (r[1] || "").trim(),
      timestamp: (r[3] || "").trim(),
    }))
    .filter((f) => f.question && f.answer);
}

export async function fetchTopAdviceForEpisode(env, episodeNumber) {
  const rows = await fetchCsvRows(env.TOP_ADVICE_SHEET_CSV_URL, 600);
  return rows
    .filter((r) => (r[3] || "").trim() === String(episodeNumber))
    .map((r) => ({
      advice: (r[0] || "").trim(),
      pillar: (r[1] || "").trim(),
      timestamp: (r[2] || "").trim(),
    }))
    .filter((t) => t.advice);
}
