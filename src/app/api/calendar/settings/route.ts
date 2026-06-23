import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function resolveOrg(userId: string, supabase: ReturnType<typeof createClient>) {
  const { data: user } = await supabase
    .from("users").select("id").eq("clerk_id", userId).single();
  if (!user) return null;
  const { data: member } = await supabase
    .from("org_members").select("org_id").eq("user_id", user.id).single();
  return member?.org_id ?? null;
}

const DEFAULT_SETTINGS = {
  platforms:           ["linkedin", "instagram", "facebook"],
  posting_frequency:   "daily",
  posts_per_week:      5,
  posting_times:       { monday: ["09:00"], tuesday: ["09:00"], wednesday: ["12:00"], thursday: ["09:00"], friday: ["09:00"] },
  content_mix:         { educational: 40, promotional: 20, entertainment: 30, behind_scenes: 10 },
  auto_approve:        false,
  auto_post_approved:  false,
  generate_variations: 3,
  auto_post_platforms: [],
};

// ── GET /api/calendar/settings ────────────────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ settings: DEFAULT_SETTINGS });

  const orgId = await resolveOrg(userId, supabase);
  if (!orgId) return NextResponse.json({ settings: DEFAULT_SETTINGS });

  const { data } = await supabase
    .from("calendar_settings")
    .select("*")
    .eq("org_id", orgId)
    .single();

  return NextResponse.json({ settings: data ?? DEFAULT_SETTINGS });
}

// ── POST /api/calendar/settings ───────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const orgId = await resolveOrg(userId, supabase);
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 404 });

  const { data, error } = await supabase
    .from("calendar_settings")
    .upsert({
      org_id:              orgId,
      platforms:           body.platforms           ?? ["linkedin"],
      posting_frequency:   body.posting_frequency   ?? "daily",
      posts_per_week:      body.posts_per_week       ?? 5,
      posting_times:       body.posting_times        ?? {},
      content_mix:         body.content_mix          ?? {},
      auto_approve:        body.auto_approve         ?? false,
      auto_post_approved:  body.auto_post_approved   ?? false,
      generate_variations: body.generate_variations  ?? 3,
      auto_post_platforms: body.auto_post_platforms  ?? [],
      updated_at:          new Date().toISOString(),
    }, { onConflict: "org_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
