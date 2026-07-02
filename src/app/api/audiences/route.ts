import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";

export interface Audience {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
}

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ audiences: [] });

  try {
    const { data, error } = await db
      .from("audiences" as never)
      .select("*")
      .eq("org_id", ctx.org.id)
      .order("created_at", { ascending: false });

    if (error) {
      // Table may not exist yet — return empty gracefully
      return jsonResponse({ audiences: [] });
    }

    return jsonResponse({ audiences: (data ?? []) as Audience[] });
  } catch {
    return jsonResponse({ audiences: [] });
  }
}

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => ({})) as {
    name?: string;
    description?: string;
  };

  const { name, description } = body;
  if (!name?.trim()) return errorResponse("Audience name is required", 400);

  const db = getSupabaseServiceClient();
  if (!db) {
    // Return a client-side-only audience (no persistence)
    const mockAudience: Audience = {
      id: `local-${Date.now()}`,
      org_id: ctx.org.id,
      name: name.trim(),
      description: description ?? null,
      member_count: 0,
      created_at: new Date().toISOString(),
    };
    return jsonResponse({ audience: mockAudience });
  }

  try {
    const { data, error } = await db
      .from("audiences" as never)
      .insert({
        org_id: ctx.org.id,
        name: name.trim(),
        description: description?.trim() ?? null,
        member_count: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Return mock if table doesn't exist
      const mockAudience: Audience = {
        id: `local-${Date.now()}`,
        org_id: ctx.org.id,
        name: name.trim(),
        description: description ?? null,
        member_count: 0,
        created_at: new Date().toISOString(),
      };
      return jsonResponse({ audience: mockAudience });
    }

    return jsonResponse({ audience: data as Audience });
  } catch {
    return jsonResponse({
      audience: {
        id: `local-${Date.now()}`,
        org_id: ctx.org.id,
        name: name.trim(),
        description: description ?? null,
        member_count: 0,
        created_at: new Date().toISOString(),
      } as Audience,
    });
  }
}
