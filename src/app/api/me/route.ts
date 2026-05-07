import { getOrgContext, getSupabaseServiceClient, DEMO_ORG_CONTEXT, DEMO_USER_ID } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";

export async function GET(request: Request) {
  const ctx = await getOrgContext(request);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const db = getSupabaseServiceClient();

  let userName = "User";
  let userEmail = "";
  let avatarUrl: string | null = null;

  if (db && ctx.userId !== DEMO_USER_ID) {
    const { data: user } = await db
      .from("users")
      .select("full_name, email, avatar_url")
      .eq("clerk_id", ctx.userId)
      .maybeSingle();
    userName = user?.full_name ?? "User";
    userEmail = user?.email ?? "";
    avatarUrl = user?.avatar_url ?? null;
  } else if (ctx === DEMO_ORG_CONTEXT) {
    userName = "Demo User";
    userEmail = "demo@signafyai.com";
  }

  return jsonResponse({
    user: { name: userName, email: userEmail, avatar_url: avatarUrl },
    org: {
      id: ctx.org.id,
      name: ctx.org.name,
      plan: ctx.org.plan,
      subscription_status: ctx.org.subscription_status,
      usage_leads_mo: ctx.org.usage_leads_mo,
      limits_leads_mo: ctx.org.limits_leads_mo,
      usage_content_mo: ctx.org.usage_content_mo,
      limits_content_mo: ctx.org.limits_content_mo,
      stripe_customer_id: ctx.org.stripe_customer_id,
    },
    role: ctx.role,
  });
}
