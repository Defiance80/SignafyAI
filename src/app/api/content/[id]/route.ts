import { z } from "zod";
import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse, sanitizeText } from "@/lib/utils";

const UpdateSchema = z.object({
  body: z.string().min(1).max(20000).optional(),
  status: z.enum(["draft","approved","scheduled","published"]).optional(),
  scheduled_at: z.string().datetime().optional().nullable(),
  prompt: z.string().max(2000).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ id, ...parsed.data });

  const update: Record<string, unknown> = {};
  if (parsed.data.body !== undefined) {
    const sanitized = sanitizeText(parsed.data.body, 20000);
    update.body = sanitized;
    update.char_count = sanitized.length;
  }
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.scheduled_at !== undefined) update.scheduled_at = parsed.data.scheduled_at;
  if (parsed.data.prompt !== undefined) update.prompt = sanitizeText(parsed.data.prompt);

  const { data, error } = await db
    .from("content_pieces")
    .update(update)
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Content not found", 404);

  return jsonResponse(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  if (ctx.role === "viewer") return errorResponse("Insufficient permissions", 403);

  const { id } = await params;
  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ deleted: true });

  const { error } = await db
    .from("content_pieces")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.org.id);

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ deleted: true });
}
