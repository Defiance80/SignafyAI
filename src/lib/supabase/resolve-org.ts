/**
 * Shared helper — resolves clerk_id → internal user.id → org_id
 * Uses explicit type casts so TypeScript doesn't infer `never` on
 * untyped Supabase clients (no generated schema types file).
 */
import { createClient } from "@supabase/supabase-js";

type SupabaseClient = ReturnType<typeof createClient>;

export async function resolveOrgId(
  clerkId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  const { data: user } = (await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .single()) as { data: { id: string } | null };

  if (!user) return null;

  const { data: member } = (await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single()) as { data: { org_id: string } | null };

  return member?.org_id ?? null;
}

export function buildServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
