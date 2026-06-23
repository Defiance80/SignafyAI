/**
 * POST /api/growth/generate-reply
 *
 * Generates a brand-voice reply to a social signal / online conversation.
 * Fetches the org's default brand voice from DB and uses it to craft a
 * platform-appropriate response that matches the user's tone, vocabulary,
 * and style.
 *
 * Body: {
 *   signal_id?: string          — fetch signal from DB
 *   signal?: {                  — or provide inline
 *     question: string
 *     source?: string
 *     topic?: string
 *     sentiment?: string
 *   }
 *   platform: string            — target platform for the reply
 *   tone_override?: string      — override brand voice tone ad-hoc
 *   author_name?: string        — name of person being replied to
 * }
 */

import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";

// Platform-specific reply guidance
const PLATFORM_GUIDES: Record<string, { charLimit: number; style: string }> = {
  linkedin:  { charLimit: 1250, style: "Professional, insightful, adds value to the conversation. Use industry language. No slang." },
  tiktok:    { charLimit: 150,  style: "Casual, energetic, relatable. Use emojis sparingly. Short and punchy. Speak to GenZ/Millennial audiences." },
  instagram: { charLimit: 300,  style: "Warm, visual-first, community-oriented. Use 1–2 emojis. Conversational but polished." },
  facebook:  { charLimit: 500,  style: "Friendly, community-minded, helpful. Full sentences. Feels like a neighbor talking, not a brand." },
  x:         { charLimit: 280,  style: "Concise, witty, direct. Every word earns its place. May use 1 relevant emoji." },
  twitter:   { charLimit: 280,  style: "Concise, witty, direct. Every word earns its place. May use 1 relevant emoji." },
  reddit:    { charLimit: 1000, style: "Authentic, helpful, no corporate speak. Redditors hate being sold to. Add genuine value." },
  youtube:   { charLimit: 500,  style: "Appreciative, informative. Thank viewers for engaging. Answer their specific question." },
};

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => ({})) as {
    signal_id?: string;
    signal?: { question: string; source?: string; topic?: string; sentiment?: string };
    platform: string;
    tone_override?: string;
    author_name?: string;
  };

  const { platform = "linkedin", tone_override, author_name } = body;

  // ── Resolve signal ────────────────────────────────────────────────────────
  let signalText = body.signal?.question ?? "";
  let signalSource = body.signal?.source ?? platform;
  let signalTopic = body.signal?.topic ?? "";

  const db = getSupabaseServiceClient();

  if (body.signal_id && db) {
    const { data } = await db
      .from("social_signals")
      .select("question, source, topic, sentiment")
      .eq("id", body.signal_id)
      .eq("org_id", ctx.org.id)
      .single();
    if (data) {
      signalText = data.question;
      signalSource = data.source ?? platform;
      signalTopic = data.topic ?? "";
    }
  }

  if (!signalText.trim()) return errorResponse("signal text is required", 400);

  // ── Fetch brand voice ─────────────────────────────────────────────────────
  let brandVoice: {
    tone?: string;
    vocabulary?: string[];
    avoid_words?: string[];
    example_posts?: string[];
    cta_style?: string;
  } = {};

  if (db) {
    const { data: voice } = await db
      .from("brand_voices")
      .select("tone, vocabulary, avoid_words, example_posts, cta_style")
      .eq("org_id", ctx.org.id)
      .eq("is_default", true)
      .single();
    if (voice) brandVoice = voice;
  }

  const tone = tone_override ?? brandVoice.tone ?? "professional and helpful";
  const guide = PLATFORM_GUIDES[platform] ?? { charLimit: 500, style: "Helpful and genuine." };
  const firstName = author_name ? author_name.split(" ")[0] : null;

  // ── Build GPT prompt ──────────────────────────────────────────────────────
  const systemPrompt = `You are a social media expert writing a reply on behalf of a business.

BRAND VOICE:
- Tone: ${tone}
${brandVoice.vocabulary?.length ? `- Preferred words/phrases: ${brandVoice.vocabulary.join(", ")}` : ""}
${brandVoice.avoid_words?.length ? `- NEVER use these words: ${brandVoice.avoid_words.join(", ")}` : ""}
${brandVoice.cta_style ? `- CTA style: ${brandVoice.cta_style}` : ""}
${brandVoice.example_posts?.length ? `\nEXAMPLE POSTS IN THIS VOICE (study and match this style exactly):\n${brandVoice.example_posts.slice(0, 3).join("\n\n")}` : ""}

PLATFORM: ${platform.toUpperCase()}
Platform rules: ${guide.style}
Max characters: ${guide.charLimit}

CRITICAL: The reply must sound like a real human, not a brand. Match the exact tone and vocabulary shown above.`;

  const userPrompt = `Write a reply to this ${signalSource} conversation${signalTopic ? ` about "${signalTopic}"` : ""}.

${firstName ? `Replying to: ${firstName}` : ""}

Original post/comment:
"${signalText}"

Requirements:
- Reply in the brand voice defined above
- Keep it under ${guide.charLimit} characters
- Be genuine and add real value — do NOT be salesy
${firstName ? `- Address them as "${firstName}" naturally if it fits` : ""}
- End with a soft open question or invitation to continue the conversation

Return JSON: { "reply": "<the reply text>", "platform_tip": "<one-sentence tip specific to posting this on ${platform}>" }`;

  // ── Generate ──────────────────────────────────────────────────────────────
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  try {
    const resp = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.65,
      max_tokens: 600,
    });

    const raw = resp.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { reply?: string; platform_tip?: string };
    const reply = parsed.reply ?? "";

    return jsonResponse({
      reply,
      platform_tip: parsed.platform_tip ?? "",
      char_count: reply.length,
      char_limit: guide.charLimit,
      word_count: reply.split(/\s+/).filter(Boolean).length,
      platform,
      over_limit: reply.length > guide.charLimit,
    });
  } catch (e) {
    return errorResponse(`Reply generation failed: ${e instanceof Error ? e.message : "Unknown"}`, 500);
  }
}
