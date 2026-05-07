import { getOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";

export async function GET(request: Request) {
  const ctx = await getOrgContext(request);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const db = getSupabaseServiceClient();
  if (!db) {
    return jsonResponse({
      stats: { leads_total: 2847, leads_week: 124, content_total: 184, content_week: 31 },
      recent_runs: DEMO_RUNS,
      org: { name: ctx.org.name, plan: ctx.org.plan },
    });
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [leadsTotal, leadsWeek, contentTotal, contentWeek, runs] = await Promise.all([
    db.from("leads").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id),
    db.from("leads").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id).gte("created_at", weekAgo),
    db.from("content_pieces").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id),
    db.from("content_pieces").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id).gte("created_at", weekAgo),
    db.from("workflow_runs").select("id, workflow_type, status, started_at, completed_at, input_params, output_summary").eq("org_id", ctx.org.id).order("started_at", { ascending: false }).limit(5),
  ]);

  return jsonResponse({
    stats: {
      leads_total: leadsTotal.count ?? 0,
      leads_week: leadsWeek.count ?? 0,
      content_total: contentTotal.count ?? 0,
      content_week: contentWeek.count ?? 0,
    },
    recent_runs: runs.data ?? [],
    org: { name: ctx.org.name, plan: ctx.org.plan },
  });
}

const DEMO_RUNS = [
  { id: "wf-001", workflow_type: "lead_discovery", status: "complete", started_at: new Date(Date.now() - 2 * 60000).toISOString(), output_summary: { leads_found: 43 } },
  { id: "wf-002", workflow_type: "content_generation", status: "complete", started_at: new Date(Date.now() - 15 * 60000).toISOString(), output_summary: null },
  { id: "wf-003", workflow_type: "seo_research", status: "running", started_at: new Date().toISOString(), output_summary: null },
  { id: "wf-004", workflow_type: "social_classification", status: "complete", started_at: new Date(Date.now() - 3600000).toISOString(), output_summary: null },
  { id: "wf-005", workflow_type: "lead_discovery", status: "failed", started_at: new Date(Date.now() - 2 * 3600000).toISOString(), output_summary: null },
];
