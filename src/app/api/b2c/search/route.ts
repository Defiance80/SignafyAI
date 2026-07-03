import { requireOrgContext } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";

export const maxDuration = 60;

export interface SocialProfile {
  id: string;
  platform: string;
  username: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_url: string | null;
  post_text: string;
  post_url: string | null;
  post_date: string | null;
  keywords_matched: string[];
  interest_score: number;
  purchase_intent: "browsing" | "researching" | "ready_to_buy" | null;
  consumer_signals: string[];
  shopping_signals: {
    mentions_buying: boolean;
    platform_mentions: string[];
    frequency: "occasional" | "frequent" | null;
  };
  contact: {
    dm_url: string | null;
    type: "DM" | "Message" | "Inbox" | "Connect" | "View";
  };
  ai_message: null;
  similar_products: string[];
  is_seller: boolean;
}

// ─── Raw result types ────────────────────────────────────────────────────────

interface RedditPost {
  author: string;
  title: string;
  selftext: string;
  permalink: string;
  subreddit: string;
  created_utc: number;
}

interface ScrapedResult {
  platform: string;
  url: string;
  title: string;
  content: string;
}

// ─── Platform search helpers ─────────────────────────────────────────────────

async function getRedditToken(clientId: string, secret: string): Promise<string | null> {
  try {
    const resp = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${clientId}:${secret}`).toString("base64"),
        "User-Agent": "SignafyAI/1.0 b2c-research",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch { return null; }
}

async function searchReddit(queries: string[], token?: string): Promise<RedditPost[]> {
  const baseUrl = token ? "https://oauth.reddit.com" : "https://www.reddit.com";
  const headers: Record<string, string> = { "User-Agent": "SignafyAI/1.0 b2c-research" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const results = await Promise.allSettled(
    queries.map(async (q) => {
      const url = `${baseUrl}/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=10&type=link`;
      const resp = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
      if (!resp.ok) return [];
      const data = await resp.json() as { data?: { children?: Array<{ data: RedditPost }> } };
      return (data.data?.children ?? [])
        .map((c) => c.data)
        .filter((p) => p.author !== "[deleted]" && p.author !== "AutoModerator");
    })
  );
  return results.flatMap((r) => r.status === "fulfilled" ? r.value : []);
}

async function firecrawlSearch(query: string, platform: string, apiKey: string): Promise<ScrapedResult[]> {
  const resp = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    // No scrapeOptions — plain search returns snippets without scraping each page,
    // which is faster and avoids failures on login-walled social platforms
    body: JSON.stringify({ query, limit: 5 }),
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) return [];
  const data = await resp.json() as {
    data?: Array<{ url: string; markdown?: string; description?: string; content?: string; metadata?: { title?: string; description?: string } }>;
  };
  return (data.data ?? [])
    .map((r) => {
      const text = r.markdown ?? r.content ?? r.description ?? r.metadata?.description ?? "";
      return { platform, url: r.url ?? "", title: r.metadata?.title ?? "", content: text.slice(0, 1500) };
    })
    .filter((r) => r.content.length > 20 || r.title.length > 10);
}

// ─── Main route ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => ({})) as {
    description?: string;
    platforms?: string[];
    keywords?: string[];
    product_context?: string;
    location?: string;
    long_tail?: string[];
  };

  const {
    description = "",
    platforms = ["reddit", "twitter", "linkedin", "instagram", "facebook", "tiktok", "youtube", "google"],
    keywords = [],
    product_context = "",
    location = "",
    long_tail = [],
  } = body;

  if (!description.trim()) return errorResponse("Search description is required", 400);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  const redditClientId = process.env.REDDIT_CLIENT_ID;
  const redditSecret = process.env.REDDIT_CLIENT_SECRET;

  // Get Reddit OAuth token — bypasses datacenter IP block on Vercel
  const redditToken = (redditClientId && redditSecret)
    ? await getRedditToken(redditClientId, redditSecret)
    : null;

  // ── Generate targeted search queries via AI ──────────────────────────────
  // Word-slicing the description produces garbage queries ("People interested in").
  // OpenAI extracts the actual intent and generates 5 sharp search strings.
  let searchQueries: string[] = [];
  try {
    const qGen = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Generate 5 short web search queries (under 8 words each) to find REAL PEOPLE who want to buy/hire/use: "${description}"${location ? ` in ${location}` : ""}.
Focus on purchase intent. No quotes, no site: operators, no fluff.
Return JSON: { "queries": ["query1", "query2", "query3", "query4", "query5"] }`,
      }],
      response_format: { type: "json_object" },
      max_tokens: 200,
      temperature: 0.7,
    });
    const parsed = JSON.parse(qGen.choices[0]?.message?.content ?? "{}") as { queries?: string[] };
    searchQueries = (parsed.queries ?? []).filter(Boolean).slice(0, 5);
  } catch { /* fall through to keyword fallback */ }

  // Fallback: strip stop words and build a clean keyword string
  if (searchQueries.length === 0) {
    const stopWords = new Set(["people", "who", "are", "is", "in", "the", "a", "an", "and", "or", "for", "to", "of", "want", "looking", "find", "interested"]);
    const cleanKw = (keywords.length > 0 ? keywords : description.trim().split(/\s+/))
      .filter((w) => !stopWords.has(w.toLowerCase()) && w.length > 2)
      .slice(0, 5)
      .join(" ");
    const loc = location.trim();
    searchQueries = [
      `${cleanKw}${loc ? " " + loc : ""} recommendation`,
      `${cleanKw}${loc ? " " + loc : ""} looking for`,
      `${cleanKw}${loc ? " " + loc : ""} best advice`,
      `${cleanKw}${loc ? " " + loc : ""} how much cost`,
      `${cleanKw}${loc ? " " + loc : ""} help needed`,
    ];
  }

  const ts = Date.now();
  const redditPosts: RedditPost[] = [];
  const scrapedResults: ScrapedResult[] = [];

  // ── Build all platform search tasks ────────────────────────────────────────

  const tasks: Promise<void>[] = [];

  // Reddit — OAuth if credentials set, else unauthenticated (may be blocked from datacenter)
  if (platforms.includes("reddit")) {
    tasks.push(
      searchReddit(searchQueries, redditToken ?? undefined)
        .then((posts) => { redditPosts.push(...posts); })
    );
  }

  // All other platforms via Firecrawl
  if (firecrawlKey) {
    const platformQueries: Array<{ query: string; platform: string }> = [];

    // Add each AI-generated query targeted at the most productive platforms
    for (const q of searchQueries) {
      if (platforms.includes("quora"))      platformQueries.push({ query: `${q} site:quora.com`, platform: "quora" });
      if (platforms.includes("yelp"))       platformQueries.push({ query: `${q} site:yelp.com`, platform: "yelp" });
      if (platforms.includes("craigslist")) platformQueries.push({ query: `${q} site:craigslist.org`, platform: "craigslist" });
      if (platforms.includes("google") || platforms.includes("web")) platformQueries.push({ query: q, platform: "web" });
      break; // one round of platform-targeted queries per AI query to stay within limits
    }
    // Additional queries for remaining platforms
    const baseQ = searchQueries[0] ?? description.slice(0, 60);
    if (platforms.includes("trustpilot")) platformQueries.push({ query: `${baseQ} site:trustpilot.com`, platform: "trustpilot" });
    if (platforms.includes("youtube"))    platformQueries.push({ query: `${baseQ} site:youtube.com`, platform: "youtube" });
    if (platforms.includes("twitter") || platforms.includes("x")) platformQueries.push({ query: `${baseQ} site:twitter.com`, platform: "twitter" });
    if (platforms.includes("facebook"))   platformQueries.push({ query: `${baseQ} site:facebook.com`, platform: "facebook" });
    if (platforms.includes("reddit") && !redditToken) platformQueries.push({ query: `${baseQ} site:reddit.com`, platform: "reddit" });
    // Always include broad web + Quora
    platformQueries.push({ query: searchQueries[1] ?? baseQ, platform: "web" });
    if (!platforms.includes("quora")) platformQueries.push({ query: `${baseQ} site:quora.com`, platform: "quora" });
    // Long-tail queries as broad web searches
    (long_tail as string[]).slice(0, 3).forEach((q) => {
      platformQueries.push({ query: q, platform: "web" });
    });

    tasks.push(
      Promise.allSettled(
        platformQueries.map(({ query, platform }) => firecrawlSearch(query, platform, firecrawlKey))
      ).then((results) => {
        for (const r of results) {
          if (r.status === "fulfilled") scrapedResults.push(...r.value);
        }
      })
    );
  }

  // Run Reddit + all Firecrawl searches simultaneously
  await Promise.allSettled(tasks);

  // ── Build Reddit profiles directly from structured data ───────────────────

  const profiles: SocialProfile[] = [];

  if (redditPosts.length > 0) {
    const seen = new Set<string>();
    const uniquePosts = redditPosts.filter((p) => {
      if (seen.has(p.author)) return false;
      seen.add(p.author);
      return true;
    }).slice(0, 25);

    // Quick AI scoring for Reddit posts
    try {
      const aiResp = await openai.chat.completions.create({
        model: process.env.AI_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Score Reddit posts for consumer purchase intent toward "${description}". Skip sellers/promoters. Return a score per post.`,
          },
          {
            role: "user",
            content: `Product/service: "${description}"${product_context ? ` (${product_context})` : ""}
Location: ${location || "any"}

Posts:
${uniquePosts.map((p, i) => `[${i}] u/${p.author} r/${p.subreddit}: ${p.title}${p.selftext ? " — " + p.selftext.slice(0, 200) : ""}`).join("\n")}

For each post: { "index": N, "interest_score": 0-100, "purchase_intent": "ready_to_buy|researching|browsing|null", "consumer_signals": [], "is_seller": false, "keywords_matched": [] }
Return JSON: { "posts": [...] }`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
        temperature: 0.1,
      });

      const scored = (JSON.parse(aiResp.choices[0]?.message?.content ?? "{}") as {
        posts?: Array<{ index: number; interest_score: number; purchase_intent: SocialProfile["purchase_intent"]; consumer_signals: string[]; is_seller: boolean; keywords_matched: string[] }>;
      }).posts ?? [];

      const scoreMap = new Map(scored.map((s) => [s.index, s]));

      for (let i = 0; i < uniquePosts.length; i++) {
        const p = uniquePosts[i];
        const s = scoreMap.get(i);
        if (s?.is_seller) continue;
        const score = s?.interest_score ?? 50;
        if (score < 25) continue;
        profiles.push({
          id: `b2c-reddit-${ts}-${i}`,
          platform: "reddit",
          username: p.author,
          display_name: null, first_name: null, last_name: null,
          profile_url: `https://reddit.com/user/${p.author}`,
          post_text: (p.title + (p.selftext ? " — " + p.selftext : "")).slice(0, 300),
          post_url: `https://reddit.com${p.permalink}`,
          post_date: new Date(p.created_utc * 1000).toISOString(),
          keywords_matched: s?.keywords_matched ?? [],
          interest_score: score,
          purchase_intent: s?.purchase_intent ?? null,
          consumer_signals: s?.consumer_signals ?? [],
          is_seller: false,
          shopping_signals: { mentions_buying: /buy|hire|purchase|cost|price|quote/i.test(p.title + p.selftext), platform_mentions: [], frequency: null },
          contact: { dm_url: `https://www.reddit.com/message/compose?to=${p.author}`, type: "DM" },
          ai_message: null,
          similar_products: [],
        });
      }
    } catch {
      // Fallback: add unscored Reddit posts
      for (let i = 0; i < uniquePosts.slice(0, 10).length; i++) {
        const p = uniquePosts[i];
        profiles.push({
          id: `b2c-reddit-${ts}-${i}`,
          platform: "reddit", username: p.author,
          display_name: null, first_name: null, last_name: null,
          profile_url: `https://reddit.com/user/${p.author}`,
          post_text: (p.title + (p.selftext ? " — " + p.selftext : "")).slice(0, 300),
          post_url: `https://reddit.com${p.permalink}`,
          post_date: new Date(p.created_utc * 1000).toISOString(),
          keywords_matched: [], interest_score: 55, purchase_intent: null,
          consumer_signals: [], is_seller: false,
          shopping_signals: { mentions_buying: false, platform_mentions: [], frequency: null },
          contact: { dm_url: `https://www.reddit.com/message/compose?to=${p.author}`, type: "DM" },
          ai_message: null, similar_products: [],
        });
      }
    }
  }

  // ── Extract profiles from scraped non-Reddit content ─────────────────────

  if (scrapedResults.length > 0) {
    try {
      const aiResp = await openai.chat.completions.create({
        model: process.env.AI_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Extract CONSUMER profiles from social content across Twitter, LinkedIn, Instagram, Facebook, TikTok, YouTube, Quora, and the web.
Find real individuals seeking to buy/hire/find "${description}". Skip sellers, businesses promoting themselves, and ads.`,
          },
          {
            role: "user",
            content: `Product/service: "${description}"${product_context ? ` (${product_context})` : ""}
Location: ${location || "any"}

Content from multiple platforms:
${scrapedResults.slice(0, 20).map((r, i) => `[${i}] Platform: ${r.platform}\nURL: ${r.url}\n${r.title}\n${r.content}`).join("\n\n---\n\n")}

For each real consumer found return:
{
  "platform": "${scrapedResults.map(r => r.platform).filter((v,i,a) => a.indexOf(v) === i).join("|")}",
  "username": "handle or name extracted from URL/content",
  "display_name": "shown name if available or null",
  "first_name": null, "last_name": null,
  "profile_url": "link to their profile or null",
  "post_text": "their exact words showing consumer need, max 280 chars",
  "post_url": "link to the specific post or null",
  "post_date": null,
  "interest_score": 0-100,
  "purchase_intent": "ready_to_buy|researching|browsing|null",
  "consumer_signals": ["e.g. asked for price", "requested recommendation"],
  "is_seller": false,
  "contact": { "dm_url": null, "type": "DM|Message|Connect|View" },
  "similar_products": []
}
Return JSON: { "profiles": [...] }`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 3000,
        temperature: 0.2,
      });

      const extracted = (JSON.parse(aiResp.choices[0]?.message?.content ?? "{}") as {
        profiles?: Array<Partial<SocialProfile>>;
      }).profiles ?? [];

      let idx = 0;
      for (const p of extracted) {
        if (p.is_seller || !p.username || !p.post_text) continue;
        if ((p.interest_score ?? 0) < 25) continue;
        profiles.push({
          id: `b2c-${p.platform ?? "web"}-${ts}-${idx++}`,
          platform: p.platform ?? "web",
          username: (p.username ?? "").replace(/^@/, ""),
          display_name: p.display_name ?? null,
          first_name: p.first_name ?? null,
          last_name: p.last_name ?? null,
          profile_url: p.profile_url ?? null,
          post_text: (p.post_text ?? "").slice(0, 300),
          post_url: p.post_url ?? null,
          post_date: p.post_date ?? null,
          keywords_matched: p.keywords_matched ?? [],
          interest_score: Math.min(100, Math.max(0, Math.round(p.interest_score ?? 50))),
          purchase_intent: p.purchase_intent ?? null,
          consumer_signals: p.consumer_signals ?? [],
          is_seller: false,
          shopping_signals: { mentions_buying: p.shopping_signals?.mentions_buying ?? false, platform_mentions: [], frequency: null },
          contact: {
            dm_url: p.contact?.dm_url ?? null,
            type: p.contact?.type ?? contactType(p.platform ?? "web"),
          },
          ai_message: null,
          similar_products: p.similar_products ?? [],
        });
      }
    } catch { /* no scraped profiles this run */ }
  }

  // ── Sort and return ───────────────────────────────────────────────────────

  if (profiles.length > 0) {
    profiles.sort((a, b) => b.interest_score - a.interest_score);
    return jsonResponse({ profiles, total: profiles.length, demo: false });
  }

  // Fallback demo
  return jsonResponse({
    profiles: buildDemoProfiles(description, product_context),
    total: 3,
    demo: true,
  });
}

function contactType(platform: string): SocialProfile["contact"]["type"] {
  switch (platform.toLowerCase()) {
    case "reddit": case "twitter": case "instagram": case "tiktok": return "DM";
    case "facebook": return "Message";
    case "linkedin": return "Connect";
    case "craigslist": return "Inbox";
    default: return "View";
  }
}

function buildDemoProfiles(description: string, _ctx: string): SocialProfile[] {
  const ts = Date.now();
  const snippet = description.slice(0, 50);
  return [
    {
      id: `demo-${ts}-1`, platform: "reddit", username: "homefix_seeker",
      display_name: "Sarah M.", first_name: "Sarah", last_name: "M.",
      profile_url: "https://reddit.com/user/homefix_seeker",
      post_text: `Just got quoted $3,200 for "${snippet}". Anyone know a reliable place? Called 2 places — really frustrated.`,
      post_url: null, post_date: new Date(Date.now() - 7200000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 4),
      interest_score: 92, purchase_intent: "ready_to_buy",
      consumer_signals: ["requested recommendation", "mentioned getting quotes", "expressed urgency"],
      is_seller: false,
      shopping_signals: { mentions_buying: true, platform_mentions: [], frequency: "occasional" },
      contact: { dm_url: "https://reddit.com/message/compose?to=homefix_seeker", type: "DM" },
      ai_message: null, similar_products: [],
    },
    {
      id: `demo-${ts}-2`, platform: "twitter", username: "comparing_options_now",
      display_name: null, first_name: null, last_name: null,
      profile_url: "https://twitter.com/comparing_options_now",
      post_text: `Comparing options for ${snippet}. Prices all over the place. Making a decision this week.`,
      post_url: null, post_date: new Date(Date.now() - 14400000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 3),
      interest_score: 85, purchase_intent: "researching",
      consumer_signals: ["comparing prices", "mentioned decision timeline"],
      is_seller: false,
      shopping_signals: { mentions_buying: true, platform_mentions: [], frequency: "occasional" },
      contact: { dm_url: "https://twitter.com/comparing_options_now", type: "DM" },
      ai_message: null, similar_products: [],
    },
    {
      id: `demo-${ts}-3`, platform: "quora", username: "first_timer_q",
      display_name: null, first_name: null, last_name: null,
      profile_url: null,
      post_text: `Never dealt with ${snippet} before. What's a fair price? Any red flags?`,
      post_url: null, post_date: new Date(Date.now() - 86400000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 3),
      interest_score: 68, purchase_intent: "browsing",
      consumer_signals: ["first-time buyer", "asked for price guidance"],
      is_seller: false,
      shopping_signals: { mentions_buying: false, platform_mentions: [], frequency: null },
      contact: { dm_url: null, type: "View" },
      ai_message: null, similar_products: [],
    },
  ];
}
