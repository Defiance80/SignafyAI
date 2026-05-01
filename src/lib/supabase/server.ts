import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { OrgContext } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ─── Service-role client (bypasses RLS — use only in webhooks/admin routes) ──
export function getSupabaseServiceClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Anon client for server components (RLS enforced) ────────────────────────
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Demo org context (used when Supabase is not configured) ─────────────────
export const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000002";

export const DEMO_ORG_CONTEXT: OrgContext = {
  org: {
    id: DEMO_ORG_ID,
    name: "Acme Agency",
    slug: "acme-agency",
    owner_id: DEMO_USER_ID,
    plan: "pro",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: "active",
    usage_leads_mo: 127,
    usage_content_mo: 34,
    limits_leads_mo: 500,
    limits_content_mo: 200,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  userId: DEMO_USER_ID,
  role: "owner",
};

// ─── Session resolution ───────────────────────────────────────────────────────

/**
 * Resolves the org context from either Clerk JWT (production) or
 * demo cookie (development/preview). Returns null if unauthenticated.
 */
export async function getOrgContext(request: Request): Promise<OrgContext | null> {
  // Demo mode: check signafy_session cookie
  const cookieHeader = request.headers.get("cookie") ?? "";
  if (cookieHeader.includes("signafy_session=demo")) {
    return DEMO_ORG_CONTEXT;
  }

  // Production: resolve from Clerk JWT → look up org membership
  // TODO: wire Clerk auth() here when Clerk is activated
  // const { userId } = auth();
  // if (!userId) return null;
  // ... look up org_members record ...

  return null;
}

/** Convenience wrapper — throws a 401 Response if not authenticated. */
export async function requireOrgContext(request: Request): Promise<OrgContext> {
  const ctx = await getOrgContext(request);
  if (!ctx) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return ctx;
}
