// Auto-generates the curated episode write-up (summary, guest bio, the
// "problem this solves" framing) using the Claude API, so new episodes
// get a rich /episodes/<slug> page with zero manual work.
//
// Before writing the guest/company bios, this also does a best-effort
// fetch of the guest's LinkedIn profile and company website (pulled
// from the show notes' own links) so the bios are grounded in real
// text rather than guessed from the show notes alone. This can fail
// silently for a private profile or a site that blocks bots — the
// bios just fall back to show-notes-only in that case.
//
// SET THIS UP IN CLOUDFLARE (both are optional — without them, episode
// pages just fall back to the plain RSS-only version, same as before):
//
//   1. Pages project > Settings > Environment variables
//      Name:  ANTHROPIC_API_KEY
//      Value: an API key from https://console.anthropic.com
//      Add it to both "Production" and "Preview", then redeploy.
//
//   2. Pages project > Settings > Functions > KV namespace bindings
//      Create a KV namespace (e.g. "episode-ai-cache") and bind it as
//      EPISODE_AI_CACHE. This is what makes generation happen ONCE per
//      episode instead of on every page view — without it, every
//      request with no cache would call the API again.

const MODEL = "claude-sonnet-5";
// The show's own 5 pillars (from the About page's "What you'll
// actually get from an episode" section) — what KIND of value an
// episode provides, not what business topic it's about. Business
// topic is what "subjects" is for (freeform, unrestricted).
const PILLARS = ["Peer Story", "Nuanced Literacy", "Future Planning", "What Not to Do", "Core Skills"];

const FAILURE_MARKER = "__failed";

export async function getOrGenerateSummary(env, feedItem) {
  if (!env.ANTHROPIC_API_KEY) return null;

  const cacheKey = await buildCacheKey(feedItem);

  if (env.EPISODE_AI_CACHE) {
    const cached = await env.EPISODE_AI_CACHE.get(cacheKey, "json");
    if (cached) return cached[FAILURE_MARKER] ? null : cached;
  }

  const generated = await callClaude(env.ANTHROPIC_API_KEY, feedItem);

  if (env.EPISODE_AI_CACHE) {
    if (generated) {
      // No expirationTtl: this is keyed off a hash of the episode's own
      // content (see buildCacheKey), so it naturally invalidates itself
      // if the show notes ever change — no need to expire it on a timer.
      await env.EPISODE_AI_CACHE.put(cacheKey, JSON.stringify(generated));
    } else {
      // Cache a genuine failure too, but briefly — without this, a
      // response that keeps failing validation calls the live API on
      // EVERY single page view of /api/episodes (this is exactly what
      // made the podcast list page slow once, for two episodes whose
      // topic didn't fit any fixed pillar). An hour is enough to stop
      // that, while still retrying periodically rather than freezing
      // the failure forever.
      await env.EPISODE_AI_CACHE.put(cacheKey, JSON.stringify({ [FAILURE_MARKER]: true }), { expirationTtl: 3600 });
    }
  }

  return generated;
}

// Bump this whenever the schema/validation changes in a way that
// should force every episode to regenerate — e.g. when a previously
// "successful" cached response (passed validation, but with a field
// like pillars silently empty) needs to be thrown out and retried
// under stricter rules. Cheaper than hunting down individual KV keys.
const CACHE_VERSION = "v4";

async function buildCacheKey(feedItem) {
  const raw = `${feedItem.episode}::${feedItem.title}::${feedItem.content || feedItem.description || ""}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  return `${CACHE_VERSION}-ep-${feedItem.episode || "x"}-${hash}`;
}

async function callClaude(apiKey, feedItem) {
  const links = extractCandidateLinks(feedItem.content || "");
  const [linkedInSnippet, websiteSnippet] = await Promise.all([
    links.linkedin ? fetchPageSnippet(links.linkedin) : Promise.resolve(""),
    links.website ? fetchPageSnippet(links.website) : Promise.resolve(""),
  ]);

  const prompt = buildPrompt(feedItem, { linkedInSnippet, websiteSnippet });

  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        // 1200 was too tight for some episodes — a longer set of
        // guest/company bios or guestLinks could push the response
        // past the cap mid-way through the JSON, cutting it off before
        // the closing brace. Since the cache key is a hash of the
        // episode's own content, a truncated episode fails the exact
        // same way every single retry, forever — not something a
        // retry can ever fix. 2400 leaves real headroom.
        max_tokens: 2400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    console.error(`[ai-summary] episode ${feedItem.episode}: fetch to Anthropic threw — ${err}`);
    return null;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[ai-summary] episode ${feedItem.episode}: Anthropic returned ${res.status} — ${body.slice(0, 500)}`);
    return null;
  }

  const data = await res.json();
  const text = (data.content || []).map((block) => block.text || "").join("");
  const parsed = parseJsonSafely(text);
  if (!parsed) {
    console.error(`[ai-summary] episode ${feedItem.episode}: response failed validation — stop_reason=${data.stop_reason}, length=${text.length}, raw text: ${text.slice(0, 1500)}`);
  }
  return parsed;
}

