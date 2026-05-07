import { z } from "zod";
import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { triggerSocialReply } from "@/lib/n8n";
import { errorResponse, jsonResponse, sanitizeText, generateId } from "@/lib/utils";

const Schema = z.object({
  body: z.string().min(1).max(5000),
  approve_and_send: z.boolean().default(false),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);

  const db = getSupabaseServiceClient();
  const replyId = generateId();

  if (!db) {
    return jsonResponse({ id: replyId, status: parsed.data.approve_and_send ? "sent" : "draft", body: parsed.data.body }, 201);
  }

  const { data: msg } = await db
    .from("social_messages")
    .select("*")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .single();
  if (!msg) return errorResponse("Message not found", 404);

  const { data: reply, error } = await db.from("social_replies").insert({
    id: replyId,
    message_id: id,
    org_id: ctx.org.id,
    body: sanitizeText(parsed.data.body, 5000),
    status: parsed.data.approve_and_send ? "approved" : "draft",
  }).select().single();

  if (error) return errorResponse(error.message, 500);

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
    await db.from("social_messages")
      .update({ status: "replied", is_read: true })
      .eq("id", id);
  }

  return jsonResponse(reply, 201);
}
