import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";
import type { AuditData } from "@/lib/supabase/types";

const CACHE_TTL_HOURS = 72; // Re-audit every 3 days

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const db = getSupabaseServiceClient();
  if (!db) return errorResponse("Database not configured", 503);

  // Fetch the business
  const { data: biz, error } = await db
    .from("businesses")
    .select("id, name, website, industry, org_id, audit_data")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .single();

  if (error || !biz) return errorResponse("Business not found", 404);

  // Return cached if fresh enough
  if (biz.audit_data) {
    const cached = biz.audit_data as AuditData;
    const cacheAge = (Date.now() - new Date(cached.cached_at).getTime()) / 3600000;
    if (cacheAge < CACHE_TTL_HOURS) {
      return jsonResponse({ audit: cached, cached: true });
    }
  }

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
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SignafyBot/1.0; +https://signafy-ai.vercel.app)",
      },
    });
    clearTimeout(timeout);
    const html = await res.text();

    // Extract meaningful content
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1]?.trim() ?? "";
    const h1s = [...html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)].map((m) => m[1].trim()).slice(0, 3);
    const h2s = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)].map((m) => m[1].trim()).slice(0, 6);
    const hasBookingForm = /book|schedule|appointment|reserve/i.test(html);
    const hasEmailCapture = /<form|newsletter|subscribe/i.test(html);
    const hasPhone = /tel:|phone|call us/i.test(html);
    const hasSSL = biz.website.startsWith("https://");
    const hasSchema = /<script[^>]+application\/ld\+json/i.test(html);
    const hasMeta = !!metaDesc;
    const hasH1 = h1s.length > 0;
    const pageSize = html.length;
    const imgCount = (html.match(/<img /gi) ?? []).length;
    const hasTestimonials = /testimonial|review|said|client said/i.test(html);
    const hasBlog = /blog|articles|news/i.test(html);
    const hasVideo = /video|youtube|vimeo|iframe/i.test(html);
    const hasCTA = /get started|contact us|free consultation|book now|call now/i.test(html);
    const hasPricing = /pricing|package|plan|cost|\$/i.test(html);

    websiteText = JSON.stringify({
      title, metaDesc, h1s, h2s,
      signals: {
        hasBookingForm, hasEmailCapture, hasPhone, hasSSL,
        hasSchema, hasMeta, hasH1, hasTestimonials, hasBlog,
        hasVideo, hasCTA, hasPricing,
        pageSize: Math.round(pageSize / 1000) + "kb",
        imgCount,
      },
    });
  } catch (e) {
    fetchError = e instanceof Error ? e.message : "Could not fetch website";
  }

  // Run GPT analysis
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const systemPrompt = `You are an expert digital marketing analyst performing a quick website audit for a sales rep who wants to pitch digital marketing services to this business. Be concise, specific, and actionable. Your goal is to help the rep understand what the business is missing so they can pitch accordingly.`;

  const userPrompt = `Audit this ${biz.industry ?? "local business"} website for ${biz.name}.

Website signals extracted:
${websiteText || `Website could not be fetched (${fetchError}). Base your analysis on what's typically missing for a ${biz.industry ?? "local"} business.`}

Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "seo": {
    "score": <0-100>,
    "issues": [<up to 4 specific SEO issues>],
    "positives": [<up to 2 things they're doing right>]
  },
  "design": {
    "score": <0-100>,
    "notes": "<1 sentence on overall site quality>",
    "trust_signals": [<up to 3 trust indicators present or missing>]
  },
  "conversion": {
    "score": <0-100>,
    "issues": [<up to 3 conversion/booking flow problems>],
    "recommendation": "<single most impactful change to drive more leads>"
  },
  "overall_score": <0-100>,
  "opportunity": "<2 sentences: overall opportunity summary for a digital marketing pitch>",
  "recommendations": [<4-5 specific actionable improvements>]
}`;

  try {
    const resp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const raw = resp.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const audit: AuditData = { ...JSON.parse(cleaned), cached_at: new Date().toISOString() };

    // Cache in DB
    await db
      .from("businesses")
      .update({ audit_data: audit })
      .eq("id", id)
      .eq("org_id", ctx.org.id);

    return jsonResponse({ audit, cached: false });
  } catch (e) {
    return errorResponse(`Audit failed: ${e instanceof Error ? e.message : "Unknown error"}`, 500);
  }
}
