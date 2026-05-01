import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — running in demo mode");
}

// Browser-side client — uses anon key, respects RLS
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }, // Clerk owns auth
    });
  }
  return _client;
}
