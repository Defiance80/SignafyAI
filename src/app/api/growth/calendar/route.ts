import { requireOrgContext, getSupabaseServiceClient, DEMO_ORG_ID } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";

export interface CalendarItem {
  id: string;
  org_id: string;
  blueprint_id: string | null;
  opportunity_id: string | null;
  title: string;
  format: string | null;
  platform: string | null;
  status: string;
  signal_type: string | null;
  growth_score: number;
  trend_score: number;
  lead_score: number;
  scheduled_date: string | null;
  notes: string | null;
  created_at: string;
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

const DEMO_CALENDAR: CalendarItem[] = [
  { id: "c1", org_id: DEMO_ORG_ID, blueprint_id: null, opportunity_id: "o1", title: "CoolSculpting vs Emsculpt — Honest Comparison Reel", format: "reel", platform: "instagram", status: "planned", signal_type: "question", growth_score: 91, trend_score: 88, lead_score: 91, scheduled_date: daysFromNow(1), notes: "Use hook: 'I tried both so you don't have to'", created_at: new Date().toISOString() },
  { id: "c2", org_id: DEMO_ORG_ID, blueprint_id: null, opportunity_id: "o2", title: "How We Cut No-Shows From 38% to 4% — LinkedIn Article", format: "blog", platform: "linkedin", status: "planned", signal_type: "complaint", growth_score: 87, trend_score: 72, lead_score: 95, scheduled_date: daysFromNow(3), notes: null, created_at: new Date().toISOString() },
  { id: "c3", org_id: DEMO_ORG_ID, blueprint_id: null, opportunity_id: "o3", title: "5 Hidden Gem Spots in [City] You're Missing", format: "reel", platform: "tiktok", status: "planned", signal_type: "trend", growth_score: 83, trend_score: 96, lead_score: 70, scheduled_date: daysFromNow(5), notes: "Film at local spots this weekend", created_at: new Date().toISOString() },
  { id: "c4", org_id: DEMO_ORG_ID, blueprint_id: null, opportunity_id: "o4", title: "AI Marketing ROI Breakdown: 6-Month Honest Review", format: "blog", platform: "linkedin", status: "planned", signal_type: "question", growth_score: 79, trend_score: 91, lead_score: 88, scheduled_date: daysFromNow(7), notes: null, created_at: new Date().toISOString() },
  { id: "c5", org_id: DEMO_ORG_ID, blueprint_id: null, opportunity_id: "o1", title: "Body Contouring FAQ — 10 Questions Answered", format: "carousel", platform: "instagram", status: "planned", signal_type: "question", growth_score: 88, trend_score: 85, lead_score: 89, scheduled_date: daysFromNow(10), notes: null, created_at: new Date().toISOString() },
  { id: "c6", org_id: DEMO_ORG_ID, blueprint_id: null, opportunity_id: "o2", title: "MedSpa Ops Podcast: Solving the No-Show Crisis", format: "podcast", platform: "youtube", status: "planned", signal_type: "complaint", growth_score: 85, trend_score: 70, lead_score: 92, scheduled_date: daysFromNow(14), notes: "Interview a front desk ops expert", created_at: new Date().toISOString() },
];

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const days = Math.min(90, Math.max(7, parseInt(url.searchParams.get("days") ?? "30")));
  const platform = url.searchParams.get("platform");
  const status = url.searchParams.get("status");

  const db = getSupabaseServiceClient();
  if (!db) {
    return jsonResponse({ data: DEMO_CALENDAR, total: DEMO_CALENDAR.length, days });
  }

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  let query = db
    .from("content_calendar")
    .select("*", { count: "exact" })
    .eq("org_id", ctx.org.id)
    .lte("scheduled_date", endDate.toISOString().split("T")[0])
    .order("scheduled_date", { ascending: true });

  if (platform) query = query.eq("platform", platform);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) {
    return jsonResponse({ data: DEMO_CALENDAR, total: DEMO_CALENDAR.length, days });
  }

  return jsonResponse({ data: (data ?? []) as CalendarItem[], total: count ?? 0, days });
}

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => ({})) as Partial<CalendarItem>;
  if (!body.title?.trim()) return errorResponse("title required", 400);

  const db = getSupabaseServiceClient();
  if (!db) return errorResponse("Database not configured", 503);

  const { data, error } = await db
    .from("content_calendar")
    .insert({ ...body, org_id: ctx.org.id })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data, 201);
}

export async function PATCH(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return errorResponse("id required", 400);

  const body = await request.json().catch(() => ({}));
  const db = getSupabaseServiceClient();
  if (!db) return errorResponse("Database not configured", 503);

  const { data, error } = await db
    .from("content_calendar")
    .update(body)
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data);
}
