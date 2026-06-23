import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";
import type { AuditData } from "@/lib/supabase/types";

const CACHE_TTL_HOURS = 72;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const db = getSupabaseServiceClient();
  if (!db) return errorResponse("Database not configured", 503);

  // Fetch the business — only select columns guaranteed to exist
  const { data: biz, error } = await db
    .from("businesses")
    .select("id, name, website, industry, org_id")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .single();

  if (error || !biz) return errorResponse("Business not found", 404);

  // Try to read cached audit_data if the column exists
  // (migration 010 adds this column — silently skipped if not yet applied)
  try {
    const { data: cached } = await db
      .from("businesses")
      .select("audit_data")
      .eq("id", id)
      .single();

    if (cached?.audit_data) {
      const a = cached.audit_data as AuditData;
      const ageH = (Date.now() - new Date(a.cached_at).getTime()) / 3600000;
      if (ageH < CACHE_TTL_HOURS) {
        return jsonResponse({ audit: a, cached: true });
      }
    }
  } catch { /* column not yet migrated — continue to generate fresh */ }

  if (!biz.website) {
    return jsonResponse({ audit: null, error: "No website URL available for this business." });
  }

  // Fetch website content
  let websiteText = "";
  let fetchError = "";
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(biz.website, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SignafyBot/1.0)" },
    });
    clearTimeout(timeout);
    const html = await res.text();

    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1]?.trim() ?? "";
    const h1s = [...html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)].map((m) => m[1].trim()).slice(0, 3);
    const h2s = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)].map((m) => m[1].trim()).slice(0, 6);

    websiteText = JSON.stringify({
      title, metaDesc, h1s, h2s,
      signals: {
        hasBookingForm: /book|schedule|appointment|reserve/i.test(html),
        hasEmailCapture: /<form|newsletter|subscribe/i.test(html),
        hasPhone: /tel:|phone|call us/i.test(html),
        hasSSL: biz.website.startsWith("https://"),
        hasSchema: /<script[^>]+application\/ld\+json/i.test(html),
        hasMeta: !!metaDesc, hasH1: h1s.length > 0,
        hasTestimonials: /testimonial|review|said|client said/i.test(html),
        hasBlog: /blog|articles|news/i.test(html),
        hasVideo: /video|youtube|vimeo|iframe/i.test(html),
        hasCTA: /get started|contact us|free consultation|book now|call now/i.test(html),
        hasPricing: /pricing|package|plan|cost|\$/i.test(html),
        pageSize: Math.round(html.length / 1000) + "kb",
        imgCount: (html.match(/<img /gi) ?? []).length,
      },
    });
  } catch (e) {
    fetchError = e instanceof Error ? e.message : "Could not fetch website";
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });

  const userPrompt = `Audit this ${biz.industry ?? "local business"} website for ${biz.name}.

Website signals:
${websiteText || `Website could not be fetched (${fetchError}). Base your analysis on typical issues for a ${biz.industry ?? "local"} business.`}

Return ONLY a JSON object (no markdown):
{
  "seo": { "score": <0-100>, "issues": [<up to 4>], "positives": [<up to 2>] },
  "design": { "score": <0-100>, "notes": "<1 sentence>", "trust_signals": [<up to 3>] },
  "conversion": { "score": <0-100>, "issues": [<up to 3>], "recommendation": "<single best change>" },
  "overall_score": <0-100>,
  "opportunity": "<2 sentences for a digital marketing pitch>",
  "recommendations": [<4-5 actionable items>]
}`;

  try {
    const resp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4.1-mini",
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.3,
      max_tokens: 800,
    });
    const raw = resp.choices[0]?.message?.content ?? "{}";
    const audit: AuditData = {
      ...JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()),
      cached_at: new Date().toISOString(),
    };

    // Try to cache — silently skip if column doesn't exist yet (migration 010 pending)
    try {
      await db.from("businesses").update({ audit_data: audit } as never).eq("id", id).eq("org_id", ctx.org.id);
    } catch { /* column not yet added */ }

    return jsonResponse({ audit, cached: false });
  } catch (e) {
    return errorResponse(`Audit failed: ${e instanceof Error ? e.message : "Unknown error"}`, 500);
  }
}
