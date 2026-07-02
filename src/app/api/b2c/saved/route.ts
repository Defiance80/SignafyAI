import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import type { SocialProfile } from "../search/route";

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ profiles: [] });

  try {
    const { data, error } = await db
      .from("saved_b2c_profiles" as never)
      .select("*")
      .eq("org_id", ctx.org.id)
      .order("saved_at", { ascending: false });

    if (error) return jsonResponse({ profiles: [] });

    return jsonResponse({ profiles: (data ?? []) as Array<{ id: string; profile: SocialProfile; saved_at: string }> });
  } catch {
    return jsonResponse({ profiles: [] });
  }
}

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => ({})) as { profile?: SocialProfile };
  if (!body.profile) return errorResponse("Profile is required", 400);

  const db = getSupabaseServiceClient();

  const record = {
    id: `saved-${body.profile.id}-${Date.now()}`,
    org_id: ctx.org.id,
    profile_id: body.profile.id,
    profile: body.profile,
    saved_at: new Date().toISOString(),
  };

  if (!db) {
    // Return mock — caller should persist to localStorage
    return jsonResponse({ saved: record });
  }

  try {
    const { data, error } = await db
      .from("saved_b2c_profiles" as never)
      .insert(record)
      .select()
      .single();

    if (error) return jsonResponse({ saved: record });

    return jsonResponse({ saved: data });
  } catch {
    return jsonResponse({ saved: record });
  }
}

export async function DELETE(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const profileId = url.searchParams.get("profile_id");
  if (!profileId) return errorResponse("profile_id required", 400);

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ deleted: true });

  try {
    await db
      .from("saved_b2c_profiles" as never)
      .delete()
      .eq("org_id", ctx.org.id)
      .eq("profile_id", profileId);

    return jsonResponse({ deleted: true });
  } catch {
    return jsonResponse({ deleted: true });
  }
}
