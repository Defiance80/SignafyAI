import { z } from "zod";
import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { generateContent } from "@/lib/ai";
import { guardApiRate, guardContentGenerationUsage } from "@/lib/access";
import { errorResponse, jsonResponse, sanitizeText, generateId } from "@/lib/utils";

const GenerateSchema = z.object({
  content_type: z.enum(["blog_post","social_caption","email_sequence","ad_copy","video_script"]),
  platform: z.enum(["instagram","linkedin","tiktok","twitter","facebook","cross_platform"]),
  tone: z.enum(["professional","casual","witty","inspirational","bold"]),
  prompt: z.string().min(5).max(2000),
  voice_id: z.string().uuid().optional(),
});

// ─── POST /api/content — generate new content ─────────────────────────────────
export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const apiLimit = await guardApiRate(ctx);
  if (apiLimit) return apiLimit;
  const usageLimit = await guardContentGenerationUsage(ctx);
  if (usageLimit) return usageLimit;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);
  }

  const db = getSupabaseServiceClient();

  // Fetch brand voice if specified
  let brandVoice;
  if (parsed.data.voice_id && db) {
    const { data } = await db
      .from("brand_voices")
      .select("*")
      .eq("id", parsed.data.voice_id)
      .eq("org_id", ctx.org.id)
      .single();
    brandVoice = data ?? undefined;
  } else if (db) {
    // Use default voice
    const { data } = await db
      .from("brand_voices")
      .select("*")
      .eq("org_id", ctx.org.id)
      .eq("is_default", true)
      .single();
    brandVoice = data ?? undefined;
  }

  if (!process.env.OPENAI_API_KEY) {
    return errorResponse(
      "AI generation not configured — add your OPENAI_API_KEY in Vercel environment variables.",
      503
    );
  }

  const generated = await generateContent({
    content_type: parsed.data.content_type,
    platform: parsed.data.platform,
    tone: parsed.data.tone,
    prompt: sanitizeText(parsed.data.prompt),
    brand_voice: brandVoice,
  });

  if (!db) {
    return jsonResponse({
      id: generateId(),
      org_id: ctx.org.id,
      ...parsed.data,
      ...generated,
      status: "draft",
      metadata: { hashtags: generated.hashtags, media_suggestions: generated.media_suggestions },
      created_at: new Date().toISOString(),
    }, 201);
  }

  const { data, error } = await db.from("content_pieces").insert({
    org_id: ctx.org.id,
    voice_id: parsed.data.voice_id ?? null,
    type: parsed.data.content_type,
    platform: parsed.data.platform,
    prompt: sanitizeText(parsed.data.prompt),
    body: generated.body,
    char_count: generated.char_count,
    engagement_prediction: generated.engagement_prediction,
    status: "draft",
    metadata: {
      hashtags: generated.hashtags,
      media_suggestions: generated.media_suggestions,
    },
  }).select().single();

  if (error) return errorResponse(error.message, 500);

  // Increment usage counter
  await db.from("organizations")
    .update({ usage_content_mo: ctx.org.usage_content_mo + 1 })
    .eq("id", ctx.org.id);

  return jsonResponse(data, 201);
}

// ─── GET /api/content ─────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const perPage = Math.min(50, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "20")));
  const status = url.searchParams.get("status");
  const platform = url.searchParams.get("platform");
  const type = url.searchParams.get("type");

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ data: [], total: 0, page: 1, per_page: perPage });

  let query = db
    .from("content_pieces")
    .select("*", { count: "exact" })
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (status) query = query.eq("status", status);
  if (platform) query = query.eq("platform", platform);
  if (type) query = query.eq("type", type);

  const { data, error, count } = await query;
  if (error) return errorResponse(error.message, 500);

  return jsonResponse({ data, total: count ?? 0, page, per_page: perPage });
}
