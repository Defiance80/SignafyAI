import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";
import type { SocialData } from "@/lib/supabase/types";

const CACHE_TTL_HOURS = 48;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const db = getSupabaseServiceClient();
  if (!db) return errorResponse("Database not configured", 503);

  const { data: biz, error } = await db
    .from("businesses")
    .select("id, name, location, industry, org_id, social_data, website, weaknesses")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .single();

  if (error || !biz) return errorResponse("Business not found", 404);

  // Return cached if fresh enough
  if (biz.social_data) {
    const cached = biz.social_data as SocialData;
    const cacheAge = (Date.now() - new Date(cached.cached_at).getTime()) / 3600000;
    if (cacheAge < CACHE_TTL_HOURS) {
      return jsonResponse({ social: cached, cached: true });
    }
  }

  // Try Serper.dev for real search results
  const serperKey = process.env.SERPER_API_KEY;
  let searchResults = "";

  if (serperKey) {
    try {
      const query = `"${biz.name}" ${biz.location ?? ""} reviews complaints`;
      const serperRes = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: 10, gl: "us" }),
      });
      const data = await serperRes.json();
      const organic = (data.organic ?? []).slice(0, 8);
      const kgBox = data.knowledgeGraph;
      searchResults = JSON.stringify({ organic, knowledgeGraph: kgBox });
    } catch { /* fall through to GPT-only */ }
  }

  // Use GPT to synthesize social intelligence
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const userPrompt = `Research the online reputation and social chatter for this business:

Business: ${biz.name}
Location: ${biz.location ?? "Unknown"}
Industry: ${biz.industry ?? "Local Business"}
Website: ${biz.website ?? "Not available"}
Known weaknesses: ${biz.weaknesses ?? "None noted"}

${searchResults ? `Search results found:\n${searchResults}` : "No live search data available — use your training knowledge and general patterns for this type of business."}

Based on what you know about businesses like this and the search results above, generate a social intelligence report.

Return ONLY this JSON (no markdown):
{
  "mentions": [
    {
      "platform": "<Google Reviews|Yelp|Facebook|Instagram|Reddit|Twitter>",
      "text": "<representative paraphrase of what customers/people say about this type of business — 1-2 sentences>",
      "sentiment": "<positive|negative|mixed|neutral>",
      "date": "<approximate or 'recent'>"
    }
  ],
  "sentiment_summary": "<2 sentences summarizing the general online sentiment and reputation>",
  "opportunity_relevance": "<1-2 sentences: what the online chatter reveals that's relevant for a digital marketing pitch to this business>"
}

Include 3-5 mentions covering different platforms. Be specific to their industry and location.`;

  try {
    const resp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4.1-mini",
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.4,
      max_tokens: 600,
    });

    const raw = resp.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const social: SocialData = { ...JSON.parse(cleaned), cached_at: new Date().toISOString() };

    // Cache in DB
    await db
      .from("businesses")
      .update({ social_data: social })
      .eq("id", id)
      .eq("org_id", ctx.org.id);

    return jsonResponse({ social, cached: false });
  } catch (e) {
    return errorResponse(`Social scan failed: ${e instanceof Error ? e.message : "Unknown error"}`, 500);
  }
}
