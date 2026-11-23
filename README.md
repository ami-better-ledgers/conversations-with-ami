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

---

## Individual episode pages + AI-written summaries: two setup steps

Every episode now gets its own real page at `/episodes/<episode-name>` —
this is what lets Google index episode content directly (a JS-rendered
list alone isn't enough). Without any setup, these pages already work,
built from your RSS feed alone (title, guest name/company, show notes,
audio player).

To have Claude automatically write the richer version of each page —
a proper written summary, guest bio, and the specific problem the
episode solves — for every new episode with zero manual work, do this
one-time setup:

1. Go to https://console.anthropic.com, create an API key.
2. In Cloudflare Pages: your project → **Settings → Environment variables**
   → add one named exactly `ANTHROPIC_API_KEY`, value = the key you copied.
   Add it for both **Production** and **Preview**, then redeploy.
3. In Cloudflare Pages: your project → **Settings → Functions → KV namespace
   bindings** → create a new KV namespace (any name, e.g. "episode-ai-cache")
   → bind it to this project with the variable name exactly `EPISODE_AI_CACHE`.
   This makes the write-up get generated once per episode (cached), not
   regenerated on every single page view.

Without step 3, the site still works, but skips the cache — so only do
step 1+2 without step 3 if you're just testing.

If you'd rather write a specific episode's page by hand instead of
letting Claude write it, add an entry to `content/episodes.json` — see
the two Bernard Reisz episodes already in there as an example. A
hand-written entry always takes priority over the AI-generated one.

### FAQs and Top Advice by Episode — a Google Sheet, no redeploy needed

These two sections are never AI-generated — you write and publish them
yourself in a Google Sheet, same live-editing pattern as the featured
companies carousel below. It layers on top of whatever the episode
page already has (AI-generated or hand-written), so adding FAQs or top
advice doesn't require a `content/episodes.json` entry at all. A row
for an episode number that hasn't published yet just doesn't show up —
no error, it appears automatically once that episode goes live.

**One-time setup:**

1. Add two new tabs to a Google Sheet — this can be the same spreadsheet
   you already use for the featured-companies carousel, or a brand new
   one, it doesn't matter which. Each tab publishes to its own separate
   CSV link regardless of what else is in the spreadsheet:
   - A tab named **FAQs** with headers in row 1, in this order:
     `Question`, `Answer`, `Episode`, `Timestamp`
   - A tab named **Top Advice by Episode** with headers in row 1, in this order:
     `Advice`, `Pillar`, `Timestamp`, `Episode`
   - The `Episode` column is the episode number (1, 2, 3…) — the same
     number iTunes/Spotify show for that episode.
   - `Timestamp` (optional, both tabs) is where in the episode this is
     discussed, as `M:SS` or `H:MM:SS` (e.g. `12:23`) — it renders as a
     clickable link that jumps the audio player to that moment.
   - `Pillar` (Top Advice tab only, optional) is your own label for
     that specific piece of advice (e.g. "Core Skills", "Peer Story")
     — this is separate from the broader topic pillars shown at the
     top of the page, and can be anything you want, there's no fixed list.
   - Column order matters — the code reads each column by its position,
     not by the header text above it, so keep them in the order listed.
2. **File → Share → Publish to web.** In the dialog, set the *first*
   dropdown to the **FAQs** tab specifically (not "Entire Document"),
   the second dropdown to **CSV**, then click **Publish**. Copy the URL.
3. Repeat step 2, this time selecting the **Top Advice by Episode**
   tab, to get a second CSV URL.
4. In Cloudflare Pages: your project → **Settings → Environment variables**:
   - Name: `FAQS_SHEET_CSV_URL` → Value: the FAQs CSV URL
   - Name: `TOP_ADVICE_SHEET_CSV_URL` → Value: the Top Advice CSV URL
   - Both as **Text** (not secret — already public once published),
     applied to both **Production** and **Preview**
5. Save, and redeploy once so the variables take effect. After that,
   editing either tab needs no further deploys — changes show up on
   the site within about 10 minutes.

Renaming a tab (or the little "table" name Sheets shows above the
header row) later never breaks the published link — Google ties the
published CSV to the tab's internal ID, not its display name.

**Every time after that:** just add a row to the relevant tab with the
episode number it belongs to. Multiple rows can share the same episode
number (e.g. 5 FAQ rows all with `12` in the Episode column).

### Transcripts — Google Drive + a Sheet tab, with real clickable timestamps

Riverside's own transcript export has no timestamps at all, so it can't
support "jump to this moment" — this is a separate source you control
that can. A full transcript is also way too long for a single Sheets
cell (the ~50,000-character limit), so the file itself lives in Google
Drive; the Sheet just points to it.

**One-time setup:**

1. Add one more tab, named **Transcripts**, with headers in row 1:
   `Episode`, `Transcript`.
2. For each episode, upload its transcript `.txt` file to Google Drive.
   The file needs to look like a normal speaker-labeled transcript, one
   blank line between turns:
   ```
   Speaker Name (00:52)
   Whatever they said, across as many paragraphs as needed.

   Other Speaker (01:50)
   Their reply...
   ```
   Timestamps can be `M:SS` or `H:MM:SS`.
3. **Right-click the file in Drive → Share → General access → "Anyone
   with the link."** This step is required — without it, the site gets
   Google's sign-in page instead of your file, and the transcript
   button just won't have anything to show.
4. Copy that file's share link, paste it into the **Transcript** column
   next to that episode's number. Any Drive share-link format works —
   the code pulls the file id out of it.
5. **File → Share → Publish to web**, first dropdown set to
   **Transcripts**, second to **CSV**, **Publish**. Copy the URL.
6. In Cloudflare Pages: **Settings → Environment variables** → add
   `TRANSCRIPT_SHEET_CSV_URL` with that URL, applied to **Production**
   and **Preview**, then redeploy once.

**Every time after that:** upload the new file to Drive, share it the
same way, and add a row. If an episode has no row here (or the row's
file isn't shared correctly), the transcript button falls back to
Riverside's plain version automatically — it only disappears entirely
if neither exists.

## What's still needed from you
- [ ] The Kit API key (5-minute setup above) — this is the only remaining piece
- [ ] Sending your first Public-marked newsletter issue, whenever ready
- [ ] The Anthropic API key + KV namespace above, if you want episode pages
      to get the AI-written summary instead of the plain RSS version
- [ ] The FAQs/Top Advice Google Sheet setup above, whenever you're ready
      to start adding those to episode pages
- [ ] The Transcripts Sheet + Drive setup above, for real clickable-
      timestamp transcripts instead of Riverside's plain version

## Featured companies carousel: how to add new ones (no redeploy needed)

This is set up so that adding a new company logo never requires touching
GitHub or Cloudflare again after the one-time setup below — you just add a
row to a spreadsheet, and it shows up on the site within about 10 minutes.

### One-time setup

1. Create a new Google Sheet with exactly these three column headers in
   row 1: `Company Name`, `Website URL`, `Logo URL`
2. Add one row per company below that, e.g.:
   | Company Name | Website URL | Logo URL |
   |---|---|---|
   | Acme Co | https://acme.com | https://acme.com/logo.png |
3. **File → Share → Publish to web.** In the dialog, set the second
   dropdown to **CSV**, then click **Publish**. Copy the URL it gives you.
4. In Cloudflare Pages: your project → **Settings → Environment variables**
   → **Add variable**:
   - Name: `COMPANIES_SHEET_CSV_URL`
   - Value: the CSV URL you just copied
   - Type: **Text** (this one isn't a secret — it's already public once published)
   - Apply to both **Production** and **Preview**
5. Save, and redeploy once (Deployments tab → Retry deployment) so the
   variable takes effect. This is the *only* deploy you'll ever need for this.

### Every time after that — adding a new company

1. Open the Google Sheet
2. Add a new row: company name, their website URL, and a direct link to
   their logo image (right-click their logo on their own site → "Copy
   image address" is usually the fastest way to get this)
3. That's it — no upload, no GitHub, no Cloudflare. It appears on the
   Home page automatically the next time the page's cache refreshes
   (about 10 minutes).

If a logo ever looks the wrong size, it's because the source image itself
is unusually large or oddly cropped — the carousel automatically scales
every logo to the same height, but very wide or very tall source logos
may look different from the others. A clean, tightly-cropped logo file
looks best.

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
functions/api/companies.js    Server-side code that fetches the featured-companies Google Sheet
functions/episodes/[slug].js  Server-side code that renders each individual episode page
functions/_lib/rss.js         Shared RSS parsing, used by functions/api/episodes.js and the episode pages
functions/_lib/ai-summary.js  Calls Claude to write the episode summary/bio, caches it in KV
content/episodes.json         Hand-written episode content (optional — overrides the AI-generated version)
functions/_lib/curated.js     Shared lookup map for content/episodes.json
functions/_lib/episode-extras.js  Reads FAQs/Top Advice/Transcripts for an episode from the Google Sheet(s)
functions/_lib/csv.js         Shared CSV fetch/parse, used by companies.js and episode-extras.js
js/companies-carousel.js      Renders the featured-companies logo carousel
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

---

## Brand kit page (/brand-kit)

A public page where press, guests and partners accept the brand-kit terms and then
download the kit (`brand-kit.html`, `functions/api/brand-kit.js`).

**One-time setup (Cloudflare dashboard)**
1. Create a D1 database (e.g. `brand-kit-acceptances`).
2. Pages project > Settings > Bindings > Add > **D1 database**, variable name **`DB`**,
   pick that database. Do this for Production (and Preview if you use it), then redeploy.
   (The function creates its table on first use. Schema is also in `brand-kit-schema.sql`.)
3. If `DB` isn't bound the form fails closed: nobody gets the file and a polite error is shown.

**Seeing who accepted:** D1 > your database > Console > `SELECT * FROM brand_kit_acceptances ORDER BY id DESC;`

**Updating the kit:** build a new zip, put it at a new unguessable path under `assets/kit/`,
and set the Pages environment variable `BRAND_KIT_ZIP_PATH` to that path (or edit
`DEFAULT_ZIP_PATH` in the function). Delete the old folder to revoke the old link.
Note: the zip is a normal public file at an unguessable address. The terms step is a
good-faith gate, not security.

**Local testing:** the dev server runs with `--d1=DB` (a local throwaway database).

---

## Newsletter on Resend (Still Building with Ami)

Subscribers live in a **Resend Segment**. The site's signup form posts to `/api/subscribe`,
and each issue is sent with `scripts/send-newsletter.mjs` as a Resend **Broadcast**
(Resend handles unsubscribes). Issues are stored as `content/newsletter/issue-NN.json`
and rendered by `functions/_lib/newsletter-template.js`.

**One-time setup**
1. **Domain:** Resend > Domains > add `conversationswithami.com`, add the DNS records it shows
   in Cloudflare DNS, wait for "Verified". (Resend can also configure Cloudflare for you.)
2. **Segment:** Resend > Audience > Segments > create "Still Building with Ami". Copy its ID.
3. **API key:** Resend > API Keys > create one with **Full access** (a "Sending access" key can only send single emails; it cannot manage contacts or create broadcasts, and only a sending-access key can be limited to one domain). Keep it secret.
4. **Site secrets:** Cloudflare Pages > Settings > Environment variables (encrypted):
   `RESEND_API_KEY` and `RESEND_SEGMENT_ID`. Redeploy.
5. **Import existing subscribers:** export your list from Kit (CSV) and import it into the
   Resend Segment (Audience > Contacts > Import CSV, adding them to the segment). Only import people who agreed to get this.
6. **Mailing address:** every email needs a physical address. The send script defaults to "Conversations with Ami, c/o Better Ledgers Inc., 3611 14th Ave Suite 371, Brooklyn, NY 11218"; override with `POSTAL_ADDRESS` if it changes.

**Sending an issue** (from this folder; set the variables in your own shell, never commit them)
```
node scripts/send-newsletter.mjs content/newsletter/issue-11.json            # dry run, saves a preview
node scripts/send-newsletter.mjs content/newsletter/issue-11.json --test you@example.com
node scripts/send-newsletter.mjs content/newsletter/issue-11.json --send     # sends to the whole segment
```
Variables: `RESEND_API_KEY`, `RESEND_SEGMENT_ID`, `POSTAL_ADDRESS`, optional `RESEND_FROM`
(default `Still Building with Ami <newsletter@conversationswithami.com>`) and `RESEND_REPLY_TO`.

**Local testing:** put `RESEND_API_KEY` and `RESEND_SEGMENT_ID` in a `.dev.vars` file (gitignored).

---

## Newsletter Studio (/studio): private place to write and send issues

A login-protected page for writing Still Building issues: paste notes, Claude structures them
into the three sections with takeaways (using only what you wrote), you edit, preview, save,
send yourself a test, then send to all subscribers. Issues are stored in the D1 database (`DB`).

Files: `studio.html`, `functions/api/studio/*` (issues, preview, structure, send), and
`functions/_lib/studio-*.js`. Voice rules for Claude live in `functions/api/studio/structure.js`.

**Login: Cloudflare Access (email one-time code).** Every studio API call is also checked in code
(`functions/_lib/studio-auth.js`): it verifies Cloudflare's signed token and refuses everything
if Access isn't set up. So the studio does nothing until you finish these steps.

1. Cloudflare dashboard (the Conversationswithami@gmail.com account) > **Zero Trust**. If it asks you to
   pick a team name and plan, choose the **Free** plan. Note the team domain
   (`yourteam.cloudflareaccess.com`).
2. Zero Trust > Access > Applications > **Add an application** > Self-hosted.
   - Public hostnames (add each): `www.conversationswithami.com` path `studio*`;
     `www.conversationswithami.com` path `api/studio*`;
     `conversations-with-ami.pages.dev` path `studio*` and path `api/studio*`.
   - Policy: **Allow**, include **Emails** = your email address(es). Login method: One-time PIN.
3. Open the application's settings and copy its **Application Audience (AUD) Tag**.
4. Pages project > Settings > Environment variables (Production), add:
   `ACCESS_TEAM_DOMAIN` = `yourteam.cloudflareaccess.com` (no https://),
   `ACCESS_AUD` = the AUD tag,
   `STUDIO_ALLOWED_EMAILS` = your email (optional but recommended; comma-separate for more people).
   Already set from earlier: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_SEGMENT_ID`. Redeploy.
5. Visit `/studio`: you should get a Cloudflare email-code prompt, then the studio.

**Thumbnail Studio (`/studio-thumbnails`):** a second private page, linked from the Studio header. Fill in (or pick a published episode), upload the guest photo, and download the wide (1280x720) and square (1080x1080) thumbnails. It runs entirely in the browser (`studio-thumbnails.html`, drawing on a canvas, no server code or secrets), and the same Cloudflare Access rule `studio*` protects it. A transparent PNG puts the guest on the circle beside Ami; any other photo is cropped into a round frame; with no photo a silhouette marks the spot. The colorways match the five kinds of episode (see the brand kit thumbnail template).

**Sending safety:** the studio only sends the *saved* draft, a real send needs you to type
`SEND <number>` and confirm a pop-up, sent issues lock, and only Resend Broadcasts are used (so
every email carries a working unsubscribe link).

**Local testing:** `STUDIO_DEV_BYPASS=1` in `.dev.vars` skips the login on localhost only (ignored on the live site).

---

## Newsletter issues and the archive

- **Issues 1 to 10** were migrated from Kit in November 2026 and live as files in `content/newsletter/issue-NN.json`
  (bundled by `functions/_lib/legacy-issues.js`). They are published and read-only. Their original titles are kept.
- **New issues** are written in the studio (`/studio`), saved as drafts in D1, and become public when sent.
- **Public pages:** each issue is at `/newsletter/issue-NN` (`functions/newsletter/[slug].js`); the archive page and the
  homepage read `/api/issues`; every issue is in `/sitemap.xml`.
- **Signup (double opt-in):** every `.signup-form-slot` is filled by `js/newsletter-embed.js`. `/api/subscribe` emails a
  signed confirmation link (48 hours); `/api/confirm` shows a "Confirm my subscription" button and, on press, adds the
  contact to the Resend segment. Rate limits (per address and per visitor) are stored in the D1 table `subscribe_attempts`.
- **Kit is no longer used** by the site: the old Kit feed function was removed and the signup box is ours. You can cancel
  Kit when you're ready, and delete the `KIT_API_KEY` secret from the Pages settings.
- **Section order** in every issue (and the default for new ones): From the conversation, What I'm thinking, From the build.
