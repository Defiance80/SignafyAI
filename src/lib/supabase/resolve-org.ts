/**
 * Shared Supabase server helper.
 *
 * Without a generated database types file, Supabase's TS client infers
 * all table row types as `never`, which breaks .insert()/.upsert() calls.
 * Casting the client to `any` sidesteps this while keeping full runtime
 * behaviour — acceptable until we add `supabase gen types` to CI.
 */
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySupabaseClient = any;

export function buildServerClient(): AnySupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  // Cast to `any` — without generated schema types, all table write
  // operations would otherwise resolve to `never`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient(url, key) as any;
}

export async function resolveOrgId(
  clerkId: string,
  supabase: AnySupabaseClient
): Promise<string | null> {
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .single();

  if (!user) return null;

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  return member?.org_id ?? null;
}
