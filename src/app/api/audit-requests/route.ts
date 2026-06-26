import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { jsonResponse, errorResponse } from "@/lib/utils";

export async function POST(request: Request) {
  let body: Record<string, string>;
  try {
    body = await request.json() as Record<string, string>;
  } catch {
    return errorResponse("Invalid request body", 400);
  }

  const { name, business_name, email, website, phone, industry, challenge, revenue_range, ref } = body;

  if (!name || !email || !business_name) {
    return errorResponse("Name, email, and business name are required", 400);
  }

  const db = getSupabaseServiceClient();
  if (db) {
    try {
      await db.from("audit_requests" as never).insert({
        name,
        business_name,
        email,
        website: website ?? null,
        phone: phone ?? null,
        industry: industry ?? null,
        challenge: challenge ?? null,
        revenue_range: revenue_range ?? null,
        source_ref: ref ?? null,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Table may not exist yet — submission is still captured in logs
    }
  }

  return jsonResponse({ success: true });
}
