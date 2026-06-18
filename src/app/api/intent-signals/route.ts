import { requireOrgContext, getSupabaseServiceClient, DEMO_ORG_ID } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import type { IntentSignal } from "@/lib/supabase/types";

const DEMO_SIGNALS: IntentSignal[] = [
  {
    id: "s1", org_id: DEMO_ORG_ID, run_id: null,
    source: "reddit", service: "CoolSculpting", industry: "Healthcare",
    question: "Anyone tried CoolSculpting in Murrieta? I've been looking into it for a while and want to know if there are any good clinics in the area that won't break the bank. I have a consultation next week but want to read real reviews first.",
    location: "Murrieta, CA",
    source_url: "https://reddit.com/r/CoolSculpting/comments/example",
    intent_score: 88, buying_stage: "Vendor Selection", urgency: "High",
    date_found: new Date(Date.now() - 7200000).toISOString(),
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "s2", org_id: DEMO_ORG_ID, run_id: null,
    source: "yelp", service: "Body Contouring", industry: "Healthcare",
    question: "Looking for a medspa that does body contouring near Temecula. Preferably one that offers financing options. Ready to book once I find the right place.",
    location: "Temecula, CA",
    source_url: null,
    intent_score: 94, buying_stage: "Ready To Buy", urgency: "High",
    date_found: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "s3", org_id: DEMO_ORG_ID, run_id: null,
    source: "reddit", service: "CoolSculpting", industry: "Healthcare",
    question: "What's the difference between CoolSculpting and Emsculpt? Trying to decide which one is better for love handles.",
    location: null,
    source_url: "https://reddit.com/r/beauty/comments/example2",
    intent_score: 62, buying_stage: "Comparison", urgency: "Medium",
    date_found: new Date(Date.now() - 14400000).toISOString(),
    created_at: new Date(Date.now() - 14400000).toISOString(),
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
  const stage = url.searchParams.get("stage");
  const urgency = url.searchParams.get("urgency");
  const sortBy = url.searchParams.get("sort") ?? "intent_score";
  const sortDir = url.searchParams.get("dir") === "asc" ? true : false;

  const db = getSupabaseServiceClient();
  if (!db) {
    return jsonResponse({ data: DEMO_SIGNALS, total: DEMO_SIGNALS.length, page: 1, per_page: 25 });
  }

  let query = db
    .from("intent_signals")
    .select("*", { count: "exact" })
    .eq("org_id", ctx.org.id)
    .order(sortBy, { ascending: sortDir })
    .range((page - 1) * perPage, page * perPage - 1);

  if (search) {
    query = query.or(`question.ilike.%${search}%,service.ilike.%${search}%,location.ilike.%${search}%`);
  }
  if (runId) query = query.eq("run_id", runId);
  if (stage) query = query.eq("buying_stage", stage);
  if (urgency) query = query.eq("urgency", urgency);

  const { data, error, count } = await query;
  if (error) return errorResponse(error.message, 500);

  return jsonResponse({
    data: data as IntentSignal[],
    total: count ?? 0,
    page,
    per_page: perPage,
  });
}
