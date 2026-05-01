import { constructWebhookEvent } from "@/lib/stripe";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import type { Plan } from "@/lib/supabase/types";

const PLAN_LIMITS: Record<Plan, { leads: number; content: number }> = {
  starter: { leads: 100, content: 50 },
  pro:     { leads: 500, content: 200 },
  agency:  { leads: 2000, content: 1000 },
};

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
      const session = event.data.object as { metadata?: { org_id?: string }; subscription?: string; customer?: string };
      const orgId = session.metadata?.org_id;
      if (!orgId) break;

      await db.from("organizations").update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        subscription_status: "active",
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
      const plan: Plan = PRICE_TO_PLAN[priceId] ?? "starter";
      const limits = PLAN_LIMITS[plan];

      await db.from("organizations").update({
        subscription_status: sub.status as string,
        plan,
        limits_leads_mo: limits.leads,
        limits_content_mo: limits.content,
        stripe_subscription_id: sub.id,
      }).eq("id", orgId);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as { metadata?: { org_id?: string } };
      const orgId = sub.metadata?.org_id;
      if (!orgId) break;

      await db.from("organizations").update({
        subscription_status: "canceled",
        plan: "starter",
        limits_leads_mo: PLAN_LIMITS.starter.leads,
        limits_content_mo: PLAN_LIMITS.starter.content,
      }).eq("id", orgId);
      break;
    }

    case "invoice.payment_failed": {
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
