import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { buildServerClient, resolveOrgId } from "@/lib/supabase/resolve-org";

// ── GET /api/brand/inspiration ────────────────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = buildServerClient();
  if (!supabase) return NextResponse.json({ accounts: [] });

  const orgId = await resolveOrgId(userId, supabase);
  if (!orgId) return NextResponse.json({ accounts: [] });

  const { data } = await supabase
    .from("inspiration_accounts")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ accounts: data ?? [] });
}

// ── POST /api/brand/inspiration ───────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = buildServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const orgId = await resolveOrgId(userId, supabase);
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 404 });

  const { data, error } = await supabase
    .from("inspiration_accounts")
    .insert({
      org_id:       orgId,
      platform:     body.platform,
      handle:       body.handle,
      display_name: body.display_name ?? null,
      why:          body.why ?? null,
      category:     body.category ?? "inspiration",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ account: data });
}

// ── DELETE /api/brand/inspiration?id=xxx ─────────────────────
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = buildServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const orgId = await resolveOrgId(userId, supabase);
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 404 });

  await supabase.from("inspiration_accounts").delete().eq("id", id).eq("org_id", orgId);
  return NextResponse.json({ ok: true });
}
