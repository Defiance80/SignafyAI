import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";
import type { AuditData } from "@/lib/supabase/types";

function extractJSON(raw: string): Record<string, unknown> {
  const attempts = [raw.trim(), raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()];
  for (const s of attempts) {
    try { return JSON.parse(s) as Record<string, unknown>; } catch {}
  }
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]) as Record<string, unknown>; } catch {} }
  return {};
}

export async function POST(
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
    .select("*")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .single();

  if (error || !biz) return errorResponse("Business not found", 404);

  // Grab cached audit if available
  let auditSummary = "";
  try {
    const { data: cached } = await db.from("businesses").select("audit_data").eq("id", id).single();
    if (cached?.audit_data) {
      const a = cached.audit_data as AuditData;
      const topIssues = [...(a.seo?.issues ?? []), ...(a.conversion?.issues ?? [])].slice(0, 4);
      auditSummary = topIssues.length
        ? `Audit findings: ${topIssues.join("; ")}`
        : `Overall score: ${a.overall_score}/100. ${a.opportunity}`;
    }
  } catch {}

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://signafy-ai.vercel.app";
  const formUrl = `${baseUrl}/free-audit?ref=${encodeURIComponent(biz.name ?? "")}`;

  const systemPrompt = `You are a sharp digital marketing consultant writing cold outreach emails.
Your emails are observational, specific, and never generic. You notice real things about a business and offer genuine value.
Never use hype words: boost, skyrocket, transform, revolutionize, game-changer, unlock.
Never open with "I hope this email finds you well" or any pleasantry.
Write like a peer, not a salesperson.`;

  const userPrompt = `Write a cold outreach email for this business prospect:

Business: ${biz.name}
Industry: ${biz.industry ?? "Local business"}
Location: ${biz.location ?? ""}
Website: ${biz.website ?? "none"}
Rating: ${biz.rating != null ? `${biz.rating} stars (${biz.reviews ?? 0} reviews)` : "unknown"}
Known weaknesses: ${biz.weaknesses ?? "not assessed"}
Recommended offer: ${biz.recommended_offer ?? "digital presence audit"}
${auditSummary ? auditSummary : ""}

Rules for the email body:
1. First sentence: ONE specific, observational insight about their business. Be concrete — mention their rating, a gap on their website, something visible. No flattery.
2. Second sentence: The exact business pain that creates (lost revenue, missed leads, ranking behind competitors, etc.).
3. One blank line.
4. Write: "Here's what stood out from a quick look at [business name]:"
5. Three bullet points, each structured as: "• [Short issue noticed] → [Concise fix, 5-10 words]"
   Issues must be specific to their industry and the weaknesses listed above.
6. One blank line.
7. One sentence: offer a free, comprehensive audit of their full digital presence — no pitch, just a clear picture.
8. Final line: "→ Takes 2 minutes: [FORM_URL]"
   Replace [FORM_URL] with: ${formUrl}
9. Sign off: "— [Your name]"

Rules for the subject line:
- 3 to 6 words
- No hype words
- Should sound like something a colleague would say
- Make it feel like you noticed something specific about THEIR business
- Examples of the right tone: "Your booking flow is leaking", "3 gaps in your SEO", "Why you're not on page one"

Output ONLY this JSON, nothing else:
{
  "subject": "<3-6 word subject>",
  "body": "<full email body with newlines as \\n>"
}`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
    const resp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 700,
    });

    const raw = resp.choices[0]?.message?.content ?? "{}";
    const parsed = extractJSON(raw) as { subject?: string; body?: string };

    const subject = parsed.subject ?? `Quick question for ${biz.name}`;
    const body = parsed.body ?? "";

    // Persist to the business row
    try {
      await db
        .from("businesses")
        .update({ email_subject: subject, email_body: body } as never)
        .eq("id", id)
        .eq("org_id", ctx.org.id);
    } catch {}

    return jsonResponse({ subject, body });
  } catch (e) {
    return errorResponse(`Email generation failed: ${e instanceof Error ? e.message : "Unknown error"}`, 500);
  }
}
