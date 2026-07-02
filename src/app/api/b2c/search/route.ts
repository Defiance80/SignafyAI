import { requireOrgContext } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";

// Vercel Pro: allow up to 60s for AI + Firecrawl
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
    keywords = [],
    product_context = "",
    location = "",
    long_tail = [],
  } = body;

  if (!description.trim()) return errorResponse("Search description is required", 400);

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });

  // Build search queries from templates — much faster than calling OpenAI for query gen
  const kw = keywords.length > 0
    ? keywords.slice(0, 4).join(" ")
    : description.trim().split(/\s+/).slice(0, 5).join(" ");
  const loc = location.trim() ? ` ${location.trim()}` : "";

  const templateQueries = [
    `site:reddit.com "${kw}"${loc} looking for`,
    `site:reddit.com "${kw}"${loc} recommend`,
    `"${kw}"${loc} "how much" OR "price" OR "cost" site:reddit.com`,
    `"${kw}"${loc} "anyone know" OR "anyone tried" site:reddit.com`,
    `"${kw}"${loc} help -"we offer" -"our services" site:reddit.com`,
  ];

  // Include any user-supplied long-tail queries (max 3 extra)
  const ltQueries = (long_tail as string[]).slice(0, 3);
  const allQueries = [...templateQueries, ...ltQueries].slice(0, 6);

  // Firecrawl: 5 results per query, 5s timeout, allSettled so one failure doesn't kill the batch
  const searchResults: Array<{ url: string; content: string; title: string }> = [];

  if (firecrawlKey) {
    const fcResults = await Promise.allSettled(
      allQueries.map(async (query) => {
        const resp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${firecrawlKey}`,
          },
          body: JSON.stringify({
            query,
            limit: 5,
            scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as {
          data?: Array<{ url: string; markdown?: string; metadata?: { title?: string } }>;
        };
        return (data.data ?? [])
          .filter((r) => r.markdown && r.markdown.length > 100)
          .map((r) => ({
            url: r.url ?? "",
            content: r.markdown!.slice(0, 2000),
            title: r.metadata?.title ?? "",
          }));
      })
    );

    for (const result of fcResults) {
      if (result.status === "fulfilled") {
        searchResults.push(...result.value);
      }
    }
  }

  // No Firecrawl results → return demo profiles
  if (searchResults.length === 0) {
    return jsonResponse({
      profiles: buildDemoProfiles(description, product_context),
      queries_used: allQueries,
      total: 3,
      demo: true,
    });
  }

  // Single OpenAI extraction call across all results (up to 25 pages)
  const pages = searchResults.slice(0, 25);
  let profiles: SocialProfile[] = [];

  try {
    const resp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Extract CONSUMER lead profiles from social media content.

INCLUDE: real individuals asking questions, seeking recommendations, comparing options, mentioning they need a product/service, expressing frustration with current solution, asking about pricing or availability.

EXCLUDE — mark is_seller=true or skip entirely:
- Anyone writing "we offer", "our services", "hire us", "contact us for", "DM for pricing"
- Business accounts, sponsored content, ads
- Generic articles, blog posts with no individual poster
- Bots or automated posts

Return as many DISTINCT consumers as possible (aim for 10+).`,
        },
        {
          role: "user",
          content: `Find consumers seeking: "${description}"
Product/service context: ${product_context || "not specified"}
Location filter: ${location || "any"}

Pages to analyze:
${pages.map((r, i) => `[${i + 1}] ${r.url}\n${r.title}\n${r.content}`).join("\n\n---\n\n")}

For each REAL consumer found return JSON:
{
  "platform": "reddit|twitter|youtube|google|yelp|web|tiktok|instagram|facebook|linkedin",
  "username": "handle without @ prefix",
  "display_name": "their shown name or null",
  "first_name": "only if visible in their post/profile, else null",
  "last_name": "only if explicitly visible, else null",
  "profile_url": "direct URL to their profile or null",
  "post_text": "exact quote showing their need, max 280 chars",
  "post_url": "URL to the specific post or null",
  "post_date": "ISO date if visible, else null",
  "keywords_matched": ["terms from their post matching the search"],
  "interest_score": 0-100,
  "purchase_intent": "ready_to_buy|researching|browsing|null",
  "consumer_signals": ["e.g. asked for price", "requested recommendation"],
  "is_seller": false,
  "shopping_signals": {
    "mentions_buying": true/false,
    "platform_mentions": [],
    "frequency": "frequent|occasional|null"
  },
  "contact": {
    "dm_url": "e.g. https://reddit.com/message/compose?to=USERNAME",
    "type": "DM|Message|Inbox|Connect|View"
  },
  "similar_products": []
}

Return JSON: { "profiles": [...] }`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
      temperature: 0.2,
    });

    const data = JSON.parse(resp.choices[0]?.message?.content ?? "{}") as {
      profiles?: Array<Partial<SocialProfile>>;
    };
    const raw = (data.profiles ?? []).filter((p) => !p.is_seller && p.username && p.post_text);

    // Deduplicate by username+platform
    const seen = new Set<string>();
    const ts = Date.now();
    profiles = raw
      .filter((p) => {
        const key = `${p.platform}:${p.username}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((p, i): SocialProfile => ({
        id: `b2c-${ts}-${i}`,
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
  } catch {
    // OpenAI failed — return demo profiles instead of empty
    return jsonResponse({
      profiles: buildDemoProfiles(description, product_context),
      queries_used: allQueries,
      total: 3,
      demo: true,
    });
  }

  return jsonResponse({
    profiles,
    queries_used: allQueries,
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
