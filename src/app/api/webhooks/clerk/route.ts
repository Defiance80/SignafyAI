import { Webhook } from "svix";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";

/**
 * Clerk webhook — syncs user records to Supabase on signup/update/delete.
 * Configure in Clerk Dashboard → Webhooks → add this URL.
 * Events: user.created, user.updated, user.deleted
 */
export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[clerk-webhook] CLERK_WEBHOOK_SECRET not set — rejecting");
    return errorResponse("Webhook not configured", 503);
  }

  const payload = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(secret);
    event = wh.verify(payload, headers) as typeof event;
  } catch {
    return errorResponse("Invalid webhook signature", 401);
  }

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ received: true });

  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const clerkId = data.id as string;
    const email = (data.email_addresses as Array<{ email_address: string }>)?.[0]?.email_address ?? "";
    const firstName = (data.first_name as string) ?? "";
    const lastName = (data.last_name as string) ?? "";
    const avatarUrl = (data.image_url as string) ?? null;

    // Sync user record. account_type defaults to "customer" — staff/vendor are
    // set explicitly by admins. Org creation happens in the onboarding flow.
    const { error } = await db.from("users").upsert({
      clerk_id: clerkId,
      email,
      full_name: `${firstName} ${lastName}`.trim() || null,
      avatar_url: avatarUrl,
      ...(type === "user.created" ? { account_type: "customer" } : {}),
    }, { onConflict: "clerk_id" });

    if (error) {
      console.error("[clerk-webhook] upsert user failed:", error.message);
      return errorResponse("Failed to sync user", 500);
    }
  }

  if (type === "user.deleted") {
    const clerkId = data.id as string;
    // Soft delete — remove clerk_id reference but keep org data for billing continuity
    await db.from("users").delete().eq("clerk_id", clerkId);
  }

  return jsonResponse({ received: true });
}
