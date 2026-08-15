// Cloudflare Pages Function — served at /api/companies
//
// Pulls the "featured companies" list from a published Google Sheet, so
// new logos can be added without ever touching code or redeploying the
// site — just edit the spreadsheet and it shows up here within minutes.
//
// SET THIS UP IN CLOUDFLARE:
//   Pages project > Settings > Environment variables
//   Name:  COMPANIES_SHEET_CSV_URL
//   Value: (the published-to-web CSV URL — see README.md for how to get this)
//   Add it to both "Production" and "Preview" environments, then redeploy
//   ONCE. After that, editing the sheet needs no further deploys at all.
//
// EXPECTED SHEET COLUMNS (in this exact order, with a header row):
//   Company Name | Website URL | Logo URL

export async function onRequestGet(context) {
  const csvUrl = context.env.COMPANIES_SHEET_CSV_URL;

  if (!csvUrl) {
    return jsonResponse(
      { error: "COMPANIES_SHEET_CSV_URL is not set. Add it under Pages > Settings > Environment variables." },
      500
    );
  }

  try {
    const res = await fetch(csvUrl, {
      cf: { cacheTtl: 600, cacheEverything: true }, // cache 10 min at the edge
    });

    if (!res.ok) {
      return jsonResponse({ error: `Sheet responded with ${res.status}` }, 502);
    }

    const csvText = await res.text();
    const companies = parseCompaniesCsv(csvText);

    return jsonResponse({ companies }, 200, 600);
  } catch (err) {
    return jsonResponse({ error: "Could not fetch or parse the sheet.", detail: String(err) }, 502);
  }
}

function jsonResponse(data, status, cacheSeconds) {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (cacheSeconds) headers["Cache-Control"] = `public, max-age=${cacheSeconds}`;
  return new Response(JSON.stringify(data), { status, headers });
}

/* ---------- minimal CSV parsing (handles quoted commas) ---------- */

function parseCompaniesCsv(csvText) {
  const rows = parseCsvRows(csvText).filter((r) => r.some((cell) => cell.trim() !== ""));
  if (!rows.length) return [];

  // Skip the header row (assume first row is "Company Name, Website URL, Logo URL")
  const dataRows = rows.slice(1);

  return dataRows
    .map((row) => ({
      name: (row[0] || "").trim(),
      websiteUrl: (row[1] || "").trim(),
      logoUrl: (row[2] || "").trim(),
    }))
    .filter((c) => c.name && c.websiteUrl && c.logoUrl);
}

function parseCsvRows(text) {
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
