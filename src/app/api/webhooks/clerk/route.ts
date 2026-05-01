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

    const { error } = await db.from("users").upsert({
      clerk_id: clerkId,
      email,
      full_name: `${firstName} ${lastName}`.trim() || null,
      avatar_url: avatarUrl,
    }, { onConflict: "clerk_id" });

    if (error) {
      console.error("[clerk-webhook] upsert user failed:", error.message);
      return errorResponse("Failed to sync user", 500);
    }

    // On new user creation, create a default org + membership
    if (type === "user.created") {
      const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
      const { data: user } = await db.from("users").select("id").eq("clerk_id", clerkId).single();

      if (user) {
        const { data: org } = await db.from("organizations").insert({
          name: `${firstName || email}'s Workspace`,
          slug: `${slug}-${Date.now()}`,
          owner_id: user.id,
          plan: "starter",
          subscription_status: "trialing",
          limits_leads_mo: 100,   // Starter limits
          limits_content_mo: 50,
        }).select().single();

        if (org) {
          await db.from("org_members").insert({
            org_id: org.id,
            user_id: user.id,
            role: "owner",
          });

          // Create default brand voice
          await db.from("brand_voices").insert({
            org_id: org.id,
            name: "Default",
            tone: "professional",
            is_default: true,
          });
        }
      }
    }
  }

  if (type === "user.deleted") {
    const clerkId = data.id as string;
    // Soft delete — remove clerk_id reference but keep org data for billing continuity
    await db.from("users").delete().eq("clerk_id", clerkId);
  }

  return jsonResponse({ received: true });
}
