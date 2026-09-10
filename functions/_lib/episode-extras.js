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
//   Name:  TRANSCRIPT_SHEET_CSV_URL
//   Value: the published-to-web CSV URL for each tab — see README.md
//   Add all three to "Production" and "Preview", then redeploy ONCE.
//
// EXPECTED SHEET COLUMNS (in this exact order, with a header row):
//   FAQs tab:        Question | Answer | Episode | Timestamp
//   Top Advice tab:  Advice | Pillar | Timestamp | Episode
//   Transcript tab:  Episode | Transcript  (Transcript = a Google
//                    Drive link to that episode's .txt file — the
//                    file itself, not its text, has to live in Drive:
//                    a full transcript blows past Sheets' ~50,000-
//                    character-per-cell limit. Each file must be
//                    shared "Anyone with the link" or the fetch below
//                    just hits Google's sign-in page instead of the
//                    file.)
//
// "Pillar" on the Top Advice tab is Ami's own per-line categorization
// (e.g. "Core Skills", "Peer Story") — a different, more granular
// taxonomy than the episode-level pillars the AI assigns, and it's
// rendered as free text, not validated against a fixed list.
//
// Timestamp (FAQs/Top Advice) is "H:MM:SS" or "M:SS" matching a point
// in the episode audio — the episode page turns it into a clickable
// jump-to-that-moment link when the episode has an audio file.

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

// Cheap existence check (no Drive fetch) — just whether the sheet has
// a row for this episode, so the page can decide whether to render the
// "Read the transcript" button at all without paying for a full fetch
// + parse of the Drive file on every page view.
export async function hasTranscriptSheetRow(env, episodeNumber) {
  const rows = await fetchCsvRows(env.TRANSCRIPT_SHEET_CSV_URL, 600);
  return rows.some((r) => (r[0] || "").trim() === String(episodeNumber) && r[1]);
}

// Looks up this episode's Drive-hosted transcript file and parses it
// into {timestamp, speaker, text} turns. The file is expected to look
// like Riverside/most transcript tools export it:
//
//   Speaker Name (00:52)
//   Whatever they said, possibly across several paragraphs.
//
//   Other Speaker (01:50)
//   Their reply...
//
// Returns [] (not an error) if the sheet has no row for this episode,
// the link doesn't parse into a Drive file id, or the file isn't
// actually shared "Anyone with the link" — same "just don't show it"
// fallback behavior as everything else in this file.
export async function fetchTranscriptForEpisode(env, episodeNumber) {
  const rows = await fetchCsvRows(env.TRANSCRIPT_SHEET_CSV_URL, 600);
  const row = rows.find((r) => (r[0] || "").trim() === String(episodeNumber));
  if (!row || !row[1]) return [];

  const fileId = extractDriveFileId(row[1].trim());
  if (!fileId) return [];

  try {
    const res = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, {
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    if (!res.ok) return [];

    const text = await res.text();
    return parseTimestampedTranscript(text);
  } catch (err) {
    return [];
  }
}

function extractDriveFileId(url) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function parseTimestampedTranscript(text) {
  const lines = text.split(/\r?\n/);
  const headerRe = /^(.+?)\s*\((\d{1,2}:\d{2}(?::\d{2})?)\)$/;
  const entries = [];
  let current = null;

  for (const line of lines) {
    const m = line.match(headerRe);
    if (m) {
      if (current) entries.push(current);
      current = { speaker: m[1].trim(), timestamp: m[2], text: "" };
    } else if (current) {
      current.text += (current.text ? "\n" : "") + line;
    }
  }
  if (current) entries.push(current);

  return entries.map((e) => ({ ...e, text: e.text.trim() })).filter((e) => e.text);
}
