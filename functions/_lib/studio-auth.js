// Auth for the private newsletter studio (/studio and /api/studio/*).
//
// The studio sits behind Cloudflare Access (email one-time code). Access puts a signed
// JWT in the "Cf-Access-Jwt-Assertion" header of every request it lets through. We verify
// that token here too, so the API still refuses everyone if Access is ever misconfigured
// or bypassed. It fails CLOSED: if the settings below are missing, nobody gets in.
//
// Environment variables (Cloudflare Pages > Settings > Environment variables):
//   ACCESS_TEAM_DOMAIN     e.g. "yourteam.cloudflareaccess.com"  (Zero Trust > Settings > Custom pages)
//   ACCESS_AUD             the Application Audience (AUD) tag of the Access application
//   STUDIO_ALLOWED_EMAILS  optional, comma-separated; if set, only these emails may use the studio
//
// Local development only: STUDIO_DEV_BYPASS=1 in .dev.vars skips the check, and ONLY when the
// request host is localhost / 127.0.0.1. It is ignored on the real site.

const json = (body, status) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const b64urlToBytes = (s) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const b64urlToJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

let certCache = { at: 0, keys: null, domain: "" };
async function getKeys(domain) {
  const now = Date.now();
  if (certCache.keys && certCache.domain === domain && now - certCache.at < 10 * 60 * 1000) return certCache.keys;
  const res = await fetch(`https://${domain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error("could not fetch Access certs");
  const data = await res.json();
  certCache = { at: now, keys: data.keys || [], domain };
  return certCache.keys;
}

async function verifyJwt(token, env) {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) throw new Error("malformed token");
  const header = b64urlToJson(h);
  const payload = b64urlToJson(p);
  if (header.alg !== "RS256") throw new Error("bad alg");

  const domain = env.ACCESS_TEAM_DOMAIN;
  const keys = await getKeys(domain);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("unknown key");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) throw new Error("bad signature");

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) throw new Error("expired");
  if (payload.nbf && payload.nbf > now + 60) throw new Error("not yet valid");
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) throw new Error("wrong audience");
  if (payload.iss !== `https://${domain}`) throw new Error("wrong issuer");
  return payload;
}

// Returns null when the request is allowed, or a Response to send back when it isn't.
// On success, context.data.studioUser is set to the verified email.
export async function checkStudioAuth(context) {
  const { request, env } = context;
  const host = new URL(request.url).hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";

  if (env.STUDIO_DEV_BYPASS === "1" && isLocal) {
    context.data.studioUser = "local-dev";
    return null;
  }
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return json({ error: "The studio isn't configured yet (Cloudflare Access settings are missing)." }, 503);
  }
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return json({ error: "Sign in required." }, 401);

  let payload;
  try {
    payload = await verifyJwt(token, env);
  } catch {
    return json({ error: "Sign in required." }, 401);
  }

  const email = String(payload.email || "").toLowerCase();
  const list = (v) => String(v || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  let allowed = list(env.STUDIO_ALLOWED_EMAILS);
  // STUDIO_THUMBNAIL_EMAILS: people who may use ONLY the Thumbnail Studio (not the newsletter).
  if (allowed.length && new URL(request.url).pathname.startsWith("/api/studio/thumbnail-requests")) allowed = allowed.concat(list(env.STUDIO_THUMBNAIL_EMAILS));
  if (allowed.length && !allowed.includes(email)) return json({ error: "This account isn't allowed here." }, 403);

  context.data.studioUser = email || "unknown";
  return null;
}
