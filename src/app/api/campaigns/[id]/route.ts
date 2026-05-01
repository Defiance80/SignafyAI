import { z } from "zod";
import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse, sanitizeText } from "@/lib/utils";

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["draft","active","paused","completed"]).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
  budget_spent: z.number().min(0).optional(),
  channels: z.array(z.string()).max(10).optional(),
  goal: z.enum(["awareness","engagement","leads","conversions"]).optional().nullable(),
  target_audience: z.string().max(1000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);
  if (ctx.role === "viewer") return errorResponse("Insufficient permissions", 403);

  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ id, ...parsed.data });

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.name) update.name = sanitizeText(parsed.data.name);

  const { data, error } = await db.from("campaigns").update(update).eq("id", id).eq("org_id", ctx.org.id).select().single();
  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Campaign not found", 404);
  return jsonResponse(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);
  if (!["owner","admin"].includes(ctx.role)) return errorResponse("Insufficient permissions", 403);

  const { id } = await params;
  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ deleted: true });

  const { error } = await db.from("campaigns").delete().eq("id", id).eq("org_id", ctx.org.id);
  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ deleted: true });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const db = getSupabaseServiceClient();
  if (!db) return errorResponse("Not available in demo mode", 503);

  const [campaignRes, contentRes] = await Promise.all([
    db.from("campaigns").select("*").eq("id", id).eq("org_id", ctx.org.id).single(),
    db.from("campaign_content").select("*, content_pieces(*)").eq("campaign_id", id),
  ]);

  if (!campaignRes.data) return errorResponse("Campaign not found", 404);
  return jsonResponse({ campaign: campaignRes.data, content: contentRes.data ?? [] });
}
