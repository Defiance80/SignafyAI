/**
 * POST /api/growth/discover
 *
 * Triggers a Social Growth Intelligence scan.
 * Tries n8n SGIM workflow first; falls back to direct Firecrawl + GPT.
 *
 * Body: {
 *   industry: string,
 *   audience_description: string,
 *   keywords?: string[],
 *   location?: string,
 *   platforms?: ("reddit"|"youtube"|"linkedin"|"tiktok"|"instagram"|"facebook"|"x"|"google_news")[],
 *   focus?: "trends" | "local" | "competitor_gaps" | "all"
 * }
 */
import { requireOrgContext, getSupabaseServiceClient, DEMO_ORG_ID } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => ({})) as {
    industry?: string;
    audience_description?: string;
    keywords?: string[];
    location?: string;
    platforms?: string[];
    focus?: string;
  };

  const {
    industry = "local business",
    audience_description = "",
    keywords = [],
    location = "",
    platforms = ["linkedin", "tiktok", "instagram", "facebook", "x"],
    focus = "all",
  } = body;

  if (!industry.trim()) return errorResponse("industry is required", 400);

  const runId = crypto.randomUUID();
  const db = getSupabaseServiceClient();

  // ── Create a workflow_run record ──────────────────────────────────────────
  if (db) {
    await db.from("workflow_runs").insert({
      id: runId,
      org_id: ctx.org.id,
      workflow_type: "growth_intelligence",
      status: "running",
      input_params: { industry, audience_description, keywords, location, platforms, focus },
    });
    // ignore insert errors (table may not have all columns yet)

  }

  // ── 1. Try n8n SGIM workflow ──────────────────────────────────────────────
  const n8nBase = process.env.N8N_WEBHOOK_BASE_URL?.replace(/\/$/, "");
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`;

  if (n8nBase) {
    try {
      const n8nRes = await fetch(`${n8nBase}/webhook/sgim-discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry, audience_description, keywords, location, platforms, focus,
          org_id: ctx.org.id, run_id: runId, callback_url: callbackUrl,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (n8nRes.ok) {
        return jsonResponse({ status: "processing", run_id: runId, n8n_triggered: true });
      }
    } catch { /* fall through */ }
  }

  // ── 2. Fallback: direct Firecrawl + GPT ──────────────────────────────────
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  let scrapedContent = "";

  if (firecrawlKey) {
    const kw = keywords.length > 0 ? keywords[0] : industry;
    const loc = location ? ` "${location}"` : "";
    const queries: { platform: string; q: string }[] = [];

    if (platforms.includes("linkedin")) {
      queries.push({ platform: "linkedin", q: `site:linkedin.com "${kw}"${loc} (trend OR challenge OR insight OR advice OR pain point)` });
    }
    if (platforms.includes("tiktok")) {
      queries.push({ platform: "tiktok", q: `site:tiktok.com "${kw}"${loc} OR "tiktok trend" "${kw}"${loc} (viral OR trending OR tips OR honest)` });
    }
    if (platforms.includes("instagram")) {
      queries.push({ platform: "instagram", q: `site:instagram.com "${kw}"${loc} OR instagram "${kw}"${loc} (reel OR post OR story OR tips OR review)` });
    }
    if (platforms.includes("facebook")) {
      queries.push({ platform: "facebook", q: `site:facebook.com "${kw}"${loc} (group OR community OR recommend OR advice OR question)` });
    }
    if (platforms.includes("x")) {
      queries.push({ platform: "x", q: `(site:twitter.com OR site:x.com) "${kw}"${loc} (question OR advice OR frustrated OR recommend OR experience)` });
    }
    if (platforms.includes("reddit")) {
      queries.push({ platform: "reddit", q: `site:reddit.com "${kw}"${loc} (recommend OR advice OR "looking for" OR question OR help OR experience)` });
    }
    if (platforms.includes("youtube")) {
      queries.push({ platform: "youtube", q: `site:youtube.com "${kw}"${loc} (how to OR best OR review OR tips OR honest)` });
    }
    if (platforms.includes("google_news")) {
      queries.push({ platform: "google_news", q: `"${kw}"${loc} (trend OR industry OR news OR market OR 2025 OR 2026)` });
    }

    const searchResults = await Promise.allSettled(
      queries.slice(0, 5).map(async ({ platform, q }) => {
        const res = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, limit: 6, scrapeOptions: { formats: ["markdown"], onlyMainContent: true } }),
          signal: AbortSignal.timeout(15000),
        });
        const data = await res.json() as { data?: Array<{ url?: string; markdown?: string }> };
        return (data.data ?? []).map((r) => `[${platform}] ${r.url ?? ""}\n${(r.markdown ?? "").slice(0, 400)}`).join("\n\n");
      })
    );

    scrapedContent = searchResults
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map((r) => r.value)
      .join("\n\n---\n\n")
      .slice(0, 8000);
  }

  // ── 3. GPT: extract opportunities + signals ───────────────────────────────
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });

  const prompt = `You are a Social Growth Intelligence analyst. Analyze internet conversations and identify the top growth opportunities for the following business profile.

Industry: ${industry}
Target Audience: ${audience_description || "General audience interested in " + industry}
Location: ${location || "Any"}
Keywords: ${keywords.join(", ") || industry}
Focus: ${focus}
Platforms scanned: ${platforms.join(", ")}

${scrapedContent ? `Real conversations found:\n${scrapedContent}` : `Generate realistic growth opportunities based on typical conversations in the ${industry} industry.`}

Return ONLY this JSON (no markdown):
{
  "opportunities": [
    {
      "title": "<compelling opportunity title>",
      "description": "<2-3 sentences on why this is a growth opportunity>",
      "topic": "<main topic>",
      "source": "<comma-separated platforms>",
      "signal_count": <estimated # of discussions>,
      "audience_match": <0-100>,
      "trend_score": <0-100>,
      "competition_score": <0-100>,
      "local_relevance": <0-100>,
      "lead_potential": <0-100>,
      "authority_potential": <0-100>,
      "growth_score": <0-100>,
      "content_formats": ["reel","blog","faq","interview","carousel","podcast"],
      "hooks": ["<hook 1>","<hook 2>"]
    }
  ],
  "social_signals": [
    {
      "source": "<platform>",
      "topic": "<topic>",
      "question": "<the actual post/question text or representative quote>",
      "sentiment": "positive|negative|neutral|frustrated|excited",
      "signal_type": "question|complaint|trend|discussion|buying_intent",
      "relevance_score": <0-100>
    }
  ]
}

Return 4-6 opportunities and 6-10 social signals. Use real data from the scraped content if available, otherwise generate plausible examples. Make growth_score = (trend_score + audience_match + local_relevance + lead_potential + authority_potential) / 5 - competition_score / 5.`;

  try {
    const resp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 3000,
    });

    const raw = resp.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()) as {
      opportunities?: Record<string, unknown>[];
      social_signals?: Record<string, unknown>[];
    };

    const opps = (parsed.opportunities ?? []).slice(0, 8);
    const sigs = (parsed.social_signals ?? []).slice(0, 15);

    if (db && ctx.org.id !== DEMO_ORG_ID) {
      if (opps.length > 0) {
        await db.from("growth_opportunities").insert(
          opps.map((o) => ({ ...o, org_id: ctx.org.id, run_id: runId }))
        );
      }
      if (sigs.length > 0) {
        await db.from("social_signals").insert(
          sigs.map((s) => ({ ...s, org_id: ctx.org.id, run_id: runId }))
        );
      }
      await db.from("workflow_runs")
        .update({ status: "complete", completed_at: new Date().toISOString() })
        .eq("id", runId);
    }

    return jsonResponse({
      status: "complete",
      run_id: runId,
      n8n_triggered: false,
      opportunity_count: opps.length,
      signal_count: sigs.length,
      opportunities: opps,
      social_signals: sigs,
    });
  } catch (e) {
    return errorResponse(`Discovery failed: ${e instanceof Error ? e.message : "Unknown"}`, 500);
  }
}
