import { z } from "zod";
import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse, sanitizeText } from "@/lib/utils";

const CampaignSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(["draft","active","paused","completed"]).default("draft"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  budget: z.number().min(0).max(10_000_000).optional().nullable(),
  channels: z.array(z.string()).max(10).default([]),
  goal: z.enum(["awareness","engagement","leads","conversions"]).optional().nullable(),
  target_audience: z.string().max(1000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);
  if (ctx.role === "viewer") return errorResponse("Insufficient permissions", 403);

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = CampaignSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);

  const db = getSupabaseServiceClient();
  if (!db) {
    return jsonResponse({ id: crypto.randomUUID(), org_id: ctx.org.id, ...parsed.data, budget_spent: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, 201);
  }

  const { data, error } = await db.from("campaigns").insert({
    org_id: ctx.org.id,
    name: sanitizeText(parsed.data.name),
    status: parsed.data.status,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    budget: parsed.data.budget,
    channels: parsed.data.channels,
    goal: parsed.data.goal,
    target_audience: parsed.data.target_audience ? sanitizeText(parsed.data.target_audience) : null,
    notes: parsed.data.notes ? sanitizeText(parsed.data.notes) : null,
    budget_spent: 0,
  }).select().single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data, 201);
}

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ data: [], total: 0 });

  let query = db.from("campaigns").select("*", { count: "exact" }).eq("org_id", ctx.org.id).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return errorResponse(error.message, 500);

  return jsonResponse({ data, total: count ?? 0 });
}
