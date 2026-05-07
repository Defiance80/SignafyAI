import { constructWebhookEvent } from "@/lib/stripe";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import { PLAN_LIMITS, type Plan } from "@/lib/supabase/types";

const PRICE_TO_PLAN: Record<string, Plan> = {
  [process.env.STRIPE_PRICE_STARTER ?? ""]: "starter",
  [process.env.STRIPE_PRICE_PRO ?? ""]: "pro",
  [process.env.STRIPE_PRICE_AGENCY ?? ""]: "agency",
};

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  const event = constructWebhookEvent(payload, signature);
  if (!event) return errorResponse("Invalid stripe webhook signature", 401);

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ received: true });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as {
        metadata?: { org_id?: string; plan?: string };
        subscription?: string;
        customer?: string;
      };
      const orgId = session.metadata?.org_id;
      if (!orgId) break;

      const plan = (session.metadata?.plan ?? "starter") as Plan;
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;

      await db.from("organizations").update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        subscription_status: "active",
        plan,
        limits_leads_mo: limits.leads_mo,
        limits_content_mo: limits.content_mo,
      }).eq("id", orgId);
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as {
        id: string;
        customer: string;
        status: string;
        metadata?: { org_id?: string };
        items: { data: Array<{ price: { id: string } }> };
      };

      const orgId = sub.metadata?.org_id;
      if (!orgId) break;

      const priceId = sub.items.data[0]?.price?.id ?? "";
      const plan: Plan = PRICE_TO_PLAN[priceId] ?? "free";
      const limits = PLAN_LIMITS[plan];

      await db.from("organizations").update({
        subscription_status: sub.status as string,
        plan,
        limits_leads_mo: limits.leads_mo,
        limits_content_mo: limits.content_mo,
        stripe_subscription_id: sub.id,
      }).eq("id", orgId);
      break;
    }

    case "customer.subscription.deleted": {
      // Subscription cancelled or payment failed beyond grace period → free plan
      const sub = event.data.object as { metadata?: { org_id?: string }; id: string };
      const orgId = sub.metadata?.org_id;
      if (!orgId) break;

      await db.from("organizations").update({
        subscription_status: "active",
        plan: "free",
        stripe_subscription_id: null,
        limits_leads_mo: PLAN_LIMITS.free.leads_mo,
        limits_content_mo: PLAN_LIMITS.free.content_mo,
      }).eq("id", orgId);
      break;
    }

    case "invoice.payment_failed": {
      // Mark past_due but keep current plan — subscription.deleted fires after grace period
      const invoice = event.data.object as { subscription?: string };
      if (!invoice.subscription) break;
      await db.from("organizations")
        .update({ subscription_status: "past_due" })
        .eq("stripe_subscription_id", invoice.subscription as string);
      break;
    }
  }

  return jsonResponse({ received: true });
}
