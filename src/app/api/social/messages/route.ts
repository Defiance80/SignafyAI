import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const platform = url.searchParams.get("platform");
  const unreadOnly = url.searchParams.get("unread") === "true";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const perPage = Math.min(50, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "20")));

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ data: [], total: 0, unread_count: 3 });

  let query = db
    .from("social_messages")
    .select("*, social_replies(*)", { count: "exact" })
    .eq("org_id", ctx.org.id)
    .order("received_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (status) query = query.eq("status", status);
  if (platform) query = query.eq("platform", platform);
  if (unreadOnly) query = query.eq("is_read", false);

  const { data, error, count } = await query;
  if (error) return errorResponse(error.message, 500);

  // Get unread count
  const { count: unreadCount } = await db
    .from("social_messages")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ctx.org.id)
    .eq("is_read", false);

  return jsonResponse({ data, total: count ?? 0, unread_count: unreadCount ?? 0, page, per_page: perPage });
}
