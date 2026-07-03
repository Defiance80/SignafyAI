import { requireOrgContext } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";

// Vercel Pro: allow up to 60s for AI + Serper
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
    platforms = [],
    keywords = [],
    product_context = "",
    location = "",
    long_tail = [],
  } = body;

  if (!description.trim()) return errorResponse("Search description is required", 400);

  const serperKey = process.env.SERPER_API_KEY;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });

  // No key → demo
  if (!serperKey) {
    return jsonResponse({
      profiles: buildDemoProfiles(description, product_context),
      queries_used: [],
      total: 3,
      demo: true,
      demo_reason: "no_key",
    });
  }

  // Generate search queries with AI
  let searchQueries: string[] = [];
  
  try {
    const queryGenResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Generate 5 highly targeted search queries to find people expressing consumer intent. Focus on phrases people use when they need help, recommendations, or are actively shopping."
        },
        {
          role: "user",
          content: `Generate 5 search queries to find: "${description}"${location ? ` in ${location}` : ""}

Include queries that capture:
1. Direct need expression ("need", "looking for", "help me find")
2. Recommendation requests ("recommend", "suggestions", "best")
3. Price/comparison shopping ("how much", "cost", "vs", "compare")
4. Frustration/urgency ("frustrated with", "urgent", "ASAP")
5. Review/experience questions ("anyone used", "experiences with")

Return JSON: { "queries": ["query1", "query2", ...] }`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

    const queryData = JSON.parse(queryGenResp.choices[0]?.message?.content ?? "{}") as { queries?: string[] };
    searchQueries = (queryData.queries ?? []).slice(0, 5);
  } catch {
    // Fallback to keyword extraction if AI fails
    const kw = keywords.length > 0
      ? keywords.slice(0, 4).join(" ")
      : description.trim().split(/\s+/).filter(w => 
          !["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for"].includes(w.toLowerCase())
        ).slice(0, 5).join(" ");
    const loc = location.trim() ? ` ${location.trim()}` : "";
    
    searchQueries = [
      `${kw}${loc} need OR looking for OR help`,
      `${kw}${loc} recommend OR suggestions`,
      `${kw}${loc} best OR cheapest`,
      `${kw}${loc} price OR cost OR quote`,
      `${kw}${loc} review OR experience`,
    ];
  }

  // Map platforms to site: operators
  const platformSites: Record<string, string> = {
    reddit: "reddit.com",
    twitter: "twitter.com OR x.com",
    quora: "quora.com",
    yelp: "yelp.com",
    youtube: "youtube.com",
    facebook: "facebook.com",
    linkedin: "linkedin.com",
    tiktok: "tiktok.com",
    instagram: "instagram.com",
  };

  const selectedPlatforms = platforms.length > 0 ? platforms : Object.keys(platformSites);
  const siteQueries: string[] = [];

  // Build platform-specific queries
  for (const query of searchQueries) {
    for (const platform of selectedPlatforms) {
      const site = platformSites[platform.toLowerCase()];
      if (site) {
        siteQueries.push(`${query} site:${site}`);
      }
    }
  }

  // Limit to 20 total queries to stay within rate limits
  const finalQueries = siteQueries.slice(0, 20);

  // Serper search
  const searchResults: Array<{ url: string; content: string; title: string; platform: string }> = [];
  const serperErrors: string[] = [];

  const serperResults = await Promise.allSettled(
    finalQueries.map(async (query) => {
      const resp = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": serperKey,
        },
        body: JSON.stringify({
          q: query,
          num: 10,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => resp.status.toString());
        throw new Error(`Serper ${resp.status}: ${errText.slice(0, 100)}`);
      }

      const data = await resp.json() as {
        organic?: Array<{
          link: string;
          snippet?: string;
          title?: string;
        }>;
      };

      const platform = query.includes("site:reddit") ? "reddit" 
        : query.includes("site:twitter") || query.includes("site:x.com") ? "twitter"
        : query.includes("site:quora") ? "quora"
        : query.includes("site:yelp") ? "yelp"
        : query.includes("site:youtube") ? "youtube"
        : query.includes("site:facebook") ? "facebook"
        : query.includes("site:linkedin") ? "linkedin"
        : query.includes("site:tiktok") ? "tiktok"
        : query.includes("site:instagram") ? "instagram"
        : "web";

      return (data.organic ?? [])
        .filter((r) => (r.snippet ?? "").length > 30)
        .map((r) => ({
          url: r.link ?? "",
          content: (r.snippet ?? "").slice(0, 2000),
          title: r.title ?? "",
          platform,
        }));
    })
  );

  for (const result of serperResults) {
    if (result.status === "fulfilled") {
      searchResults.push(...result.value);
    } else {
      serperErrors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  }

  // All searches failed → return debug
  if (searchResults.length === 0) {
    const allFailed = serperErrors.length === finalQueries.length;
    const errSample = serperErrors.slice(0, 2).join("; ");
    return jsonResponse({
      profiles: buildDemoProfiles(description, product_context),
      queries_used: finalQueries,
      total: 3,
      demo: true,
      demo_reason: allFailed ? "api_error" : "no_results",
      debug: {
        queries_run: finalQueries.length,
        errors: serperErrors,
        hint: allFailed
          ? `Serper returned errors for all queries. First error: ${errSample}`
          : `Serper returned ${serperResults.filter(r => r.status === "fulfilled").length} results but none had usable content. Errors: ${errSample || "none"}`,
      },
    });
  }

  // OpenAI extraction from search results
  const pages = searchResults.slice(0, 30);
  let profiles: SocialProfile[] = [];

  try {
    const resp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Extract CONSUMER lead profiles from social media content.

INCLUDE: real individuals asking questions, seeking recommendations, comparing options, mentioning they need a product/service, expressing frustration, asking about pricing.

EXCLUDE (skip or mark is_seller=true):
- Anyone writing "we offer", "our services", "hire us", "contact us for", "DM for pricing"
- Business accounts, sponsored content, ads
- Generic articles or blog posts with no individual poster

Return as many DISTINCT consumers as possible (aim for 10+).`,
        },
        {
          role: "user",
          content: `Find consumers seeking: "${description}"
Product/service context: ${product_context || "not specified"}
Location: ${location || "any"}

Search Results:
${pages.map((r, i) => `[${i + 1}] Platform: ${r.platform}
URL: ${r.url}
Title: ${r.title}
Content: ${r.content}`).join("\n\n---\n\n")}

For each REAL consumer return:
{
  "platform": "${pages.map(p => p.platform).join("|")}",
  "username": "handle without @",
  "display_name": "shown name or null",
  "first_name": "only if visible, else null",
  "last_name": "only if visible, else null",
  "profile_url": "profile URL or null",
  "post_text": "exact quote of need, max 280 chars",
  "post_url": "post URL or null",
  "post_date": "ISO date or null",
  "keywords_matched": [],
  "interest_score": 0-100,
  "purchase_intent": "ready_to_buy|researching|browsing|null",
  "consumer_signals": [],
  "is_seller": false,
  "shopping_signals": { "mentions_buying": false, "platform_mentions": [], "frequency": null },
  "contact": { "dm_url": null, "type": "DM" },
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
  } catch (err) {
    return jsonResponse({
      profiles: buildDemoProfiles(description, product_context),
      queries_used: finalQueries,
      total: 3,
      demo: true,
      demo_reason: "extraction_failed",
      debug: {
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }

  return jsonResponse({
    profiles,
    queries_used: finalQueries,
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
    case "facebook":  return `https://www.facebook.com/${username}`;
    case "youtube":   return `https://www.youtube.com/@${username}`;
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
      post_text: `Just got quoted $3,200 for what sounds basic. Anyone know a reliable place for "${snippet}"? Called 2 places already — really frustrated.`,
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
      id: `demo-${ts}-2`, platform: "twitter", username: "comparing_options_now",
      display_name: "James K.", first_name: "James", last_name: "K.",
      profile_url: "https://twitter.com/comparing_options_now",
      post_text: `Comparing 3 options for ${snippet}. Prices all over the place. Anyone have firsthand experience? Making a decision this week.`,
      post_url: null, post_date: new Date(Date.now() - 14400000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 3),
      interest_score: 85, purchase_intent: "researching",
      consumer_signals: ["comparing prices", "mentioned decision timeline"],
      is_seller: false,
      shopping_signals: { mentions_buying: true, platform_mentions: [], frequency: "occasional" },
      contact: { dm_url: "https://twitter.com/comparing_options_now", type: "DM" },
      ai_message: null, similar_products: ["price comparison guide"],
    },
    {
      id: `demo-${ts}-3`, platform: "reddit", username: "first_timer_q",
      display_name: null, first_name: null, last_name: null,
      profile_url: "https://reddit.com/user/first_timer_q",
      post_text: `Never dealt with ${snippet} before. What should I look for? What's a fair price? Any red flags?`,
      post_url: null, post_date: new Date(Date.now() - 86400000).toISOString(),
      keywords_matched: description.split(" ").slice(0, 3),
      interest_score: 68, purchase_intent: "browsing",
      consumer_signals: ["first-time buyer", "asked for price guidance"],
      is_seller: false,
      shopping_signals: { mentions_buying: false, platform_mentions: [], frequency: null },
      contact: { dm_url: "https://reddit.com/message/compose?to=first_timer_q", type: "DM" },
      ai_message: null, similar_products: ["beginner consultation"],
    },
  ];
}
