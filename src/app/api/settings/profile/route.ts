import { z } from "zod";
import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse, sanitizeText } from "@/lib/utils";

const ProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  org_name: z.string().min(1).max(200).optional(),
});

export async function PATCH(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);
  }

  const { name, org_name } = parsed.data;
  if (!name && !org_name) return errorResponse("Nothing to update", 400);

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ ok: true });

  if (name && ctx.userId) {
    const { error } = await db.from("users")
      .update({ name: sanitizeText(name) })
      .eq("clerk_id", ctx.userId);
    if (error) return errorResponse(error.message, 500);
  }

  if (org_name) {
    const { error } = await db.from("organizations")
      .update({ name: sanitizeText(org_name) })
      .eq("id", ctx.org.id);
    if (error) return errorResponse(error.message, 500);
  }

  return jsonResponse({ ok: true });
}
