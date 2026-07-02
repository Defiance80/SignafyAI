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

  // Step 1: AI generates 12-15 targeted consumer-intent search queries
  let searchQueries: Array<{ query: string; platform: string; intent: string }> = [];

  try {
    const queryGenResp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a social media research expert specializing in finding CONSUMER purchase intent signals.
Your job is to generate search queries that find BUYERS — people seeking to purchase, hire, or find a product or service.
You must AVOID queries that would surface sellers, service providers, or businesses promoting themselves.
Focus on questions people ask when they NEED something, not when they SELL something.`,
        },
        {
          role: "user",
          content: `Goal: Find potential CONSUMERS who want to BUY or hire: "${description}"
Product/service being sold: ${product_context || "Not specified"}
Location: ${location || "Any"}
Extra keywords: ${keywords.join(", ") || "derive from goal"}
Platforms: ${platforms.join(", ")}

Generate 12-15 search queries to find people who are CONSUMERS — asking questions, seeking help,
looking for recommendations, or expressing a need. Target signals like:
- "looking for", "need help with", "can anyone recommend", "best [service] near me"
- "how much does X cost", "comparing options for", "anyone tried X", "is X worth it"
- "where can I find", "struggling with", "I need someone who", "frustrated with"

Use platform site: operators (site:reddit.com, site:twitter.com) and question-style phrasing.
Vary across: ask questions, complaint phrasing, recommendation requests, price inquiries, beginner questions.

STRICTLY AVOID queries that would find: "we offer", "our services", "hire us", business promotions.

Return JSON: { "queries": [{ "query": string, "platform": string, "intent": string }] }`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200,
      temperature: 0.7,
    });

    const data = JSON.parse(queryGenResp.choices[0]?.message?.content ?? "{}") as {
      queries?: Array<{ query: string; platform: string; intent: string }>;
    };
    searchQueries = data.queries ?? [];
  } catch {
    searchQueries = platforms.flatMap((p) => [
      { query: `"looking for" ${description} site:${p === "google" ? "reddit.com" : `${p}.com`}`, platform: p, intent: "need" },
      { query: `"recommend" OR "best" ${description} ${location}`, platform: p, intent: "recommendation" },
    ]);
  }

  // Merge user long-tail queries
  const allQueries = [
    ...searchQueries,
    ...(long_tail as string[]).map((q: string) => ({ query: q, platform: "web", intent: "long-tail" })),
  ].slice(0, 15);

  // Step 2: Firecrawl — 8-10 results per query for deep coverage
  const searchResults: Array<{ url: string; content: string; title: string; query: string }> = [];

  if (firecrawlKey && allQueries.length > 0) {
    const searchPromises = allQueries.map(async (q) => {
      try {
        const resp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${firecrawlKey}`,
          },
          body: JSON.stringify({
            query: q.query,
            limit: 8,
            scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) return;
        const data = await resp.json() as { data?: Array<{ url: string; markdown?: string; metadata?: { title?: string } }> };
        for (const r of data.data ?? []) {
          if (r.markdown && r.markdown.length > 100) {
            searchResults.push({
              url: r.url ?? "",
              content: r.markdown.slice(0, 4000),
              title: r.metadata?.title ?? "",
              query: q.query,
            });
          }
        }
      } catch { /* timeout — skip */ }
    });
    await Promise.all(searchPromises);
  }

  if (searchResults.length === 0) {
    return jsonResponse({
      profiles: buildDemoProfiles(description, product_context),
      queries_used: allQueries.map((q) => q.query),
      total: 3,
      demo: true,
    });
  }

  // Step 3: AI consumer-only extraction — target 20+ profiles, weed out sellers
  let profiles: SocialProfile[] = [];

  // Process in batches of 8 results to maximize extraction
  const batchSize = 8;
  const batches: Array<typeof searchResults> = [];
  for (let i = 0; i < searchResults.length; i += batchSize) {
    batches.push(searchResults.slice(i, i + batchSize));
  }

  const extractionPromises = batches.map(async (batch) => {
    try {
      const resp = await openai.chat.completions.create({
        model: process.env.AI_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You extract CONSUMER lead profiles from social media content.

CRITICAL RULES:
1. Only include REAL people who are SEEKING to buy, hire, or find: "${description}"
2. EXCLUDE anyone who is SELLING, promoting services, or posting as a business
3. EXCLUDE bots, spam accounts, or automated posts
4. Consumer signals to INCLUDE: asking questions, seeking recommendations, expressing need/frustration,
   comparing options, asking about pricing, looking for help, sharing a problem they need solved
5. Seller signals to EXCLUDE: "we offer", "our services", "hire us", "visit our website", "DM for services",
   "check out our", "we provide", "our team", "book with us", promotional language
6. A seller can still be a consumer if they're asking about a DIFFERENT need — judge the specific post only

Target: Extract as many distinct CONSUMER users as possible (aim for 5+ per batch).`,
          },
          {
            role: "user",
            content: `Find CONSUMER leads seeking: "${description}"
What's being sold: ${product_context || "Not specified"}
Location context: ${location || "Any"}

Search results:
${batch.map((r, i) => `[${i + 1}] URL: ${r.url}\nTitle: ${r.title}\nContent:\n${r.content}`).join("\n\n---\n\n")}

For each distinct CONSUMER user found, extract:
{
  "platform": "reddit|twitter|youtube|google|yelp|web|tiktok|instagram|facebook|linkedin",
  "username": "handle without @ prefix",
  "display_name": "their displayed name if shown",
  "first_name": "extract ONLY if clearly stated in their post/profile (not guessed)",
  "last_name": "extract ONLY if clearly visible in their profile/post (not guessed)",
  "profile_url": "direct URL to their profile",
  "post_text": "their EXACT post/comment showing the consumer need, max 300 chars",
  "post_url": "direct URL to this specific post",
  "post_date": "ISO 8601 if visible, else null",
  "keywords_matched": ["keywords from their post matching the search"],
  "interest_score": 0-100 (100=urgent active buyer, 50=curious, 0=barely related),
  "purchase_intent": "ready_to_buy|researching|browsing|null",
  "consumer_signals": ["specific phrases showing consumer intent, e.g. 'asked for quote', 'comparing prices', 'mentioned budget'],
  "is_seller": false,
  "shopping_signals": {
    "mentions_buying": true/false,
    "platform_mentions": ["amazon","ebay","etsy","walmart","google shopping"] — only explicit mentions,
    "frequency": "frequent|occasional|null"
  },
  "contact": {
    "dm_url": "construct where possible: reddit→https://reddit.com/message/compose?to=USERNAME",
    "type": "DM|Message|Inbox|Connect|View"
  },
  "similar_products": ["related products/services they might also want"]
}

Return JSON: { "profiles": [...] }
Return empty array if no genuine consumers found — do NOT fabricate users.`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
        temperature: 0.25,
      });

      const extracted = JSON.parse(resp.choices[0]?.message?.content ?? "{}") as {
        profiles?: Array<Partial<SocialProfile>>;
      };
      return (extracted.profiles ?? []).filter((p) => !p.is_seller && p.username && p.post_text);
    } catch {
      return [];
    }
  });

  const batchResults = await Promise.all(extractionPromises);
  const rawProfiles = batchResults.flat();

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
        dm_url:
          p.contact?.dm_url ??
          buildDmUrl(p.platform ?? "web", (p.username ?? "").replace(/^@/, "")),
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
    case "reddit":    return "DM";
    case "twitter":   return "DM";
    case "instagram": return "DM";
    case "tiktok":    return "DM";
    case "facebook":  return "Message";
    case "linkedin":  return "Connect";
    default:          return "View";
  }
}

function buildDemoProfiles(description: string, _ctx: string): SocialProfile[] {
  return [
    {
      id: "demo-1", platform: "reddit", username: "homefix_seeker",
      display_name: "Sarah Mitchell", first_name: "Sarah", last_name: "Mitchell",
      profile_url: "https://reddit.com/user/homefix_seeker",
      post_text: `Just got quoted $3,200 for what sounds like a basic fix. Anyone know a reliable, honest company for "${description.slice(0, 50)}"? Already called 2 places and getting different stories. Really frustrated.`,
      post_url: "https://reddit.com/r/AskReddit/comments/example1",
      post_date: new Date(Date.now() - 7200000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 5),
      interest_score: 96, purchase_intent: "ready_to_buy",
      consumer_signals: ["asked for recommendation", "mentioned getting quotes", "expressed frustration"],
      is_seller: false,
      shopping_signals: { mentions_buying: true, platform_mentions: [], frequency: "occasional" },
      contact: { dm_url: "https://reddit.com/message/compose?to=homefix_seeker", type: "DM" },
      ai_message: null, similar_products: ["consultation", "free estimate", "service warranty"],
    },
    {
      id: "demo-2", platform: "twitter", username: "jk_dealfinder",
      display_name: "James K.", first_name: "James", last_name: "K.",
      profile_url: "https://twitter.com/jk_dealfinder",
      post_text: `Comparing 3 different options for ${description.slice(0, 60)}. Prices are all over the place. Anyone have personal experience? Looking to make a decision this week.`,
      post_url: "https://twitter.com/jk_dealfinder/status/example2",
      post_date: new Date(Date.now() - 14400000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 3),
      interest_score: 88, purchase_intent: "researching",
      consumer_signals: ["comparing prices", "decision timeline mentioned", "seeking personal recommendations"],
      is_seller: false,
      shopping_signals: { mentions_buying: true, platform_mentions: ["amazon"], frequency: "frequent" },
      contact: { dm_url: "https://twitter.com/jk_dealfinder", type: "DM" },
      ai_message: null, similar_products: ["price comparison", "free quote"],
    },
    {
      id: "demo-3", platform: "reddit", username: "firsttimer_needs_help",
      display_name: null, first_name: null, last_name: null,
      profile_url: "https://reddit.com/user/firsttimer_needs_help",
      post_text: `Complete newbie here. Never dealt with ${description.slice(0, 50)} before. What should I look for? What's a fair price? Any red flags to watch out for when choosing someone?`,
      post_url: "https://reddit.com/r/DIY/comments/example3",
      post_date: new Date(Date.now() - 86400000).toISOString(),
      keywords_matched: description.split(" ").slice(1, 4),
      interest_score: 72, purchase_intent: "browsing",
      consumer_signals: ["first-time buyer questions", "price guidance needed", "vetting criteria questions"],
      is_seller: false,
      shopping_signals: { mentions_buying: false, platform_mentions: ["google"], frequency: null },
      contact: { dm_url: "https://reddit.com/message/compose?to=firsttimer_needs_help", type: "DM" },
      ai_message: null, similar_products: ["beginner guide", "consultation"],
    },
  ];
}
