/**
 * POST /api/generated-assets/generate
 *
 * Trigger funnel-asset generation for a specific intent signal.
 * Tries n8n WF3 first (bw-asset-generator webhook); falls back to direct GPT
 * generation if n8n is unreachable or not configured.
 *
 * Body: { signal_id: string } | { signal: Partial<IntentSignal> }
 */

import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";
import type { IntentSignal, GeneratedAsset } from "@/lib/supabase/types";

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => ({})) as {
    signal_id?: string;
    signal?: Partial<IntentSignal>;
  };

  const { signal_id, signal: inlineSignal } = body;

  if (!signal_id && !inlineSignal) {
    return errorResponse("signal_id or signal required", 400);
  }

  const db = getSupabaseServiceClient();

  // ── 1. Resolve signal ──────────────────────────────────────────────────────
  let sig: IntentSignal | null = (inlineSignal ?? null) as IntentSignal | null;

  if (signal_id && db) {
    const { data, error } = await db
      .from("intent_signals")
      .select("*")
      .eq("id", signal_id)
      .eq("org_id", ctx.org.id)
      .single();

    if (error || !data) return errorResponse("Signal not found", 404);
    sig = data as IntentSignal;
  }

  if (!sig?.question) {
    return errorResponse("Signal question text is required", 400);
  }

  const runId = crypto.randomUUID();

  // ── 2. Try n8n WF3 ────────────────────────────────────────────────────────
  const n8nBase = process.env.N8N_WEBHOOK_BASE_URL?.replace(/\/$/, "");
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`;

  if (n8nBase) {
    try {
      const n8nRes = await fetch(`${n8nBase}/webhook/bw-asset-generator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signal_id: sig.id ?? null,
          question: sig.question,
          service: sig.service ?? null,
          location: sig.location ?? null,
          industry: sig.industry ?? null,
          source: sig.source ?? null,
          intent_score: sig.intent_score ?? 50,
          buying_stage: sig.buying_stage ?? null,
          urgency: sig.urgency ?? null,
          org_id: ctx.org.id,
          run_id: runId,
          callback_url: callbackUrl,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (n8nRes.ok) {
        return jsonResponse({
          status: "processing",
          run_id: runId,
          message: "Asset generation queued — Funnel Assets tab will update in ~30s",
        });
      }
    } catch {
      // n8n unreachable — fall through to GPT direct
    }
  }

  // ── 3. Fallback: direct GPT generation ────────────────────────────────────
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const prompt = `You are a world-class direct-response copywriter. Generate a complete funnel asset bundle for a local service business targeting this consumer intent signal.

Signal details:
- Question / Post: "${sig.question}"
- Service: ${sig.service ?? "Not specified"}
- Location: ${sig.location ?? "Not specified"}
- Industry: ${sig.industry ?? "Local Business"}
- Buying Stage: ${sig.buying_stage ?? "Research"}
- Urgency: ${sig.urgency ?? "Medium"}
- Intent Score: ${sig.intent_score ?? 50}/100
- Platform Found On: ${sig.source ?? "Online"}

Return ONLY this JSON object — no markdown, no explanation:
{
  "landing_page": "<compelling headline for a page targeting this exact intent>",
  "landing_page_subheadline": "<subheadline with social proof and urgency — 1–2 sentences>",
  "faq": "<3–4 FAQ Q&As as plain text, Q: / A: format>",
  "cta": "<strong call-to-action phrase (10 words max)>",
  "ai_script": "<phone setter script — 5–7 short lines, uses [Name]/[Clinic] placeholders>",
  "email_sequence": "<3-email follow-up sequence, one short descriptor per email with send day>",
  "blog_outline": "<blog title + 5-section outline with SEO angle>",
  "social_posts": "<3 posts: Instagram caption, Facebook post, Instagram Reel hook (label each)>",
  "video_script": "<Hook (0–3s) + Problem (3–15s) + Solution (15–35s) + CTA (35–45s)>",
  "schema_suggestion": "<JSON-LD schema markup as an escaped string>"
}`;

  try {
    const resp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 2500,
    });

    const raw = resp.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(
      raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    ) as Record<string, string>;

    const assetRow = {
      org_id: ctx.org.id,
      run_id: runId,
      signal_id: (sig.id as string | undefined) ?? null,
      intent_signal: sig.question,
      service: sig.service ?? null,
      location: sig.location ?? null,
      industry: sig.industry ?? null,
      business_name: null as string | null,
      landing_page: parsed.landing_page ?? null,
      landing_page_subheadline: parsed.landing_page_subheadline ?? null,
      faq: parsed.faq ?? null,
      cta: parsed.cta ?? null,
      ai_script: parsed.ai_script ?? null,
      email_sequence: parsed.email_sequence ?? null,
      blog_outline: parsed.blog_outline ?? null,
      social_posts: parsed.social_posts ?? null,
      video_script: parsed.video_script ?? null,
      schema_suggestion: parsed.schema_suggestion ?? null,
    };

    if (db) {
      const { data: inserted, error: insertErr } = await db
        .from("generated_assets")
        .insert(assetRow)
        .select()
        .single();

      if (!insertErr && inserted) {
        return jsonResponse({
          status: "complete",
          run_id: runId,
          asset_id: (inserted as GeneratedAsset).id,
          asset: inserted as GeneratedAsset,
        });
      }
    }

    // No DB — return the generated asset in the response
    return jsonResponse({
      status: "complete",
      run_id: runId,
      asset: { ...assetRow, id: runId, created_at: new Date().toISOString() } as GeneratedAsset,
    });
  } catch (e) {
    return errorResponse(
      `Asset generation failed: ${e instanceof Error ? e.message : "Unknown error"}`,
      500
    );
  }
}
