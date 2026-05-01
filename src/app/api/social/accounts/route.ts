import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const db = getSupabaseServiceClient();
  if (!db) {
    return jsonResponse({
      data: [
        { id: "1", platform: "instagram", account_name: "@signafyai", is_active: true },
        { id: "2", platform: "linkedin", account_name: "SignafyAI", is_active: true },
        { id: "3", platform: "tiktok", account_name: "@signafyai", is_active: true },
      ],
    });
  }

  const { data, error } = await db
    .from("social_accounts")
    .select("id, platform, account_name, avatar_url, is_active, token_expires, created_at")
    .eq("org_id", ctx.org.id)
    .order("created_at");

  if (error) return errorResponse(error.message, 500);

  // Never return tokens to client
  return jsonResponse({ data });
}
