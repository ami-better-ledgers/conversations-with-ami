// The email sent when Muse drops off a guest photo and episode details.
// It goes to the people who make the thumbnails (default: Ami and the social media inbox) with the guest
// photo attached and a button that opens the Thumbnail Studio with this request already loaded.
// Uses Resend (RESEND_API_KEY, already a Pages secret). A failure here never blocks the drop-off.

const SITE = "https://www.conversationswithami.com";
const DEFAULT_FROM = "Conversations with Ami <newsletter@conversationswithami.com>";
const EXT = { "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg" };

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Who gets the email comes ONLY from the Pages variable THUMBNAIL_EMAIL_TO (comma-separated), set in
// Cloudflare. No addresses live in the code or the repo.
export function recipients(env) {
  return String(env.THUMBNAIL_EMAIL_TO || "").split(",").map((e) => e.trim()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
}

export function renderThumbnailEmail(v, id) {
  const link = `${SITE}/studio-thumbnails?request=${encodeURIComponent(id)}`;
  const row = (k, val) => `<tr><td style="padding:6px 14px 6px 0;font-family:Arial,sans-serif;font-size:13px;color:#555;">${k}</td><td style="padding:6px 0;font-family:Arial,sans-serif;font-size:15px;color:#101013;font-weight:700;">${esc(val) || "&mdash;"}</td></tr>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;background:#fff4e6;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 10px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#ffc93c;padding:18px 28px;font-family:Georgia,serif;font-size:20px;font-weight:700;color:#162c6c;">New thumbnail request</td></tr>
<tr><td style="padding:24px 28px 8px;">
<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#101013;">Muse just dropped off a guest photo and the details for the next episode's thumbnails.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">${row("Episode", v.episode)}${row("Hook", v.hook)}${row("Guest", v.guest)}${row("Company", v.company)}${row("Kind", v.kind || "(not set)")}${row("Photo", v.photo_b64 ? "Attached to this email" : "No photo sent")}</table>
<p style="margin:22px 0 10px;"><a href="${esc(link)}" style="display:inline-block;padding:14px 26px;border-radius:999px;background:#d41b1f;color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;">Open in Thumbnail Studio</a></p>
<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#555;">It opens with everything filled in. Check the preview, then download the wide and square versions. You'll be asked to sign in with your work email first.</p>
<p style="margin:0 0 22px;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#777;">Button not working? Paste this into your browser:<br>${esc(link)}</p>
</td></tr></table></td></tr></table></body></html>`;
}

// Returns { ok: boolean, error?: string }
export async function sendThumbnailEmail(env, v, id) {
  const key = env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Email isn't set up (RESEND_API_KEY missing)." };
  const to = recipients(env);
  if (!to.length) return { ok: false, error: "No recipients set (THUMBNAIL_EMAIL_TO is empty)." };
  const body = {
    from: env.THUMBNAIL_EMAIL_FROM || DEFAULT_FROM,
    to,
    subject: `Thumbnail request: Episode ${v.episode}, ${v.hook}`.slice(0, 200),
    html: renderThumbnailEmail(v, id),
  };
  if (v.photo_b64) {
    const slug = (v.guest || "guest").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guest";
    body.attachments = [{ filename: `ep-${v.episode}-${slug}.${EXT[v.photo_type] || "png"}`, content: v.photo_b64 }];
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, error: `Email service said ${res.status}.` };
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't reach the email service." };
  }
}
