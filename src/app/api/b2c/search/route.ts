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
  ai_message: string | null;
  similar_products: string[];
  is_seller: boolean;
}

interface RedditPost {
  author: string;
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  subreddit: string;
  created_utc: number;
  score: number;
  is_self: boolean;
}

interface RedditSearchResponse {
  data?: {
    children?: Array<{ data: RedditPost }>;
  };
}

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => ({})) as {
    description?: string;
    keywords?: string[];
    product_context?: string;
    location?: string;
    long_tail?: string[];
  };

  const {
    description = "",
    keywords = [],
    product_context = "",
    location = "",
    long_tail = [],
  } = body;

  if (!description.trim()) return errorResponse("Search description is required", 400);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });

  // Build search terms
  const kw = keywords.length > 0
    ? keywords.slice(0, 5).join(" ")
    : description.trim().split(/\s+/).slice(0, 6).join(" ");
  const loc = location.trim();

  // Reddit search queries — varied angles to find real consumer posts
  const baseQueries = [
    `${kw}${loc ? " " + loc : ""} recommend`,
    `${kw}${loc ? " " + loc : ""} looking for`,
    `${kw}${loc ? " " + loc : ""} how much`,
    `${kw}${loc ? " " + loc : ""} best`,
    `${kw}${loc ? " " + loc : ""} need help`,
  ];

  const ltQueries = (long_tail as string[]).slice(0, 3);
  const allQueries = [...baseQueries, ...ltQueries].slice(0, 7);

  // Hit Reddit's JSON search API directly — no key needed, returns structured post data
  const posts: RedditPost[] = [];

  const redditResults = await Promise.allSettled(
    allQueries.map(async (q) => {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=10&type=link`;
      const resp = await fetch(url, {
        headers: { "User-Agent": "SignafyAI/1.0 consumer-research-bot" },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) return [];
      const data = await resp.json() as RedditSearchResponse;
      return (data.data?.children ?? [])
        .map((c) => c.data)
        .filter((p) => p.author !== "[deleted]" && p.author !== "AutoModerator" && (p.selftext.length > 20 || p.title.length > 20));
    })
  );

  for (const result of redditResults) {
    if (result.status === "fulfilled") {
      posts.push(...result.value);
    }
  }

  // Also try Firecrawl for non-Reddit platforms if key is set
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  const fcTexts: Array<{ url: string; content: string; title: string }> = [];

  if (firecrawlKey && posts.length < 10) {
    const fcQueries = [
      `${kw}${loc ? " " + loc : ""} quora OR twitter`,
      `${kw}${loc ? " " + loc : ""} forum review`,
    ];
    const fcResults = await Promise.allSettled(
      fcQueries.map(async (q) => {
        const resp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${firecrawlKey}` },
          body: JSON.stringify({ query: q, limit: 5, scrapeOptions: { formats: ["markdown"], onlyMainContent: true } }),
          signal: AbortSignal.timeout(8000),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as { data?: Array<{ url: string; markdown?: string; metadata?: { title?: string } }> };
        return (data.data ?? [])
          .filter((r) => (r.markdown ?? "").length > 50)
          .map((r) => ({ url: r.url ?? "", content: (r.markdown ?? "").slice(0, 1500), title: r.metadata?.title ?? "" }));
      })
    );
    for (const r of fcResults) {
      if (r.status === "fulfilled") fcTexts.push(...r.value);
    }
  }

  // If we have Reddit posts, build profiles directly from structured data
  // then enrich with OpenAI scoring — much faster than scraping
  const ts = Date.now();

  if (posts.length > 0) {
    // Deduplicate by author
    const seen = new Set<string>();
    const uniquePosts = posts.filter((p) => {
      if (seen.has(p.author)) return false;
      seen.add(p.author);
      return true;
    });

    // Score and extract consumer signals via OpenAI
    const postSummaries = uniquePosts.slice(0, 30).map((p, i) =>
      `[${i}] u/${p.author} in r/${p.subreddit}:\nTitle: ${p.title}\n${p.selftext ? "Body: " + p.selftext.slice(0, 300) : ""}`
    ).join("\n\n");

    let enriched: Array<{
      index: number;
      interest_score: number;
      purchase_intent: "browsing" | "researching" | "ready_to_buy" | null;
      consumer_signals: string[];
      is_seller: boolean;
      similar_products: string[];
      keywords_matched: string[];
    }> = [];

    try {
      const aiResp = await openai.chat.completions.create({
        model: process.env.AI_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Score Reddit posts for consumer purchase intent.
For each post: is this a real individual SEEKING to buy/hire/find "${description}"?
EXCLUDE anyone promoting/selling services.
Return scores and signals for each post.`,
          },
          {
            role: "user",
            content: `Product/service: "${description}" (context: ${product_context || "not specified"})
Location: ${loc || "any"}

Posts to score:
${postSummaries}

For each post return:
{ "index": N, "interest_score": 0-100, "purchase_intent": "ready_to_buy|researching|browsing|null", "consumer_signals": [], "is_seller": false, "keywords_matched": [], "similar_products": [] }

Return JSON: { "posts": [...] }`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.2,
      });

      const aiData = JSON.parse(aiResp.choices[0]?.message?.content ?? "{}") as {
        posts?: typeof enriched;
      };
      enriched = aiData.posts ?? [];
    } catch {
      // If AI fails, assign default scores so posts still appear
      enriched = uniquePosts.slice(0, 30).map((_, i) => ({
        index: i,
        interest_score: 55,
        purchase_intent: "browsing" as const,
        consumer_signals: [],
        is_seller: false,
        keywords_matched: [],
        similar_products: [],
      }));
    }

    const enrichMap = new Map(enriched.map((e) => [e.index, e]));

    const profiles: SocialProfile[] = uniquePosts
      .slice(0, 30)
      .map((p, i): SocialProfile | null => {
        const e = enrichMap.get(i);
        if (e?.is_seller) return null;
        const score = e?.interest_score ?? 50;
        const postBody = p.selftext || p.title;
        return {
          id: `b2c-${ts}-${i}`,
          platform: "reddit",
          username: p.author,
          display_name: null,
          first_name: null,
          last_name: null,
          profile_url: `https://reddit.com/user/${p.author}`,
          post_text: (p.title + (p.selftext ? " — " + p.selftext : "")).slice(0, 300),
          post_url: `https://reddit.com${p.permalink}`,
          post_date: new Date(p.created_utc * 1000).toISOString(),
          keywords_matched: e?.keywords_matched ?? [],
          interest_score: score,
          purchase_intent: e?.purchase_intent ?? null,
          consumer_signals: e?.consumer_signals ?? [],
          is_seller: false,
          shopping_signals: {
            mentions_buying: /buy|hire|purchase|cost|price|quote/i.test(postBody),
            platform_mentions: [],
            frequency: null,
          },
          contact: {
            dm_url: `https://www.reddit.com/message/compose?to=${p.author}`,
            type: "DM",
          },
          ai_message: null,
          similar_products: e?.similar_products ?? [],
        };
      })
      .filter((p): p is SocialProfile => p !== null && p.interest_score >= 30)
      .sort((a, b) => b.interest_score - a.interest_score);

    return jsonResponse({ profiles, total: profiles.length, demo: false });
  }

  // Fallback: use Firecrawl text content if Reddit returned nothing
  if (fcTexts.length > 0) {
    try {
      const aiResp = await openai.chat.completions.create({
        model: process.env.AI_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Extract consumer lead profiles from web content. Find real individuals seeking to buy/hire. Skip sellers.`,
          },
          {
            role: "user",
            content: `Find consumers seeking: "${description}"\n\nContent:\n${fcTexts.map((r, i) => `[${i}] ${r.url}\n${r.title}\n${r.content}`).join("\n---\n")}\n\nReturn JSON: { "profiles": [{ "platform": "web", "username": "...", "post_text": "...", "interest_score": 0-100, "purchase_intent": null, "consumer_signals": [], "is_seller": false, "contact": { "dm_url": null, "type": "View" } }] }`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.2,
      });
      const d = JSON.parse(aiResp.choices[0]?.message?.content ?? "{}") as { profiles?: Array<Partial<SocialProfile>> };
      const profiles: SocialProfile[] = (d.profiles ?? [])
        .filter((p) => !p.is_seller && p.username && p.post_text)
        .map((p, i): SocialProfile => ({
          id: `b2c-fc-${ts}-${i}`,
          platform: p.platform ?? "web",
          username: (p.username ?? `user_${i}`).replace(/^@/, ""),
          display_name: p.display_name ?? null,
          first_name: null, last_name: null,
          profile_url: p.profile_url ?? null,
          post_text: (p.post_text ?? "").slice(0, 300),
          post_url: p.post_url ?? null,
          post_date: null,
          keywords_matched: [],
          interest_score: p.interest_score ?? 50,
          purchase_intent: p.purchase_intent ?? null,
          consumer_signals: p.consumer_signals ?? [],
          is_seller: false,
          shopping_signals: { mentions_buying: false, platform_mentions: [], frequency: null },
          contact: { dm_url: p.contact?.dm_url ?? null, type: p.contact?.type ?? "View" },
          ai_message: null,
          similar_products: [],
        }));
      if (profiles.length > 0) return jsonResponse({ profiles, total: profiles.length, demo: false });
    } catch { /* fall through to demo */ }
  }

  // Last resort: demo profiles
  return jsonResponse({
    profiles: buildDemoProfiles(description, product_context),
    total: 3,
    demo: true,
  });
}

function buildDemoProfiles(description: string, _ctx: string): SocialProfile[] {
  const ts = Date.now();
  const snippet = description.slice(0, 50);
  return [
    {
      id: `demo-${ts}-1`, platform: "reddit", username: "homefix_seeker",
      display_name: "Sarah M.", first_name: "Sarah", last_name: "M.",
      profile_url: "https://reddit.com/user/homefix_seeker",
      post_text: `Just got quoted $3,200 for "${snippet}". Anyone know a reliable place? Called 2 places already — really frustrated.`,
      post_url: null, post_date: new Date(Date.now() - 7200000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 4),
      interest_score: 92, purchase_intent: "ready_to_buy",
      consumer_signals: ["requested recommendation", "mentioned getting quotes", "expressed urgency"],
      is_seller: false,
      shopping_signals: { mentions_buying: true, platform_mentions: [], frequency: "occasional" },
      contact: { dm_url: "https://reddit.com/message/compose?to=homefix_seeker", type: "DM" },
      ai_message: null, similar_products: ["free estimate", "consultation"],
    },
    {
      id: `demo-${ts}-2`, platform: "reddit", username: "comparing_options_now",
      display_name: null, first_name: null, last_name: null,
      profile_url: "https://reddit.com/user/comparing_options_now",
      post_text: `Comparing options for ${snippet}. Prices all over the place. Anyone have firsthand experience? Making a decision this week.`,
      post_url: null, post_date: new Date(Date.now() - 14400000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 3),
      interest_score: 85, purchase_intent: "researching",
      consumer_signals: ["comparing prices", "mentioned decision timeline"],
      is_seller: false,
      shopping_signals: { mentions_buying: true, platform_mentions: [], frequency: "occasional" },
      contact: { dm_url: "https://reddit.com/message/compose?to=comparing_options_now", type: "DM" },
      ai_message: null, similar_products: [],
    },
    {
      id: `demo-${ts}-3`, platform: "reddit", username: "first_timer_q",
      display_name: null, first_name: null, last_name: null,
      profile_url: "https://reddit.com/user/first_timer_q",
      post_text: `Never dealt with ${snippet} before. What's a fair price? Any red flags when choosing someone?`,
      post_url: null, post_date: new Date(Date.now() - 86400000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 3),
      interest_score: 68, purchase_intent: "browsing",
      consumer_signals: ["first-time buyer", "asked for price guidance"],
      is_seller: false,
      shopping_signals: { mentions_buying: false, platform_mentions: [], frequency: null },
      contact: { dm_url: "https://reddit.com/message/compose?to=first_timer_q", type: "DM" },
      ai_message: null, similar_products: [],
    },
  ];
}