function buildPrompt(feedItem, { linkedInSnippet, websiteSnippet }) {
  return `You are writing the content for a podcast episode landing page. The show is "Conversations with Ami" — interviews with small-business owners and experts about the expensive mistakes entrepreneurs make and how to avoid them.

Episode title (as published): ${feedItem.title}

Full show notes (HTML, may include guest links):
${feedItem.content || feedItem.description || "(no show notes provided)"}
${linkedInSnippet ? `\nText pulled from the guest's public LinkedIn profile (use this to make guestBio more accurate — it's a real headline/summary, not a guess):\n${linkedInSnippet}\n` : ""}
${websiteSnippet ? `\nText pulled from the guest's company website (use this to make companyBio more accurate):\n${websiteSnippet}\n` : ""}

Return ONLY a single valid JSON object (no markdown fences, no commentary) with exactly these fields:

{
  "pageTitle": "An SEO-friendly page title, phrased as a real question or claim a business owner would search for. Under 70 characters.",
  "guestName": "The guest's full name, extracted from the title or show notes.",
  "guestCompany": "The guest's company name, or empty string if unclear.",
  "guestRole": "The guest's role/title (e.g. 'CPA & Founder'), or empty string if unclear.",
  "guestBio": "One sentence, third person, describing who the guest is and what they help people with. Ground this in the LinkedIn text above when it's provided, rather than only the show notes.",
  "companyBio": "One sentence, third person, describing what the guest's company does. Ground this in the company website text above when it's provided. Empty string if unclear.",
  "pillars": "An array of one or two values from exactly this list: ${PILLARS.join(", ")} — whichever kind(s) of value this episode provides. Meanings: 'Peer Story' = proof you're not crazy for finding this hard, from someone who's actually in it. 'Nuanced Literacy' = understanding a service or system before you're in a position to misuse it or get burned by it. 'Future Planning' = not what to do today, but how to think about a decision once you actually reach that stage. 'What Not to Do' = a specific, expensive mistake people make, straight from someone who watches others make it. 'Core Skills' = beginner-level competency in something every entrepreneur eventually has to do themselves (sell, manage, hire, read their own numbers). Most episodes fit one or two of these.",
  "subjects": "An array of 1 to 3 short, specific tags for what business TOPIC this episode is actually about (e.g. 'Real Estate', 'Cost Segregation', 'Cold Outreach', 'Hiring', 'Banking', 'Insurance', 'AI Tools') — there is no fixed list for this field, use whatever specific topic words fit best.",
  "problemSolved": "The specific problem this episode solves, phrased the way a business owner would actually type it into Google.",
  "summary": "150 to 300 words total, written as exactly 2 short paragraphs separated by a blank line (\\n\\n) so it's easy to scan — not one dense block. Plain text, no markdown. Third person, summarizing the episode's core lesson for someone deciding whether to listen.",
  "guestLinks": [{"label": "LinkedIn", "url": "https://..."}]
}

For guestLinks, extract only real links found in the show notes above (LinkedIn, website, etc. — skip email addresses and blog post links). If none are found, use an empty array. If any field can't be determined, use an empty string (or empty array for guestLinks) rather than guessing.`;
}

// Pulls out a likely LinkedIn URL and a likely company-website URL from
// the show notes HTML, so we can fetch a little real context about the
// guest/company before asking Claude to write their bios — rather than
// having Claude guess from the show notes text alone.
function extractCandidateLinks(html) {
  const urls = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((u) => u.startsWith("http"));
  const linkedin = urls.find((u) => u.includes("linkedin.com"));
  const website = urls.find((u) => {
    if (u.includes("linkedin.com")) return false;
    try {
      return new URL(u).pathname.replace(/\/$/, "") === "";
    } catch (err) {
      return false;
    }
  });
  return { linkedin, website };
}

// Best-effort fetch of a public page's title/description, used only as
// extra grounding for the bios above — never required. LinkedIn profile
// pages expose a real headline/summary via og:description for logged-out
// visitors (the same text used for link previews); this can fail for a
// private profile or a site that blocks bots, in which case the bio
// falls back to the show notes alone, same as before this feature.
async function fetchPageSnippet(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ConversationsWithAmiBot/1.0; +https://www.conversationswithami.com)" },
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    if (!res.ok) return "";
    const html = await res.text();
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const title = html.match(/<title>([^<]+)<\/title>/i);
    const snippet = (ogDesc && ogDesc[1]) || (metaDesc && metaDesc[1]) || (title && title[1]) || "";
    return decodeHtmlEntities(snippet).slice(0, 500);
  } catch (err) {
    return "";
  }
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&hellip;/g, "…");
}

function parseJsonSafely(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (!parsed.summary || !parsed.pageTitle) return null;
    // Completeness is judged by subjects, not pillars: subjects are
    // freeform, so a real episode should always produce at least one
    // regardless of topic. Pillars are a small FIXED taxonomy (5
    // categories) — a genuine episode can legitimately match none of
    // them (e.g. a banking or insurance episode), and that's fine, not
    // a sign the response is incomplete. Treating an empty pillars
    // array as "incomplete" was the bug: it made those episodes retry
    // the live API on every single page view forever, since their
    // topic will never match the fixed list no matter how many times
    // we ask.
    if (!Array.isArray(parsed.subjects) || !parsed.subjects.length) return null;
    parsed.pillars = Array.isArray(parsed.pillars) ? parsed.pillars.filter((p) => PILLARS.includes(p)) : [];
    parsed.subjects = parsed.subjects.slice(0, 3);
    parsed.guestLinks = Array.isArray(parsed.guestLinks) ? parsed.guestLinks : [];
    return parsed;
  } catch (err) {
    return null;
  }
}
