import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";
import type { SocialData } from "@/lib/supabase/types";

const CACHE_TTL_HOURS = 48;

function extractJSON(raw: string): Record<string, unknown> {
  const attempts = [
    raw.trim(),
    raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim(),
  ];
  for (const s of attempts) {
    try { return JSON.parse(s) as Record<string, unknown>; } catch {}
  }
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]) as Record<string, unknown>; } catch {} }
  return {};
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const db = getSupabaseServiceClient();
  if (!db) return errorResponse("Database not configured", 503);

  // Only select columns guaranteed to exist
  const { data: biz, error } = await db
    .from("businesses")
    .select("id, name, location, industry, org_id, website, weaknesses")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .single();

  if (error || !biz) return errorResponse("Business not found", 404);

  // Try cache if column exists (migration 010)
  try {
    const { data: cached } = await db
      .from("businesses")
      .select("social_data")
      .eq("id", id)
      .single();

    if (cached?.social_data) {
      const s = cached.social_data as SocialData;
      const ageH = (Date.now() - new Date(s.cached_at).getTime()) / 3600000;
      if (ageH < CACHE_TTL_HOURS) {
        return jsonResponse({ social: s, cached: true });
      }
    }
  } catch { /* migration 010 not yet applied */ }

  // Try Serper.dev for real search results
  const serperKey = process.env.SERPER_API_KEY;
  let searchResults = "";
  if (serperKey) {
    try {
      const serperRes = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q: `"${biz.name}" ${biz.location ?? ""} reviews`, num: 8, gl: "us" }),
      });
      const data = await serperRes.json();
      searchResults = JSON.stringify({ organic: (data.organic ?? []).slice(0, 6) });
    } catch { /* fall through */ }
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });

  const userPrompt = `Research the online reputation for:
Business: ${biz.name}
Location: ${biz.location ?? "Unknown"}
Industry: ${biz.industry ?? "Local Business"}
Website: ${biz.website ?? "N/A"}
Known weaknesses: ${biz.weaknesses ?? "None noted"}
${searchResults ? `\nSearch results:\n${searchResults}` : ""}

Return ONLY this JSON (no markdown):
{
  "mentions": [
    {
      "platform": "<Google Reviews|Yelp|Facebook|Instagram|Reddit|Twitter>",
      "text": "<representative customer sentiment — 1-2 sentences>",
      "sentiment": "<positive|negative|mixed|neutral>",
      "date": "<approximate>"
    }
  ],
  "sentiment_summary": "<2 sentences on overall reputation>",
  "opportunity_relevance": "<1-2 sentences: what online chatter reveals for a pitch to this business>"
}

Include 3-5 mentions across different platforms. Be specific to their industry and location.`;

  try {
    const resp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.4,
      max_tokens: 600,
    });
    const raw = resp.choices[0]?.message?.content ?? "{}";
    const parsed = extractJSON(raw) as Partial<SocialData>;
    const social: SocialData = {
      mentions: parsed.mentions ?? [],
      sentiment_summary: parsed.sentiment_summary ?? "",
      opportunity_relevance: parsed.opportunity_relevance ?? "",
      cached_at: new Date().toISOString(),
    };

    // Try to cache — silently skip if migration 010 not yet applied
    try {
      await db.from("businesses").update({ social_data: social } as never).eq("id", id).eq("org_id", ctx.org.id);
    } catch { /* column not yet added */ }

    return jsonResponse({ social, cached: false });
  } catch (e) {
    return errorResponse(`Social scan failed: ${e instanceof Error ? e.message : "Unknown error"}`, 500);
  }
}
