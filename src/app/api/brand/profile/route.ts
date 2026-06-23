import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { buildServerClient, resolveOrgId } from "@/lib/supabase/resolve-org";

// ── GET /api/brand/profile ────────────────────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = buildServerClient();
  if (!supabase) return NextResponse.json({ profile: null, demo: true });

  const orgId = await resolveOrgId(userId, supabase);
  if (!orgId) return NextResponse.json({ profile: null });

  const { data: profile } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("org_id", orgId)
    .single();

  return NextResponse.json({ profile: profile ?? null });
}

// ── POST /api/brand/profile ───────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = buildServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const orgId = await resolveOrgId(userId, supabase);
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 404 });

  const { data, error } = await supabase
    .from("brand_profiles")
    .upsert({
      org_id:                      orgId,
      company_type:                body.company_type ?? "business",
      industry:                    body.industry ?? null,
      description:                 body.description ?? null,
      logo_url:                    body.logo_url ?? null,
      primary_color:               body.primary_color ?? "#7c3aed",
      personality_traits:          body.personality_traits ?? [],
      background_story:            body.background_story ?? null,
      interests:                   body.interests ?? [],
      content_themes:              body.content_themes ?? [],
      target_audience_description: body.target_audience_description ?? null,
      posting_goals:               body.posting_goals ?? [],
      hashtag_strategy:            body.hashtag_strategy ?? null,
      updated_at:                  new Date().toISOString(),
    }, { onConflict: "org_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
