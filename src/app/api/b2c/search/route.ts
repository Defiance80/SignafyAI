import { requireOrgContext } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";

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
    platforms = ["reddit", "google"],
    keywords = [],
    product_context = "",
    location = "",
    long_tail = [],
  } = body;

  if (!description.trim()) return errorResponse("Search description is required", 400);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;

  // Step 1: AI generates 8 targeted consumer-intent search queries
  let searchQueries: Array<{ query: string; platform: string }> = [];

  try {
    const queryGenResp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You generate search queries that find REAL CONSUMER posts — people seeking to buy, hire, or find a product/service.
AVOID queries that find sellers, businesses promoting themselves, or service providers advertising.
Focus on question-style queries that surface buyers: "looking for", "anyone recommend", "how much does X cost", "need help with".`,
        },
        {
          role: "user",
          content: `Find CONSUMERS who want to buy/hire: "${description}"
Product/service context: ${product_context || "not specified"}
Location: ${location || "any"}
Keywords: ${keywords.join(", ") || "derive from description"}
Platforms available: ${platforms.join(", ")}

Generate exactly 8 search queries. Use platform site: operators where helpful (site:reddit.com, site:quora.com).
Vary the angle: questions, complaints, recommendation requests, price questions, comparison posts.

Return JSON: { "queries": [{ "query": string, "platform": string }] }`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.8,
    });

    const data = JSON.parse(queryGenResp.choices[0]?.message?.content ?? "{}") as {
      queries?: Array<{ query: string; platform: string }>;
    };
    searchQueries = (data.queries ?? []).slice(0, 8);
  } catch {
    // Fallback queries if AI fails
    const terms = description.split(" ").slice(0, 4).join(" ");
    searchQueries = [
      { query: `"looking for" ${terms} ${location} site:reddit.com`, platform: "reddit" },
      { query: `"anyone recommend" ${terms} ${location}`, platform: "google" },
      { query: `"need help" ${terms} ${location} site:reddit.com`, platform: "reddit" },
      { query: `"how much does" ${terms} cost ${location}`, platform: "google" },
      { query: `${terms} recommendation ${location} site:reddit.com`, platform: "reddit" },
      { query: `best ${terms} near me ${location}`, platform: "google" },
    ];
  }

  // Add user-supplied long-tail queries (max 4 extra)
  const ltQueries = (long_tail as string[])
    .slice(0, 4)
    .map((q) => ({ query: q, platform: "web" }));

  const allQueries = [...searchQueries, ...ltQueries].slice(0, 10);

  // Step 2: Firecrawl — 5 results per query, 8s timeout, use allSettled so one failure doesn't kill all
  const searchResults: Array<{ url: string; content: string; title: string }> = [];

  if (firecrawlKey && allQueries.length > 0) {
    const results = await Promise.allSettled(
      allQueries.map(async (q) => {
        const resp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${firecrawlKey}`,
          },
          body: JSON.stringify({
            query: q.query,
            limit: 5,
            scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as { data?: Array<{ url: string; markdown?: string; metadata?: { title?: string } }> };
        return (data.data ?? [])
          .filter((r) => r.markdown && r.markdown.length > 80)
          .map((r) => ({
            url: r.url ?? "",
            content: r.markdown!.slice(0, 3000),
            title: r.metadata?.title ?? "",
          }));
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        searchResults.push(...result.value);
      }
    }
  }

  if (searchResults.length === 0) {
    return jsonResponse({
      profiles: buildDemoProfiles(description, product_context),
      queries_used: allQueries.map((q) => q.query),
      total: 3,
      demo: true,
    });
  }

  // Step 3: AI extraction in one batch (up to 50 pages) — consumer-only, no sellers
  let profiles: SocialProfile[] = [];

  // Process in chunks of 10 pages at a time
  const chunks: typeof searchResults[] = [];
  for (let i = 0; i < searchResults.length; i += 10) {
    chunks.push(searchResults.slice(i, i + 10));
  }

  const extractionResults = await Promise.allSettled(
    chunks.map(async (chunk) => {
      const resp = await openai.chat.completions.create({
        model: process.env.AI_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Extract CONSUMER lead profiles from social content.

INCLUDE: real people asking questions, seeking recommendations, comparing options, mentioning they need something, frustrated with a current solution, asking about pricing.

EXCLUDE (mark is_seller=true or skip entirely):
- Anyone posting "we offer", "our services", "hire us", "contact us for", "DM for pricing"
- Business accounts or anyone promoting/advertising
- Generic news articles, blog posts with no individual poster
- Automated or bot posts

Only extract REAL individual users with genuine consumer need. Return as many distinct consumers as possible (aim for 5+ per chunk).`,
          },
          {
            role: "user",
            content: `Find consumers seeking: "${description}"
What's being sold: ${product_context || "not specified"}
Location: ${location || "any"}

Pages to analyze:
${chunk.map((r, i) => `[${i + 1}] ${r.url}\n${r.title}\n${r.content}`).join("\n\n---\n\n")}

For each CONSUMER found, return:
{
  "platform": "reddit|twitter|youtube|google|yelp|web|tiktok|instagram|facebook|linkedin",
  "username": "handle (no @ prefix)",
  "display_name": "shown display name or null",
  "first_name": "only if explicitly visible in their post/profile, else null",
  "last_name": "only if explicitly visible, else null",
  "profile_url": "direct URL to their profile",
  "post_text": "exact quote of their post showing need, max 280 chars",
  "post_url": "URL to this specific post",
  "post_date": "ISO date if visible, else null",
  "keywords_matched": ["terms from their post matching the search"],
  "interest_score": 0-100,
  "purchase_intent": "ready_to_buy|researching|browsing|null",
  "consumer_signals": ["e.g. asked for price", "requested recommendation", "mentioned budget"],
  "is_seller": false,
  "shopping_signals": {
    "mentions_buying": true/false,
    "platform_mentions": ["amazon","ebay","etsy","walmart" — only explicit mentions],
    "frequency": "frequent|occasional|null"
  },
  "contact": {
    "dm_url": "e.g. https://reddit.com/message/compose?to=USERNAME for reddit",
    "type": "DM|Message|Inbox|Connect|View"
  },
  "similar_products": ["other things they might want"]
}

Return JSON: { "profiles": [...] }
Return empty array if no real consumers found.`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
        temperature: 0.2,
      });

      const data = JSON.parse(resp.choices[0]?.message?.content ?? "{}") as {
        profiles?: Array<Partial<SocialProfile>>;
      };
      return (data.profiles ?? []).filter((p) => !p.is_seller && p.username && p.post_text);
    })
  );

  const rawProfiles = extractionResults
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<Partial<SocialProfile>[]>).value);

  // Deduplicate by username+platform
  const seen = new Set<string>();
  profiles = rawProfiles
    .filter((p) => {
      const key = `${p.platform}:${p.username}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((p, i): SocialProfile => ({
      id: `b2c-${Date.now()}-${i}`,
      platform: p.platform ?? "web",
      username: (p.username ?? `user_${i}`).replace(/^@/, ""),
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
      shopping_signals: {
        mentions_buying: p.shopping_signals?.mentions_buying ?? false,
        platform_mentions: p.shopping_signals?.platform_mentions ?? [],
        frequency: p.shopping_signals?.frequency ?? null,
      },
      contact: {
        dm_url: p.contact?.dm_url ?? buildDmUrl(p.platform ?? "web", (p.username ?? "").replace(/^@/, "")),
        type: (p.contact?.type ?? getPlatformContactType(p.platform ?? "web")) as SocialProfile["contact"]["type"],
      },
      ai_message: null,
      similar_products: p.similar_products ?? [],
    }))
    .sort((a, b) => b.interest_score - a.interest_score);

  return jsonResponse({
    profiles,
    queries_used: allQueries.map((q) => q.query),
    total: profiles.length,
    demo: false,
  });
}

function buildDmUrl(platform: string, username: string): string | null {
  if (!username) return null;
  switch (platform.toLowerCase()) {
    case "reddit":    return `https://www.reddit.com/message/compose?to=${username}`;
    case "twitter":   return `https://twitter.com/${username}`;
    case "instagram": return `https://www.instagram.com/${username}`;
    case "tiktok":    return `https://www.tiktok.com/@${username}`;
    case "linkedin":  return `https://www.linkedin.com/in/${username}`;
    default:          return null;
  }
}

function getPlatformContactType(platform: string): SocialProfile["contact"]["type"] {
  switch (platform.toLowerCase()) {
    case "reddit":
    case "twitter":
    case "instagram":
    case "tiktok":    return "DM";
    case "facebook":  return "Message";
    case "linkedin":  return "Connect";
    default:          return "View";
  }
}

// Demo profiles — unique IDs per call, clearly labelled as demo
function buildDemoProfiles(description: string, _ctx: string): SocialProfile[] {
  const ts = Date.now();
  const snippet = description.slice(0, 50);
  return [
    {
      id: `demo-${ts}-1`, platform: "reddit", username: "homefix_seeker",
      display_name: "Sarah M.", first_name: "Sarah", last_name: "M.",
      profile_url: "https://reddit.com/user/homefix_seeker",
      post_text: `Just got quoted $3,200 for what sounds basic. Anyone know a reliable place for "${snippet}"? Called 2 places already — stories don't match. Really frustrated.`,
      post_url: null, post_date: new Date(Date.now() - 7200000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 4),
      interest_score: 92, purchase_intent: "ready_to_buy",
      consumer_signals: ["requested recommendation", "mentioned getting quotes", "expressed urgency"],
      is_seller: false,
      shopping_signals: { mentions_buying: true, platform_mentions: [], frequency: "occasional" },
      contact: { dm_url: "https://reddit.com/message/compose?to=homefix_seeker", type: "DM" },
      ai_message: null, similar_products: ["free estimate", "consultation", "service warranty"],
    },
    {
      id: `demo-${ts}-2`, platform: "twitter", username: "comparing_options_now",
      display_name: "James K.", first_name: "James", last_name: "K.",
      profile_url: "https://twitter.com/comparing_options_now",
      post_text: `Comparing 3 options for ${snippet}. Prices all over the place. Anyone have firsthand experience? Making a decision this week.`,
      post_url: null, post_date: new Date(Date.now() - 14400000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 3),
      interest_score: 85, purchase_intent: "researching",
      consumer_signals: ["comparing prices", "mentioned decision timeline", "seeking personal experience"],
      is_seller: false,
      shopping_signals: { mentions_buying: true, platform_mentions: [], frequency: "occasional" },
      contact: { dm_url: "https://twitter.com/comparing_options_now", type: "DM" },
      ai_message: null, similar_products: ["price comparison guide", "free quote"],
    },
    {
      id: `demo-${ts}-3`, platform: "reddit", username: "first_timer_q",
      display_name: null, first_name: null, last_name: null,
      profile_url: "https://reddit.com/user/first_timer_q",
      post_text: `Never dealt with ${snippet} before. What should I look for? What's a fair price? Any red flags when choosing someone?`,
      post_url: null, post_date: new Date(Date.now() - 86400000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 3),
      interest_score: 68, purchase_intent: "browsing",
      consumer_signals: ["first-time buyer", "asked for price guidance", "researching what to look for"],
      is_seller: false,
      shopping_signals: { mentions_buying: false, platform_mentions: [], frequency: null },
      contact: { dm_url: "https://reddit.com/message/compose?to=first_timer_q", type: "DM" },
      ai_message: null, similar_products: ["beginner consultation", "free inspection"],
    },
  ];
}
