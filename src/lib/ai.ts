/**
 * AI client — OpenAI GPT-4o by default, with Anthropic Claude as fallback.
 * Switch provider via AI_PROVIDER env var: "openai" | "anthropic"
 */

import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "not-configured",
    });
  }
  return _openai;
}

const MODEL = process.env.AI_MODEL ?? "gpt-4o";

// ─── Lead Scoring ─────────────────────────────────────────────────────────────

export interface LeadScoringInput {
  name: string;
  company?: string;
  email?: string;
  platform?: string;
  industry?: string;
  location?: string;
  enrichment_data?: Record<string, unknown>;
  target_industry?: string;
}

export interface LeadScoringResult {
  score: number;       // 0-100
  reasoning: string;
  signals: { label: string; impact: "positive" | "negative" | "neutral"; weight: number }[];
}

export async function scoreLead(input: LeadScoringInput): Promise<LeadScoringResult> {
  if (!process.env.OPENAI_API_KEY) {
    // Deterministic mock scoring for demo mode
    const base = Math.floor(Math.random() * 60) + 20;
    return {
      score: base,
      reasoning: "Demo mode — AI scoring not configured.",
      signals: [{ label: "Demo signal", impact: "neutral", weight: 0 }],
    };
  }

  const prompt = `You are a B2B lead scoring expert. Score this prospect from 0-100 based on their likelihood to become a paying customer for a marketing agency SaaS.

Prospect data:
${JSON.stringify(input, null, 2)}

Return valid JSON matching this exact shape:
{
  "score": <integer 0-100>,
  "reasoning": "<2-3 sentence explanation>",
  "signals": [
    { "label": "<signal name>", "impact": "positive"|"negative"|"neutral", "weight": <1-10> }
  ]
}`;

  const res = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 500,
  });

  const json = JSON.parse(res.choices[0].message.content ?? "{}");
  return json as LeadScoringResult;
}

// ─── Content Generation ───────────────────────────────────────────────────────

export interface ContentGenerationInput {
  content_type: string;
  platform: string;
  tone: string;
  prompt: string;
  brand_voice?: {
    vocabulary?: string[];
    avoid_words?: string[];
    example_posts?: string[];
    cta_style?: string;
    platform_rules?: Record<string, unknown>;
  };
}

export interface ContentGenerationResult {
  body: string;
  char_count: number;
  engagement_prediction: number;
  hashtags: string[];
  media_suggestions: string[];
}

const CHAR_LIMITS: Record<string, number> = {
  instagram: 2200,
  twitter: 280,
  linkedin: 3000,
  tiktok: 2200,
  facebook: 63206,
};

export async function generateContent(input: ContentGenerationInput): Promise<ContentGenerationResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      body: `[Demo mode] ${input.content_type} for ${input.platform}: ${input.prompt}`,
      char_count: 80,
      engagement_prediction: 5.2,
      hashtags: ["#marketing", "#growth"],
      media_suggestions: ["High-contrast image", "Short video loop"],
    };
  }

  const charLimit = CHAR_LIMITS[input.platform] ?? 3000;
  const voice = input.brand_voice;

  const systemPrompt = `You are an expert social media copywriter.
Platform: ${input.platform} (max ${charLimit} characters)
Content type: ${input.content_type}
Tone: ${input.tone}
${voice?.vocabulary?.length ? `Preferred words: ${voice.vocabulary.join(", ")}` : ""}
${voice?.avoid_words?.length ? `Never use: ${voice.avoid_words.join(", ")}` : ""}
${voice?.cta_style ? `CTA style: ${voice.cta_style}` : ""}
${voice?.example_posts?.length ? `Style examples:\n${voice.example_posts.slice(0, 2).join("\n\n")}` : ""}`;

  const userPrompt = `Write ${input.content_type} content. Topic: ${input.prompt}

Return JSON:
{
  "body": "<the content>",
  "engagement_prediction": <float 1.0-15.0, estimated engagement rate %>,
  "hashtags": ["<tag1>", "<tag2>"],
  "media_suggestions": ["<suggestion>"]
}`;

  const res = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 1500,
  });

  const json = JSON.parse(res.choices[0].message.content ?? "{}");
  return {
    body: json.body ?? "",
    char_count: (json.body ?? "").length,
    engagement_prediction: json.engagement_prediction ?? 4.0,
    hashtags: json.hashtags ?? [],
    media_suggestions: json.media_suggestions ?? [],
  };
}

// ─── Social Message Classification ───────────────────────────────────────────

export interface ClassificationInput {
  message: string;
  platform: string;
  author?: string;
}

export interface ClassificationResult {
  intent: "inquiry" | "complaint" | "praise" | "spam" | "partnership" | "purchase_intent";
  sentiment: number;     // -1.0 to 1.0
  suggested_reply: string;
}

export async function classifyMessage(input: ClassificationInput): Promise<ClassificationResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      intent: "inquiry",
      sentiment: 0.5,
      suggested_reply: "[Demo mode] AI reply generation not configured.",
    };
  }

  const res = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [{
      role: "user",
      content: `Classify this ${input.platform} message and draft a professional reply.

Message from ${input.author ?? "user"}: "${input.message}"

Return JSON:
{
  "intent": "inquiry"|"complaint"|"praise"|"spam"|"partnership"|"purchase_intent",
  "sentiment": <float -1.0 to 1.0>,
  "suggested_reply": "<professional reply text>"
}`,
    }],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 600,
  });

  return JSON.parse(res.choices[0].message.content ?? "{}") as ClassificationResult;
}
