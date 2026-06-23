/**
 * POST /api/growth/publish
 *
 * Publishes or schedules a post to a connected social account.
 * Saves to content_pieces table and triggers n8n social-post workflow.
 *
 * Body: {
 *   content: string           — post body text
 *   platform: string          — target platform
 *   account_id: string        — social_accounts.id
 *   calendar_item_id?: string — optional link back to calendar
 *   opportunity_id?: string   — optional link to opportunity
 *   scheduled_at?: string     — ISO datetime, null = post now
 *   hashtags?: string[]
 *   media_url?: string
 * }
 */

import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import { triggerSocialPost } from "@/lib/n8n";

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => ({})) as {
    content: string;
    platform: string;
    account_id: string;
    calendar_item_id?: string;
    opportunity_id?: string;
    scheduled_at?: string;
    hashtags?: string[];
    media_url?: string;
  };

  const { content, platform, account_id, calendar_item_id, opportunity_id, scheduled_at, hashtags = [], media_url } = body;

  if (!content?.trim()) return errorResponse("content is required", 400);
  if (!platform) return errorResponse("platform is required", 400);
  if (!account_id) return errorResponse("account_id is required", 400);

  const db = getSupabaseServiceClient();

  // ── Verify account belongs to this org ───────────────────────────────────
  if (db) {
    const { data: account, error } = await db
      .from("social_accounts")
      .select("id, platform, account_name, is_active")
      .eq("id", account_id)
      .eq("org_id", ctx.org.id)
      .single();

    if (error || !account) return errorResponse("Social account not found", 404);
    if (!account.is_active) return errorResponse("Social account is not connected", 400);
    if (account.platform !== platform) return errorResponse("Account platform mismatch", 400);
  }

  const isScheduled = !!scheduled_at;
  const runId = crypto.randomUUID();

  // ── Save to content_pieces ────────────────────────────────────────────────
  let contentPieceId: string | null = null;
  if (db) {
    const { data: piece } = await db.from("content_pieces").insert({
      org_id: ctx.org.id,
      type: "social_caption",
      platform,
      body: content,
      char_count: content.length,
      status: isScheduled ? "scheduled" : "approved",
      scheduled_at: scheduled_at ?? null,
      metadata: {
        account_id,
        calendar_item_id: calendar_item_id ?? null,
        opportunity_id: opportunity_id ?? null,
        hashtags,
        media_url: media_url ?? null,
        run_id: runId,
      },
    }).select("id").single();
    contentPieceId = piece?.id ?? null;

    // Update calendar item status if provided
    if (calendar_item_id) {
      await db.from("content_calendar")
        .update({ status: isScheduled ? "planned" : "in_progress" })
        .eq("id", calendar_item_id)
        .eq("org_id", ctx.org.id);
    }
  }

  // ── Trigger n8n social posting workflow ───────────────────────────────────
  const n8nResult = await triggerSocialPost({
    run_id: runId,
    org_id: ctx.org.id,
    platform,
    account_id,
    content,
    hashtags,
    media_url: media_url ?? null,
    scheduled_at: scheduled_at ?? null,
    content_piece_id: contentPieceId ?? "",
    calendar_item_id: calendar_item_id ?? null,
    callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`,
  });

  if (!n8nResult.ok && !db) {
    // No DB and no n8n — demo mode response
    return jsonResponse({
      status: "queued",
      run_id: runId,
      message: "Post queued. Connect n8n to enable live posting.",
      content_piece_id: null,
    });
  }

  return jsonResponse({
    status: isScheduled ? "scheduled" : "queued",
    run_id: runId,
    content_piece_id: contentPieceId,
    n8n_triggered: n8nResult.ok,
    message: n8nResult.ok
      ? (isScheduled ? `Scheduled for ${new Date(scheduled_at!).toLocaleString()}` : "Publishing now via n8n…")
      : "Saved — connect n8n social-post workflow to enable live publishing.",
  });
}
