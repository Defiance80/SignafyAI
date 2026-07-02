import { requireOrgContext } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";
import type { SocialProfile } from "../search/route";

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => ({})) as {
    profile?: SocialProfile;
    product_context?: string;
    tone?: "casual" | "professional" | "friendly";
  };

  const { profile, product_context = "", tone = "friendly" } = body;
  if (!profile) return errorResponse("Profile is required", 400);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });

  const toneGuide: Record<string, string> = {
    casual:       "Casual, like a knowledgeable friend texting them. Short sentences. No fluff.",
    friendly:     "Warm and genuine. Sounds like a real person who spotted their post, not a salesperson.",
    professional: "Professional but personable. Like a trusted local expert reaching out.",
  };

  const nameGreeting = profile.first_name
    ? `Hey ${profile.first_name}`
    : `Hey there`;

  const shopSignals = [
    profile.shopping_signals.mentions_buying ? "mentioned wanting to buy/hire" : null,
    profile.shopping_signals.platform_mentions.length > 0
      ? `mentioned ${profile.shopping_signals.platform_mentions.join(", ")}`
      : null,
    profile.purchase_intent === "ready_to_buy" ? "ready to act now" : null,
    profile.purchase_intent === "researching" ? "actively comparing options" : null,
  ]
    .filter(Boolean)
    .join("; ");

  const systemPrompt = `You write hyper-personalized outreach messages for social media DMs.
Tone: ${toneGuide[tone] ?? toneGuide.friendly}

Rules:
- Reference their EXACT post or comment. Quote a specific phrase.
- Never sound like a marketing template. Sound like you spotted their post and genuinely want to help.
- The message should make them think "how did they know exactly what I needed?"
- Max 3 short paragraphs. No subject line. No sign-off required (they'll add their name).
- End with ONE clear, low-pressure CTA.
- Do NOT use words like "I came across", "I noticed", "I saw" — those are overused.
- Platform context: this message will be sent via ${profile.platform}.`;

  const userPrompt = `Write a personalized outreach message for:

Platform: ${profile.platform}
Username: ${profile.username}${profile.display_name ? ` (${profile.display_name})` : ""}
Their exact post: "${profile.post_text}"
Shopping signals: ${shopSignals || "general interest"}
Interest score: ${profile.interest_score}/100
Purchase intent: ${profile.purchase_intent ?? "unknown"}
Similar products they mentioned: ${profile.similar_products.join(", ") || "none"}

What I'm offering: ${product_context || "a relevant product or service that matches their need"}

Write the message now (no preamble, just the message):`;

  const resp = await openai.chat.completions.create({
    model: process.env.AI_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 400,
    temperature: 0.8,
  });

  const message = resp.choices[0]?.message?.content?.trim() ?? "";

  if (!message) return errorResponse("Message generation failed", 500);

  // Prepend name greeting if message doesn't already start with their name
  const finalMessage = message.startsWith(nameGreeting) || message.toLowerCase().startsWith("hey")
    ? message
    : `${nameGreeting}, ${message.charAt(0).toLowerCase()}${message.slice(1)}`;

  return jsonResponse({ message: finalMessage, tone, platform: profile.platform });
}
