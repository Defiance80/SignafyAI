import { requireOrgContext, getSupabaseServiceClient, DEMO_ORG_ID } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";

export interface GrowthOpportunity {
  id: string;
  org_id: string;
  run_id: string | null;
  title: string;
  description: string | null;
  topic: string | null;
  source: string | null;
  signal_count: number;
  audience_match: number;
  trend_score: number;
  competition_score: number;
  local_relevance: number;
  lead_potential: number;
  authority_potential: number;
  growth_score: number;
  content_formats: string[];
  hooks: string[];
  status: string;
  created_at: string;
}

const DEMO_OPPORTUNITIES: GrowthOpportunity[] = [
  {
    id: "o1", org_id: DEMO_ORG_ID, run_id: null,
    title: "CoolSculpting vs Emsculpt: Consumers Can't Decide",
    description: "127 Reddit posts and 43 YouTube comments this week comparing these two treatments. Most consumers are confused about which is better for their body type — creating a massive authority opportunity.",
    topic: "Body Contouring", source: "reddit,youtube", signal_count: 170,
    audience_match: 92, trend_score: 88, competition_score: 35, local_relevance: 60,
    lead_potential: 91, authority_potential: 85, growth_score: 91,
    content_formats: ["reel", "blog", "faq", "interview"],
    hooks: ["I tried both CoolSculpting AND Emsculpt — here's the honest truth", "The body contouring question no one is answering (until now)"],
    status: "new", created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "o2", org_id: DEMO_ORG_ID, run_id: null,
    title: "MedSpa Owners Venting About No-Shows on LinkedIn",
    description: "Business owners on LinkedIn are actively discussing 30-40% no-show rates. This pain point gets massive engagement and positions you as the authority with a solution.",
    topic: "MedSpa Operations", source: "linkedin", signal_count: 48,
    audience_match: 88, trend_score: 72, competition_score: 20, local_relevance: 40,
    lead_potential: 95, authority_potential: 88, growth_score: 87,
    content_formats: ["blog", "carousel", "podcast"],
    hooks: ["We cut our no-show rate from 38% to 4% — here's exactly how", "The dirty secret MedSpa owners won't talk about"],
    status: "new", created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "o3", org_id: DEMO_ORG_ID, run_id: null,
    title: "'Hidden Gem' Local Business Trend Surging",
    description: "Searches and posts about 'hidden gem [city] businesses' are up 340% on TikTok and Instagram this month. Massive opportunity for local authority content that drives both followers and local leads.",
    topic: "Local Discovery", source: "tiktok,instagram", signal_count: 89,
    audience_match: 75, trend_score: 96, competition_score: 55, local_relevance: 98,
    lead_potential: 70, authority_potential: 90, growth_score: 83,
    content_formats: ["reel", "carousel", "podcast"],
    hooks: ["5 hidden gem businesses in [City] you need to know about", "I found the best-kept secret in [City] and you're going to thank me"],
    status: "new", created_at: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: "o4", org_id: DEMO_ORG_ID, run_id: null,
    title: "Small Businesses Questioning AI Marketing ROI",
    description: "Reddit's r/smallbusiness is flooded with skeptical questions about AI marketing tools. 200+ discussions in 7 days — a massive authority opportunity for anyone who can answer with data.",
    topic: "AI Marketing", source: "reddit", signal_count: 200,
    audience_match: 94, trend_score: 91, competition_score: 70, local_relevance: 30,
    lead_potential: 88, authority_potential: 92, growth_score: 79,
    content_formats: ["blog", "faq", "interview", "reel"],
    hooks: ["I spent $5k on AI marketing tools so you don't have to", "Honest ROI breakdown: AI marketing for small businesses"],
    status: "new", created_at: new Date(Date.now() - 21600000).toISOString(),
  },
];

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "25")));
  const search = url.searchParams.get("search");
  const runId = url.searchParams.get("run_id");
  const status = url.searchParams.get("status");
  const minScore = parseInt(url.searchParams.get("min_score") ?? "0");

  const db = getSupabaseServiceClient();
  if (!db) {
    return jsonResponse({ data: DEMO_OPPORTUNITIES, total: DEMO_OPPORTUNITIES.length, page: 1, per_page: 25 });
  }

  let query = db
    .from("growth_opportunities")
    .select("*", { count: "exact" })
    .eq("org_id", ctx.org.id)
    .order("growth_score", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (search) query = query.or(`title.ilike.%${search}%,topic.ilike.%${search}%,description.ilike.%${search}%`);
  if (runId) query = query.eq("run_id", runId);
  if (status) query = query.eq("status", status);
  if (minScore > 0) query = query.gte("growth_score", minScore);

  const { data, error, count } = await query;
  if (error) {
    // Table might not exist yet — return demo data
    return jsonResponse({ data: DEMO_OPPORTUNITIES, total: DEMO_OPPORTUNITIES.length, page: 1, per_page: 25 });
  }

  return jsonResponse({
    data: (data ?? []) as GrowthOpportunity[],
    total: count ?? 0,
    page,
    per_page: perPage,
  });
}

export async function PATCH(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return errorResponse("id required", 400);

  const body = await request.json().catch(() => ({})) as { status?: string };
  const db = getSupabaseServiceClient();
  if (!db) return errorResponse("Database not configured", 503);

  const { data, error } = await db
    .from("growth_opportunities")
    .update({ status: body.status })
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data);
}
