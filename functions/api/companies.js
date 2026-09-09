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

import { fetchCsvRows } from "../_lib/csv.js";

export async function onRequestGet(context) {
  const csvUrl = context.env.COMPANIES_SHEET_CSV_URL;

  if (!csvUrl) {
    return jsonResponse(
      { error: "COMPANIES_SHEET_CSV_URL is not set. Add it under Pages > Settings > Environment variables." },
      500
    );
  }

  try {
    const rows = await fetchCsvRows(csvUrl, 600);
    const companies = rows
      .map((row) => ({
        name: (row[0] || "").trim(),
        websiteUrl: (row[1] || "").trim(),
        logoUrl: (row[2] || "").trim(),
      }))
      .filter((c) => c.name && c.websiteUrl && c.logoUrl);

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
