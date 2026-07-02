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

  // Step 1: AI generates platform-specific search queries
  let searchQueries: Array<{ query: string; platform: string; intent: string }> = [];

  try {
    const queryGenResp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a social media research expert. Generate specific search queries to find real people actively discussing a topic who might be potential customers.",
        },
        {
          role: "user",
          content: `Goal: Find potential customers in social conversations.

What I sell: ${product_context || "Not specified"}
Target description: ${description}
Location: ${location || "Any"}
Keywords: ${keywords.join(", ") || "Derive from description"}
Platforms: ${platforms.join(", ")}

Generate 6-8 highly targeted search queries that will find real people expressing need for this type of product/service.
Focus on: people asking for recommendations, expressing frustration, comparing options, or showing purchase intent.
Use platform-specific site: operators when appropriate (site:reddit.com, site:twitter.com, etc.).

Return JSON: { "queries": [{ "query": string, "platform": string, "intent": string }] }`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.6,
    });

    const data = JSON.parse(queryGenResp.choices[0]?.message?.content ?? "{}") as {
      queries?: Array<{ query: string; platform: string; intent: string }>;
    };
    searchQueries = data.queries ?? [];
  } catch {
    // If AI fails, build basic queries from description
    searchQueries = platforms.slice(0, 4).map((p) => ({
      query: `${description} site:${p === "google" ? "reddit.com" : `${p}.com`}`,
      platform: p,
      intent: "keyword",
    }));
  }

  // Add user's long-tail queries directly
  const allQueries = [
    ...searchQueries,
    ...(long_tail as string[]).map((q: string) => ({ query: q, platform: "web", intent: "long-tail" })),
  ].slice(0, 10);

  // Step 2: Firecrawl web search
  const searchResults: Array<{ url: string; content: string; title: string }> = [];

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
            limit: 4,
            scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
          }),
          signal: AbortSignal.timeout(12000),
        });
        if (!resp.ok) return;
        const data = await resp.json() as { data?: Array<{ url: string; markdown?: string; metadata?: { title?: string } }> };
        for (const r of data.data ?? []) {
          if (r.markdown && r.markdown.length > 150) {
            searchResults.push({
              url: r.url ?? "",
              content: r.markdown.slice(0, 3000),
              title: r.metadata?.title ?? "",
            });
          }
        }
      } catch {
        // timeout or network error — skip this query
      }
    });
    await Promise.all(searchPromises);
  }

  // No results → return demo data
  if (searchResults.length === 0) {
    return jsonResponse({
      profiles: buildDemoProfiles(description, product_context),
      queries_used: allQueries.map((q) => q.query),
      total: 3,
      demo: true,
    });
  }

  // Step 3: AI extracts individual social profiles from search results
  let profiles: SocialProfile[] = [];

  try {
    const extractResp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Extract individual social media users from these search results who are expressing interest in or looking for: "${description}"

What is being sold: ${product_context || "Not specified"}
Location context: ${location || "Any"}

Search results:
${searchResults
  .slice(0, 10)
  .map((r, i) => `[${i + 1}] URL: ${r.url}\nTitle: ${r.title}\nContent:\n${r.content}`)
  .join("\n\n---\n\n")}

For each UNIQUE real user found, extract:
- platform: reddit|twitter|youtube|google|yelp|web|tiktok|instagram|facebook|linkedin
- username: their handle (without @ prefix)
- display_name: shown name if different
- first_name: first name if clearly visible in profile or posts
- last_name: last name if clearly visible
- profile_url: direct profile page URL
- post_text: their most relevant quote (max 300 chars, exact words)
- post_url: direct link to this specific post/comment
- post_date: date if visible (ISO 8601 or null)
- keywords_matched: array of matched keywords from the search
- interest_score: 0–100 (100=needs this right now, 0=barely related)
- purchase_intent: "browsing"|"researching"|"ready_to_buy"|null
- shopping_signals: { mentions_buying: bool, platform_mentions: ["amazon","ebay","etsy","walmart"] (only if explicitly mentioned), frequency: "occasional"|"frequent"|null }
- contact: { dm_url: direct message URL if constructable (reddit: https://reddit.com/message/compose?to=USERNAME), type: "DM"|"Message"|"Inbox"|"Connect"|"View" }
- similar_products: array of related products/services they implied wanting

ONLY include users with actual posts you found. Do NOT invent users.
Return JSON: { "profiles": [...] }`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
      temperature: 0.3,
    });

    const extracted = JSON.parse(extractResp.choices[0]?.message?.content ?? "{}") as {
      profiles?: Array<Partial<SocialProfile>>;
    };

    profiles = (extracted.profiles ?? [])
      .filter((p) => p.username && p.post_text)
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
  } catch {
    return jsonResponse({
      profiles: buildDemoProfiles(description, product_context),
      queries_used: allQueries.map((q) => q.query),
      total: 3,
      demo: true,
    });
  }

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

function buildDemoProfiles(description: string, _productContext: string): SocialProfile[] {
  return [
    {
      id: "demo-1",
      platform: "reddit",
      username: "homefix_seeker",
      display_name: "Sarah M.",
      first_name: "Sarah",
      last_name: null,
      profile_url: "https://reddit.com/user/homefix_seeker",
      post_text: `Looking for recommendations based on: "${description.slice(0, 80)}". Got quotes already but not sure who to trust. Any recommendations from people who've actually used a local service?`,
      post_url: "https://reddit.com/r/AskReddit/comments/example1",
      post_date: new Date(Date.now() - 7200000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 4),
      interest_score: 94,
      purchase_intent: "ready_to_buy",
      shopping_signals: { mentions_buying: true, platform_mentions: [], frequency: "occasional" },
      contact: { dm_url: "https://reddit.com/message/compose?to=homefix_seeker", type: "DM" },
      ai_message: null,
      similar_products: ["consultation", "service package", "premium option"],
    },
    {
      id: "demo-2",
      platform: "twitter",
      username: "deal_hunter_99",
      display_name: "James K.",
      first_name: "James",
      last_name: "K.",
      profile_url: "https://twitter.com/deal_hunter_99",
      post_text: `Comparing options for ${description.slice(0, 60)}. Found a few providers but prices vary wildly. Anyone have experience they can share before I commit?`,
      post_url: "https://twitter.com/deal_hunter_99/status/example2",
      post_date: new Date(Date.now() - 14400000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 3),
      interest_score: 81,
      purchase_intent: "researching",
      shopping_signals: { mentions_buying: true, platform_mentions: ["amazon"], frequency: "frequent" },
      contact: { dm_url: "https://twitter.com/deal_hunter_99", type: "DM" },
      ai_message: null,
      similar_products: ["review comparison", "free consultation"],
    },
    {
      id: "demo-3",
      platform: "google",
      username: "anonymous_reviewer",
      display_name: null,
      first_name: null,
      last_name: null,
      profile_url: null,
      post_text: `Left a review mentioning they need: "${description.slice(0, 70)}". Currently browsing options and mentioned they checked Amazon and Etsy but couldn't find exactly what they wanted locally.`,
      post_url: null,
      post_date: new Date(Date.now() - 86400000).toISOString(),
      keywords_matched: description.split(" ").slice(1, 4),
      interest_score: 65,
      purchase_intent: "browsing",
      shopping_signals: { mentions_buying: false, platform_mentions: ["amazon", "etsy"], frequency: "frequent" },
      contact: { dm_url: null, type: "View" },
      ai_message: null,
      similar_products: [],
    },
  ];
}
