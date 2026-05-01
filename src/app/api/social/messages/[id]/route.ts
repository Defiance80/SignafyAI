import { z } from "zod";
import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { triggerSocialReply } from "@/lib/n8n";
import { errorResponse, jsonResponse, sanitizeText, generateId } from "@/lib/utils";

const ReplySchema = z.object({
  body: z.string().min(1).max(5000),
  approve_and_send: z.boolean().default(false),
});

const UpdateSchema = z.object({
  is_read: z.boolean().optional(),
  status: z.enum(["pending","replied","dismissed","escalated"]).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const url = new URL(request.url);
  const action = url.pathname.endsWith("/reply") ? "reply" : "update";

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }

  if (action === "reply") {
    const parsed = ReplySchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);

    const db = getSupabaseServiceClient();
    const replyId = generateId();

    if (!db) {
      return jsonResponse({ id: replyId, status: "draft", body: parsed.data.body });
    }

    // Verify message ownership
    const { data: msg } = await db.from("social_messages").select("*").eq("id", id).eq("org_id", ctx.org.id).single();
    if (!msg) return errorResponse("Message not found", 404);

    // Create reply record
    const { data: reply, error } = await db.from("social_replies").insert({
      id: replyId,
      message_id: id,
      org_id: ctx.org.id,
      body: sanitizeText(parsed.data.body, 5000),
      status: parsed.data.approve_and_send ? "approved" : "draft",
    }).select().single();

    if (error) return errorResponse(error.message, 500);

    // If approved and send requested, trigger n8n to post the reply
    if (parsed.data.approve_and_send) {
      await triggerSocialReply({
        run_id: generateId(),
        org_id: ctx.org.id,
        message_id: id,
        reply_id: replyId,
        reply_body: parsed.data.body,
        platform: msg.platform,
        account_id: msg.account_id,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`,
      });

      // Mark original message as replied
      await db.from("social_messages").update({ status: "replied", is_read: true }).eq("id", id);
    }

    return jsonResponse(reply, 201);
  }

  return errorResponse("Unknown action", 400);
}

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

  const { data, error } = await db
    .from("social_messages")
    .update(parsed.data)
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Message not found", 404);
  return jsonResponse(data);
}
