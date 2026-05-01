import { z } from "zod";
import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse, sanitizeText } from "@/lib/utils";

const UpdateLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  company: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  status: z.enum(["new","contacted","qualified","converted","lost"]).optional(),
  industry: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  score: z.number().int().min(0).max(100).optional(),
});

// ─── PATCH /api/leads/[id] ────────────────────────────────────────────────────
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = UpdateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);
  }

  const db = getSupabaseServiceClient();
  if (!db) {
    return jsonResponse({ id, ...parsed.data, updated_at: new Date().toISOString() });
  }

  // Verify ownership before update
  const { data: existing } = await db
    .from("leads")
    .select("id, org_id, status")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .single();

  if (!existing) return errorResponse("Lead not found", 404);

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.notes) update.notes = sanitizeText(parsed.data.notes);

  const { data, error } = await db
    .from("leads")
    .update({ ...update, last_activity: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  // Log status change
  if (parsed.data.status && parsed.data.status !== existing.status) {
    await db.from("lead_activities").insert({
      lead_id: id,
      org_id: ctx.org.id,
      type: "status_changed",
      description: `Status changed from ${existing.status} to ${parsed.data.status}`,
      metadata: { from: existing.status, to: parsed.data.status },
    });
  }

  if (parsed.data.notes) {
    await db.from("lead_activities").insert({
      lead_id: id,
      org_id: ctx.org.id,
      type: "note_added",
      description: parsed.data.notes.slice(0, 200),
    });
  }

  return jsonResponse(data);
}

// ─── DELETE /api/leads/[id] ───────────────────────────────────────────────────
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const { id } = await params;

  if (ctx.role === "viewer") {
    return errorResponse("Insufficient permissions", 403);
  }

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ deleted: true });

  const { error } = await db
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.org.id);

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ deleted: true });
}

// ─── GET /api/leads/[id] — lead detail + activity timeline ───────────────────
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const db = getSupabaseServiceClient();

  if (!db) {
    return jsonResponse({
      lead: { id, name: "Demo Lead" },
      activities: [],
    });
  }

  const [leadRes, activitiesRes] = await Promise.all([
    db.from("leads").select("*").eq("id", id).eq("org_id", ctx.org.id).single(),
    db.from("lead_activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }).limit(50),
  ]);

  if (leadRes.error || !leadRes.data) return errorResponse("Lead not found", 404);

  return jsonResponse({
    lead: leadRes.data,
    activities: activitiesRes.data ?? [],
  });
}
