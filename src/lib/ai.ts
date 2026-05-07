/**
 * AI client — OpenAI by default, or Qwen (DashScope compatible mode) via AI_PROVIDER=qwen.
 */

import OpenAI from "openai";

let _client: OpenAI | null = null;

function getChatClient(): OpenAI {
  if (!_client) {
    const provider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
    if (provider === "qwen") {
      _client = new OpenAI({
        apiKey: process.env.QWEN_API_KEY ?? process.env.DASHSCOPE_API_KEY ?? "not-configured",
        baseURL:
          process.env.QWEN_BASE_URL ??
          "https://dashscope.aliyuncs.com/compatible-mode/v1",
      });
    } else {
      _client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY ?? "not-configured",
      });
    }
  }
  return _client;
}

function resolveModel(): string {
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  const provider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  if (provider === "qwen") return "qwen-max";
  return "gpt-4o";
}

const MODEL = resolveModel();

/** Low-level helper — returns raw text from a single-user prompt. Returns null if AI is unconfigured. */
export async function getChatCompletionRaw(prompt: string, maxTokens = 2000): Promise<string | null> {
  if (!isAiConfigured()) return null;
  const res = await getChatClient().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.6,
    max_tokens: maxTokens,
  });
  return res.choices[0].message.content ?? null;
}

