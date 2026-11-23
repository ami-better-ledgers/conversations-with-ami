// Signed, expiring tokens for newsletter signup confirmation (double opt-in).
// A token proves "this address was submitted to the signup form in the last 48 hours"
// without storing anything. It is signed with HMAC-SHA256 using the Resend API key as the
// secret, so no extra secret has to be set up (rotating the key just invalidates pending links).

const enc = new TextEncoder();
const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(`signup-confirm:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signToken(email, secret, ttlSeconds = 48 * 3600) {
  const payload = b64url(enc.encode(JSON.stringify({ e: email, x: Math.floor(Date.now() / 1000) + ttlSeconds })));
  const sig = b64url(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload)));
  return `${payload}.${sig}`;
}

// Returns the email if the token is valid and unexpired, otherwise null.
export async function verifyToken(token, secret) {
  try {
    const [payload, sig] = String(token || "").split(".");
    if (!payload || !sig) return null;
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (!data.e || !data.x || data.x < Math.floor(Date.now() / 1000)) return null;
    return String(data.e);
  } catch {
    return null;
  }
}

// A short, non-reversible id for rate limiting (never store raw IP addresses).
export async function shortHash(value, secret) {
  const buf = await crypto.subtle.sign("HMAC", await hmacKey(`rl:${secret}`), enc.encode(String(value)));
  return b64url(buf).slice(0, 22);
}
