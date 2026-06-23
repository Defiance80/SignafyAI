import { requireOrgContext, getSupabaseServiceClient, DEMO_ORG_ID } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";

export interface SocialSignal {
  id: string;
  org_id: string;
  run_id: string | null;
  source: string | null;
  topic: string | null;
  question: string;
  sentiment: string | null;
  signal_type: string | null;
  location: string | null;
  source_url: string | null;
  relevance_score: number;
  engagement_hint: string | null;
  created_at: string;
}

const DEMO_SIGNALS: SocialSignal[] = [
  { id: "s1", org_id: DEMO_ORG_ID, run_id: null, source: "reddit", topic: "Body Contouring", question: "Has anyone done CoolSculpting in Phoenix? I've been looking at it for 3 months and still can't decide between that and Emsculpt. The price difference is huge but I'm not sure if the results are worth it.", sentiment: "neutral", signal_type: "question", location: "Phoenix, AZ", source_url: "https://reddit.com/r/phoenix", relevance_score: 92, engagement_hint: "847 upvotes", created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: "s2", org_id: DEMO_ORG_ID, run_id: null, source: "youtube", topic: "MedSpa", question: "Why does every MedSpa make you feel judged when you ask about pricing? I just want to know what things cost without a consultation first.", sentiment: "frustrated", signal_type: "complaint", location: "Los Angeles, CA", source_url: "https://youtube.com/watch?v=demo", relevance_score: 88, engagement_hint: "312 comments", created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "s3", org_id: DEMO_ORG_ID, run_id: null, source: "reddit", topic: "AI Marketing", question: "Is anyone actually seeing ROI from AI marketing tools? We've spent $800/month for 6 months and I'm struggling to attribute any real results to it.", sentiment: "frustrated", signal_type: "complaint", location: null, source_url: "https://reddit.com/r/smallbusiness", relevance_score: 91, engagement_hint: "1.2k upvotes", created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: "s4", org_id: DEMO_ORG_ID, run_id: null, source: "linkedin", topic: "MedSpa Operations", question: "We're at 37% no-show rate for Botox appointments this month. It's absolutely killing our revenue. Anyone found anything that actually works besides charging deposits?", sentiment: "frustrated", signal_type: "complaint", location: null, source_url: "https://linkedin.com", relevance_score: 95, engagement_hint: "89 comments, 234 likes", created_at: new Date(Date.now() - 14400000).toISOString() },
  { id: "s5", org_id: DEMO_ORG_ID, run_id: null, source: "reddit", topic: "Local Business", question: "What are the best hidden gem businesses in Temecula? I moved here 6 months ago and still feel like I'm missing out on the good local spots.", sentiment: "excited", signal_type: "question", location: "Temecula, CA", source_url: "https://reddit.com/r/temecula", relevance_score: 78, engagement_hint: "156 upvotes", created_at: new Date(Date.now() - 21600000).toISOString() },
  { id: "s6", org_id: DEMO_ORG_ID, run_id: null, source: "youtube", topic: "Body Contouring", question: "I'm ready to book my first CoolSculpting session but I don't know how to choose a reputable clinic. What should I look for?", sentiment: "positive", signal_type: "buying_intent", location: "San Diego, CA", source_url: "https://youtube.com", relevance_score: 97, engagement_hint: "45 comments", created_at: new Date(Date.now() - 28800000).toISOString() },
];

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "25")));
  const search = url.searchParams.get("search");
  const runId = url.searchParams.get("run_id");
  const source = url.searchParams.get("source");
  const signalType = url.searchParams.get("signal_type");
  const sentiment = url.searchParams.get("sentiment");

  const db = getSupabaseServiceClient();
  if (!db) {
    return jsonResponse({ data: DEMO_SIGNALS, total: DEMO_SIGNALS.length, page: 1, per_page: 25 });
  }

  let query = db
    .from("social_signals")
    .select("*", { count: "exact" })
    .eq("org_id", ctx.org.id)
    .order("relevance_score", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (search) query = query.or(`question.ilike.%${search}%,topic.ilike.%${search}%`);
  if (runId) query = query.eq("run_id", runId);
  if (source) query = query.eq("source", source);
  if (signalType) query = query.eq("signal_type", signalType);
  if (sentiment) query = query.eq("sentiment", sentiment);

  const { data, error, count } = await query;
  if (error) {
    return jsonResponse({ data: DEMO_SIGNALS, total: DEMO_SIGNALS.length, page: 1, per_page: 25 });
  }

  return jsonResponse({
    data: (data ?? []) as SocialSignal[],
    total: count ?? 0,
    page,
    per_page: perPage,
  });
}