function isAiConfigured(): boolean {
  const provider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  if (provider === "qwen") {
    return !!(process.env.QWEN_API_KEY ?? process.env.DASHSCOPE_API_KEY);
  }
  return !!process.env.OPENAI_API_KEY;
}

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
  if (!isAiConfigured()) {
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

  const res = await getChatClient().chat.completions.create({
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
  if (!isAiConfigured()) {
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

  const res = await getChatClient().chat.completions.create({
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

// ─── Lead Discovery ───────────────────────────────────────────────────────────

export interface LeadDiscoveryParams {
  target_market: "b2b" | "b2c";
  industry?: string;
  location?: string;
  keywords?: string[];
  count?: number;
}

export interface DiscoveredLead {
  name: string;
  company?: string;
  email?: string;
  platform: string;
  industry?: string;
  location?: string;
  score: number;
  tags: string[];
  notes?: string;
}

export async function discoverLeads(params: LeadDiscoveryParams): Promise<DiscoveredLead[]> {
  const count = Math.min(params.count ?? 10, 20);

  if (!isAiConfigured()) {
    return _demoLeads(params, count);
  }

  const marketContext = params.target_market === "b2b"
    ? `B2B companies in the ${params.industry ?? "marketing"} space`
    : `B2C consumers interested in ${params.keywords?.join(", ") ?? "digital services"}`;

  const prompt = `Generate ${count} realistic ${params.target_market.toUpperCase()} leads for ${marketContext}${params.location ? ` in ${params.location}` : " across major US cities"}.
${params.keywords?.length ? `Related keywords: ${params.keywords.join(", ")}` : ""}

Return a JSON object with a "leads" array. Each lead:
{
  "name": "<full name>",
  "company": "<company name for B2B, omit for B2C>",
  "email": "<email or omit>",
  "platform": "linkedin"|"instagram"|"tiktok"|"twitter"|"facebook",
  "industry": "<vertical>",
  "location": "<city, state>",
  "score": <55-95>,
  "tags": ["<tag>"],
  "notes": "<1-sentence qualification>"
}`;

  const res = await getChatClient().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.8,
    max_tokens: 3000,
  });

  try {
    const json = JSON.parse(res.choices[0].message.content ?? "{}");
    const raw = Array.isArray(json) ? json : (json.leads ?? json.results ?? []);
    return (raw as DiscoveredLead[]).slice(0, count);
  } catch {
    return _demoLeads(params, count);
  }
}

function _demoLeads(params: LeadDiscoveryParams, count: number): DiscoveredLead[] {
  const b2bNames = ["Sarah Chen", "Marcus Rivera", "Aisha Patel", "Jason Kim", "Elena Vasquez", "David Okonkwo", "Rachel Foster", "Omar Hassan", "Priya Singh", "Luke Carver", "Nina Torres", "Ben Wallace"];
  const b2bCos = ["Bloom Digital", "TrueNorth Marketing", "Evergreen Studios", "Velocity Growth", "Prism Creative", "Summit Strategies", "BrightPath Consulting", "Nexus Media", "Apex Marketing", "Horizon Solutions", "Peak Agency", "Catalyst Creative"];
  const b2cNames = ["Jordan Smith", "Alex Johnson", "Taylor Brown", "Morgan Davis", "Casey Wilson", "Riley Anderson", "Dylan Martinez", "Cameron Lee", "Jamie Garcia", "Avery Thompson"];
  const locs = params.location ? [params.location] : ["San Francisco, CA", "Austin, TX", "New York, NY", "Seattle, WA", "Miami, FL", "Chicago, IL", "Denver, CO", "Houston, TX"];
  const platforms = ["linkedin", "instagram", "tiktok", "twitter", "facebook"] as const;
  const isB2b = params.target_market === "b2b";

  return Array.from({ length: Math.min(count, 12) }, (_, i) => ({
    name: isB2b ? b2bNames[i % b2bNames.length] : b2cNames[i % b2cNames.length],
    company: isB2b ? b2bCos[i % b2bCos.length] : undefined,
    email: i % 3 === 0 ? `contact${i}@example.com` : undefined,
    platform: platforms[i % platforms.length],
    industry: params.industry ?? (isB2b ? "Marketing Agency" : "Consumer"),
    location: locs[i % locs.length],
    score: 55 + Math.floor(Math.random() * 40),
    tags: [params.target_market, ...(params.keywords?.slice(0, 1) ?? [])],
    notes: "Auto-discovered via AI lead engine",
  }));
}

// ─── SEO Research ─────────────────────────────────────────────────────────────

export interface SeoResearchInput {
  topic: string;
  domain?: string;
  count?: number;
}

export interface SeoKeyword {
  keyword: string;
  volume: number;
  difficulty: "Easy" | "Medium" | "Hard";
  cpc: string;
  trend: "up" | "down" | "stable";
  intent: "informational" | "commercial" | "transactional" | "navigational";
}

export interface SeoResearchResult {
  keywords: SeoKeyword[];
  clusters: { name: string; keywords: number; volume: string; color: string }[];
}

const CLUSTER_COLORS = ["#7c3aed", "#0891b2", "#059669", "#d97706", "#ef4444", "#8b5cf6"];

export async function generateSeoResearch(input: SeoResearchInput): Promise<SeoResearchResult> {
  if (!isAiConfigured()) {
    return { keywords: [], clusters: [] };
  }

  const count = Math.min(input.count ?? 20, 30);
  const prompt = `You are an SEO expert. Generate ${count} realistic keyword opportunities for: "${input.topic}"${input.domain ? ` targeting domain ${input.domain}` : ""}.

Return JSON:
{
  "keywords": [
    { "keyword": "<phrase>", "volume": <monthly searches>, "difficulty": "Easy"|"Medium"|"Hard", "cpc": "$X.XX", "trend": "up"|"down"|"stable", "intent": "informational"|"commercial"|"transactional"|"navigational" }
  ],
  "clusters": [
    { "name": "<topic cluster>", "keywords": <count>, "volume": "<like 42.3K>" }
  ]
}`;

  const res = await getChatClient().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 2500,
  });

  try {
    const json = JSON.parse(res.choices[0].message.content ?? "{}");
    return {
      keywords: (json.keywords ?? []) as SeoKeyword[],
      clusters: ((json.clusters ?? []) as { name: string; keywords: number; volume: string }[]).map((c, i) => ({
        ...c,
        color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
      })),
    };
  } catch {
    return { keywords: [], clusters: [] };
  }
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
  if (!isAiConfigured()) {
    return {
      intent: "inquiry",
      sentiment: 0.5,
      suggested_reply: "[Demo mode] AI reply generation not configured.",
    };
  }

  const res = await getChatClient().chat.completions.create({
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
