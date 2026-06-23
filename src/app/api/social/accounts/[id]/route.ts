import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { buildServerClient, resolveOrgId } from "@/lib/supabase/resolve-org";

// DELETE /api/social/accounts/[id] — disconnect a social account
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = buildServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const orgId = await resolveOrgId(userId, supabase);
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 404 });

  // Soft-delete: mark inactive rather than hard delete (preserves history)
  const { error } = await supabase
    .from("social_accounts")
    .update({ is_active: false, access_token: "", refresh_token: null })
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
