import { requireOrgContext } from "@/lib/supabase/server";
import { createPortalSession } from "@/lib/stripe";
import { errorResponse, jsonResponse } from "@/lib/utils";

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  if (!ctx.org.stripe_customer_id) {
    return errorResponse("No billing account found. Please subscribe to a plan first.", 400);
  }

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings`;
  const session = await createPortalSession(ctx.org.stripe_customer_id, returnUrl);

  if (!session) {
    return errorResponse("Stripe is not configured — billing unavailable", 503);
  }

  return jsonResponse({ url: session.url });
}
