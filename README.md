# Conversations with Ami — website

## What is this?
This folder is your actual website — every file needed to make it work.
You upload it to Cloudflare (free hosting), then point your domain at it.
No coding required for any of this.

---

## Step-by-step: deploying to Cloudflare Pages

**1. Log into Cloudflare**
Go to https://dash.cloudflare.com and sign in (or sign up, free).

**2. Find Workers & Pages**
In the left sidebar, click **Workers & Pages**.

**3. Start a new project**
Click **Create application** (top right).

**4. Choose Pages, not Workers**
You'll likely land on a Workers-focused screen first. Look for a link near
the top or bottom of that screen that says something like
**"Looking to deploy Pages? Get started"** and click it.
(If you instead see two clear tabs labeled **Workers** and **Pages**, just
click the **Pages** tab.)

This step matters — Workers does *not* support the `functions/api` folder
this site needs for the podcast episode list and newsletter archive to
update automatically. Pages does.

**5. Upload the site**
Choose **Upload assets** (as opposed to connecting a GitHub repo).
Drag in the zip file (`conversations-with-ami-site.zip`) — Cloudflare will
unzip it automatically. If you unzip it yourself first, drag in the
folder's *contents* (index.html, css, js, functions, assets all visible at
the top level) rather than a folder-within-a-folder.

**6. Name it and deploy**
Give the project a name (e.g. `conversations-with-ami`), leave build
settings blank/default, click **Deploy**.

**7. Confirm it works**
Cloudflare gives you a link like `your-project-name.pages.dev`. Open it.
Click through to the Podcast page too — episodes may take a few seconds
to load the first time.

---

## Connect your Squarespace domain

1. In the same Cloudflare Pages project: **Custom domains** tab →
   **Set up a custom domain** → type your domain (e.g. `conversationswithami.com`).
2. Cloudflare will show a DNS record to add (usually a CNAME pointing at
   your `.pages.dev` address) — or, since your domain's DNS is already on
   Cloudflare, it may offer to add this automatically. Let it, if so.
3. If it instead gives you a record to add manually: go to
   **Squarespace → Domains → your domain → DNS Settings**, and add exactly
   what Cloudflare showed you.
4. Give it anywhere from a few minutes up to a day to take effect.

Squarespace keeps owning the domain registration — it just stops hosting,
and hands visitors to Cloudflare instead. The `.pages.dev` link works fine
for testing in the meantime, before the domain is connected.

---

## Two things that make content update automatically

### Podcast episodes — already working, no setup needed
The RSS feed URL (`https://api.riverside.com/hosting/qfuudTdb.rss`) is
already built into the code. As soon as the site is deployed on Pages
(not Workers), the episode list will populate itself and stay current.

### Newsletter archive — one setup step (Kit API key)
This one needs a piece of account access from Kit, so it has to be a
secret rather than something baked into these files (a secret in the code
would be visible to anyone who ever saw the site's files). Here's the setup:

1. In Kit: **Settings → Developer** → **Add a new key** → name it anything
   (e.g. "Website") → copy the key immediately (Kit only shows it once).
2. In your Cloudflare Pages project: **Settings → Environment variables**
   → **Add variable**.
3. Name: `KIT_API_KEY` (exactly that). Value: the key you copied.
   Add it for both **Production** and **Preview**.
4. Save, and redeploy if it doesn't redeploy automatically.
5. Going forward, whenever you send a broadcast in Kit, toggle it as
   **Public** while sending — that's what generates the shareable link.
   Only broadcasts marked Public appear in the archive; anything else
   stays private, same as it already is.

Once set, new issues show up on the Newsletter Archive page within about
15 minutes of sending — nothing to upload by hand.

---

## The newsletter sign-up form
Already wired in and working — no action needed. It appears on all three
pages via the embed you sent earlier.

## The About page
Already has the real bio/copy in place — no action needed.

---

## Podcast video: one setup step (YouTube API key)

Episodes now get a "Watch" button that expands an embedded YouTube player,
matched automatically to your channel (@ConversationswithAmi) by title —
new episodes will match automatically too, as long as the YouTube title
and RSS title are the same or similar (guest name matches). Here's the
one-time setup:

1. Go to https://console.cloud.google.com (this is a different Google
   tool than YouTube Studio — Studio itself doesn't do this part).
2. Create a project if you don't have one (top left, "Select a project" → "New Project").
3. In the search bar, search **"YouTube Data API v3"** → open it → click **Enable**.
4. Go to **APIs & Services → Credentials** → **Create Credentials** → **API key**.
5. Copy the key. (Optional but recommended: click "Restrict key" and limit
   it to the YouTube Data API v3 only, so it can't be used for anything else.)
6. In Cloudflare Pages: your project → **Settings → Environment variables**
   → add one named exactly `YOUTUBE_API_KEY`, value = the key you copied.
   Add it for both **Production** and **Preview**, then redeploy.

That's it — no changes needed here whenever you publish a new episode,
as long as it's uploaded to the same YouTube channel.

## What's still needed from you
- [ ] The Kit API key (5-minute setup above) — this is the only remaining piece
- [ ] Sending your first Public-marked newsletter issue, whenever ready

## File map (for reference — you don't need to touch these)
```
index.html                  Home page (latest episode, Instagram, newsletter, listen-everywhere, apply CTA)
about.html                   Full About page
podcast.html                 Episode list
newsletter.html              Newsletter archive
css/tokens.css                Colors, type, spacing
css/style.css                 All layout & component styles
js/config.js                  Kit.com sign-up form snippet + Instagram post URLs live here
js/newsletter-embed.js        Injects the Kit sign-up form into every page
js/newsletter-archive.js      Fetches past issues from Kit and renders them
js/home.js                    Homepage: latest episode, Instagram embeds, latest issue
js/apply-modal.js             Wires up the "Apply to be on the show" popup
js/nav.js                     Mobile menu behavior
js/episodes.js                Renders episodes from the RSS feed (with show notes toggle)
js/youtube-map.js             Matches episodes to YouTube videos by title (for the Watch button)
functions/api/episodes.js     Server-side code that fetches your RSS feed
functions/api/newsletter.js   Server-side code that fetches your public Kit issues
functions/api/youtube.js      Server-side code that fetches your YouTube channel's videos + durations
assets/logos/                 Your brand logo files
assets/social-icons/          Follow-us icons (YouTube, Instagram, Facebook, LinkedIn, TikTok, Threads, X)
assets/platform-badges/       Listen-everywhere badges (Apple, Spotify, YouTube, YouTube Music, Amazon, iHeart, Deezer)
```

## Still to come
- Nothing else pending — the guest application form is now live (see below).

## What's new in this update
- **Shorts page removed** — replaced with an Instagram embed section on the Home page.
- **Instagram embed** — add post/reel URLs to `INSTAGRAM_POST_URLS` in `js/config.js` (see the comment there for exactly how). Nothing shows until you add at least one URL.
- **Cache-busting** — every CSS/JS file is now loaded with a `?v=2` version tag. When I send updates in the future, I'll bump this number, which forces browsers (and Cloudflare's cache) to grab the new version instead of an old cached copy. This should stop the "I uploaded it but nothing changed" issue we kept running into.

## What's new in this update
- **Guest application** — the "Apply to be on the show" button (top right, every page) opens your form in a popup. The form itself lives at `apply/index.html` and already has its own submission endpoint wired in from the file you sent — nothing else to configure.
- **Footer** — now shows both "Follow" (social platforms) and "Listen on" (podcast platforms), on every page.
- **Browser tab icon (favicon)** — the profile silhouette, switching automatically between black and white based on the visitor's light/dark browser theme.
