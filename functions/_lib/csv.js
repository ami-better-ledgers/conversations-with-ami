// Minimal CSV parsing (handles quoted commas), shared by every Function
// that reads a published-to-web Google Sheet.

export function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ",") { row.push(field); field = ""; }
      else if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (char === "\r") { /* skip */ }
      else { field += char; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Fetches a published-to-web CSV URL and returns its data rows (header
// row stripped, blank rows dropped). Returns [] if csvUrl is falsy or
// the fetch fails — callers treat that the same as "nothing configured
// yet" rather than an error, since these sheets are always optional.
export async function fetchCsvRows(csvUrl, cacheTtl = 600) {
  if (!csvUrl) return [];
  try {
    const res = await fetch(csvUrl, { cf: { cacheTtl, cacheEverything: true } });
    if (!res.ok) return [];
    const rows = parseCsvRows(await res.text()).filter((r) => r.some((cell) => cell.trim() !== ""));
    return rows.slice(1); // drop header row
  } catch (err) {
    return [];
  }
}
