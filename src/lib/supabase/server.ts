import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { auth, clerkClient } from "@clerk/nextjs/server";
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

  const { userId } = await auth();
  if (!userId) return null;

  const db = getSupabaseServiceClient();
  if (!db) return null;

  const isSuperAdmin = isSuperAdminUser(userId);

  // Ensure user exists (Clerk webhooks should create it, but don't rely on it)
  const { data: existingUser } = await db
    .from("users")
    .select("id, clerk_id, email")
    .eq("clerk_id", userId)
    .maybeSingle();

  const supaUserId = existingUser?.id ?? await upsertUserFromClerk(db, userId);
  if (!supaUserId) return null;

  // Resolve org membership (pick most recent membership if multiple)
  const { data: member, error: memberErr } = await db
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", supaUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (memberErr) return null;

  // If no membership exists (edge case), create a default org + membership.
  let orgId = member?.org_id as string | undefined;
  let role = (member?.role as OrgContext["role"] | undefined) ?? "member";
  if (!orgId) {
    const created = await ensureDefaultOrg(db, supaUserId, userId);
    if (!created) return null;
    orgId = created.orgId;
    role = created.role;
  }

  const { data: org, error: orgErr } = await db
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();
  if (orgErr || !org) return null;

  return {
    org,
    userId,
    role,
    isSuperAdmin,
  };
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

function isSuperAdminUser(clerkUserId: string): boolean {
  const raw = process.env.SUPER_ADMIN_CLERK_IDS ?? "";
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return ids.includes(clerkUserId);
}

async function upsertUserFromClerk(db: SupabaseClient, clerkUserId: string): Promise<string | null> {
  try {
    const c = await clerkClient();
    const user = await c.users.getUser(clerkUserId);
    const email = user.emailAddresses?.[0]?.emailAddress ?? "";
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || null;
    const avatarUrl = user.imageUrl ?? null;

    const { data, error } = await db
      .from("users")
      .upsert(
        {
          clerk_id: clerkUserId,
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
        },
        { onConflict: "clerk_id" }
      )
      .select("id")
      .single();

    if (error) return null;
    return data?.id ?? null;
  } catch {
    return null;
  }
}

async function ensureDefaultOrg(
  db: SupabaseClient,
  supaUserId: string,
  clerkUserId: string
): Promise<{ orgId: string; role: OrgContext["role"] } | null> {
  // Create org name/slug based on Clerk user if possible.
  let name = "My Workspace";
  let slugSeed = `user-${clerkUserId.slice(0, 8)}`;
  try {
    const c = await clerkClient();
    const user = await c.users.getUser(clerkUserId);
    const email = user.emailAddresses?.[0]?.emailAddress ?? "";
    const firstName = user.firstName ?? "";
    name = `${firstName || email || "My"} Workspace`;
    slugSeed = (email.split("@")[0] || slugSeed).toLowerCase().replace(/[^a-z0-9]/g, "-");
  } catch {
    // ignore
  }

  const { data: org, error: orgErr } = await db
    .from("organizations")
    .insert({
      name,
      slug: `${slugSeed}-${Date.now()}`,
      owner_id: supaUserId,
      plan: "starter",
      subscription_status: "trialing",
      limits_leads_mo: 100,
      limits_content_mo: 50,
    })
    .select("id")
    .single();
  if (orgErr || !org) return null;

  const { error: memErr } = await db.from("org_members").insert({
    org_id: org.id,
    user_id: supaUserId,
    role: "owner",
  });
  if (memErr) return null;

  // Default voice (optional best-effort)
  await db.from("brand_voices").insert({
    org_id: org.id,
    name: "Default",
    tone: "professional",
    is_default: true,
  });

  return { orgId: org.id, role: "owner" };
}
