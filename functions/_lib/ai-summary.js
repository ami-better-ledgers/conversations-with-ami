// Auto-generates the curated episode write-up (summary, guest bio, the
// "problem this solves" framing) using the Claude API, so new episodes
// get a rich /episodes/<slug> page with zero manual work.
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
const PILLARS = ["Sales", "Hiring & Leadership", "Tax & Legal", "Marketing", "AI/Tech"];

export async function getOrGenerateSummary(env, feedItem) {
  if (!env.ANTHROPIC_API_KEY) return null;

  const cacheKey = await buildCacheKey(feedItem);

  if (env.EPISODE_AI_CACHE) {
    const cached = await env.EPISODE_AI_CACHE.get(cacheKey, "json");
    if (cached) return cached;
  }

  const generated = await callClaude(env.ANTHROPIC_API_KEY, feedItem);
  if (!generated) return null;

  if (env.EPISODE_AI_CACHE) {
    // No expirationTtl: this is keyed off a hash of the episode's own
    // content (see buildCacheKey), so it naturally invalidates itself
    // if the show notes ever change — no need to expire it on a timer.
    await env.EPISODE_AI_CACHE.put(cacheKey, JSON.stringify(generated));
  }

  return generated;
}

async function buildCacheKey(feedItem) {
  const raw = `${feedItem.episode}::${feedItem.title}::${feedItem.content || feedItem.description || ""}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  return `ep-${feedItem.episode || "x"}-${hash}`;
}

async function callClaude(apiKey, feedItem) {
  const prompt = buildPrompt(feedItem);

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
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    return null;
  }

  if (!res.ok) return null;

  const data = await res.json();
  const text = (data.content || []).map((block) => block.text || "").join("");
  return parseJsonSafely(text);
}

function buildPrompt(feedItem) {
  return `You are writing the content for a podcast episode landing page. The show is "Conversations with Ami" — interviews with small-business owners and experts about the expensive mistakes entrepreneurs make and how to avoid them.

Episode title (as published): ${feedItem.title}

Full show notes (HTML, may include guest links):
${feedItem.content || feedItem.description || "(no show notes provided)"}

Return ONLY a single valid JSON object (no markdown fences, no commentary) with exactly these fields:

{
  "pageTitle": "An SEO-friendly page title, phrased as a real question or claim a business owner would search for. Under 70 characters.",
  "guestName": "The guest's full name, extracted from the title or show notes.",
  "guestCompany": "The guest's company name, or empty string if unclear.",
  "guestRole": "The guest's role/title (e.g. 'CPA & Founder'), or empty string if unclear.",
  "guestBio": "One sentence, third person, describing who the guest is and what they help people with.",
  "companyBio": "One sentence, third person, describing what the guest's company does. Empty string if unclear.",
  "pillars": "An array of one or two values from exactly this list: ${PILLARS.join(", ")} — whichever best fit this episode's topic. Most episodes only need one.",
  "subjects": "An array of 1 to 3 short, specific subject tags for what this episode is actually about (e.g. 'Real Estate', 'Cost Segregation', 'Cold Outreach', 'Hiring', 'AI Tools') — more specific than the broad pillar above.",
  "problemSolved": "The specific problem this episode solves, phrased the way a business owner would actually type it into Google.",
  "summary": "150 to 300 words, plain text (no markdown), written in third person, summarizing the episode's core lesson for someone deciding whether to listen.",
  "guestLinks": [{"label": "LinkedIn", "url": "https://..."}]
}

For guestLinks, extract only real links found in the show notes above (LinkedIn, website, etc. — skip email addresses and blog post links). If none are found, use an empty array. If any field can't be determined, use an empty string (or empty array for guestLinks) rather than guessing.`;
}

function parseJsonSafely(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (!parsed.summary || !parsed.pageTitle) return null;
    parsed.pillars = Array.isArray(parsed.pillars) ? parsed.pillars.filter((p) => PILLARS.includes(p)) : [];
    parsed.subjects = Array.isArray(parsed.subjects) ? parsed.subjects.slice(0, 3) : [];
    parsed.guestLinks = Array.isArray(parsed.guestLinks) ? parsed.guestLinks : [];
    return parsed;
  } catch (err) {
    return null;
  }
}
