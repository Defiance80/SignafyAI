"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createOrgForUser, resolveSupabaseUser, getSupabaseServiceClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe";
import type { Plan } from "@/lib/supabase/types";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

async function getClerkUser() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return userId;
}

async function alreadyOnboarded(clerkUserId: string): Promise<string | null> {
  const db = getSupabaseServiceClient();
  if (!db) return null;
  const { data: user } = await db.from("users").select("id").eq("clerk_id", clerkUserId).maybeSingle();
  if (!user) return null;
  const { data: member } = await db.from("org_members").select("org_id").eq("user_id", user.id).limit(1).maybeSingle();
  return member?.org_id ?? null;
}

/** Complete onboarding with the free plan — creates org, sets cookie, redirects. */
export async function chooseFreeAction() {
  const clerkUserId = await getClerkUser();

  // Idempotent: if they already have an org, just set the cookie and continue
  const existingOrgId = await alreadyOnboarded(clerkUserId);
  if (existingOrgId) {
    const jar = await cookies();
    jar.set("signafy_org_id", existingOrgId, COOKIE_OPTS);
    redirect("/dashboard");
  }

  const supaUserId = await resolveSupabaseUser(clerkUserId);
  if (!supaUserId) throw new Error("Failed to resolve user record");

  const orgId = await createOrgForUser(supaUserId, clerkUserId, "free");
  if (!orgId) throw new Error("Failed to create workspace");

  const jar = await cookies();
  jar.set("signafy_org_id", orgId, COOKIE_OPTS);
  redirect("/dashboard");
}

/** Start a paid plan — creates org (trialing), returns Stripe checkout URL. */
export async function choosePaidAction(plan: Exclude<Plan, "free">): Promise<{ url: string }> {
  const clerkUserId = await getClerkUser();

  const existingOrgId = await alreadyOnboarded(clerkUserId);
  if (existingOrgId) {
    const jar = await cookies();
    jar.set("signafy_org_id", existingOrgId, COOKIE_OPTS);
    return { url: "/dashboard" };
  }

  const supaUserId = await resolveSupabaseUser(clerkUserId);
  if (!supaUserId) throw new Error("Failed to resolve user record");

  // Create org in trialing state — Stripe webhook activates it on payment
  const orgId = await createOrgForUser(supaUserId, clerkUserId, plan);
  if (!orgId) throw new Error("Failed to create workspace");

  // Set org cookie now so the user lands on dashboard after Stripe redirects back
  const jar = await cookies();
  jar.set("signafy_org_id", orgId, COOKIE_OPTS);

  const db = getSupabaseServiceClient();
  const { data: user } = await db!.from("users").select("email").eq("id", supaUserId).single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await createCheckoutSession(
    orgId,
    plan,
    user?.email ?? "",
    `${appUrl}/dashboard?welcome=1`,
    `${appUrl}/onboarding`,
  );

  if (!session) {
    // Stripe not configured — activate immediately (dev/staging only)
    return { url: "/dashboard?welcome=1" };
  }

  return { url: session.url };
}
