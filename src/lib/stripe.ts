import Stripe from "stripe";
import type { Plan } from "./supabase/types";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// Price IDs — set these in your .env after creating products in Stripe dashboard
export const PRICE_IDS: Record<Plan, string | undefined> = {
  free:    undefined,
  starter: process.env.STRIPE_PRICE_STARTER,  // $49/mo
  pro:     process.env.STRIPE_PRICE_PRO,       // $149/mo
  agency:  process.env.STRIPE_PRICE_AGENCY,    // $399/mo
};

export async function createCheckoutSession(
  orgId: string,
  plan: Plan,
  userEmail: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const priceId = PRICE_IDS[plan];
  if (!priceId) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { org_id: orgId, plan },
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { org_id: orgId, plan },
    },
  });

  return { url: session.url! };
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

export function constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event | null {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return null;

  try {
    return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return null;
  }
}
