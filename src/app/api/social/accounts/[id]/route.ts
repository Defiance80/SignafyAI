import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// DELETE /api/social/accounts/[id] — disconnect a social account
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  // Resolve org
  const { data: user } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return NextResponse.json({ error: "No org" }, { status: 404 });

  // Soft-delete: mark inactive rather than hard delete (preserves history)
  const { error } = await supabase
    .from("social_accounts")
    .update({ is_active: false, access_token: "", refresh_token: null })
    .eq("id", id)
    .eq("org_id", member.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
