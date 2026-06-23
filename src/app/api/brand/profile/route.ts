import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ── GET /api/brand/profile ────────────────────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = serverClient();
  if (!supabase) {
    return NextResponse.json({ profile: null, demo: true });
  }

  // Resolve org
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user) return NextResponse.json({ profile: null });

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return NextResponse.json({ profile: null });

  const { data: profile } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("org_id", member.org_id)
    .single();

  return NextResponse.json({ profile: profile ?? null });
}

// ── POST /api/brand/profile ───────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return NextResponse.json({ error: "No org found" }, { status: 404 });

  const upsertData = {
    org_id:                     member.org_id,
    company_type:               body.company_type ?? "business",
    industry:                   body.industry ?? null,
    description:                body.description ?? null,
    logo_url:                   body.logo_url ?? null,
    primary_color:              body.primary_color ?? "#7c3aed",
    personality_traits:         body.personality_traits ?? [],
    background_story:           body.background_story ?? null,
    interests:                  body.interests ?? [],
    content_themes:             body.content_themes ?? [],
    target_audience_description: body.target_audience_description ?? null,
    posting_goals:              body.posting_goals ?? [],
    hashtag_strategy:           body.hashtag_strategy ?? null,
    updated_at:                 new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("brand_profiles")
    .upsert(upsertData, { onConflict: "org_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ profile: data });
}
