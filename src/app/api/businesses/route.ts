import { requireOrgContext, getSupabaseServiceClient, DEMO_ORG_ID } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import type { Business } from "@/lib/supabase/types";

// Demo data shown when Supabase is not yet configured
const DEMO_BUSINESSES: Business[] = [
  {
    id: "b1", org_id: DEMO_ORG_ID, run_id: null,
    name: "Glow Medspa & Aesthetics", industry: "Healthcare", service: "CoolSculpting",
    location: "Murrieta, CA", website: "https://glowmedspa.com", email: null,
    phone: "(951) 555-0101", address: "41520 Kalmia St, Murrieta, CA 92562",
    category: "Medical spa", rating: 4.2, reviews: 87,
    opportunity_score: 91, weaknesses: "No online booking on website; weak social media presence; last post was 3 months ago",
    recommended_offer: "Done-for-you social + booking automation package",
    pitch_angle: "You're losing 40% of potential patients who find you after hours — let's fix that",
    email_subject: "3 patients you missed last week (and how to get them back)",
    email_body: "Hi [Owner], I noticed Glow Medspa has 87 reviews and a 4.2 rating — which means patients trust you. But your website has no online booking and your Instagram hasn't posted since March. Every week without automation is revenue walking out the door. I'd love to show you a 10-minute fix. — [Name]",
    audit_data: null, social_data: null, raw_data: null,
    scraped_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "b2", org_id: DEMO_ORG_ID, run_id: null,
    name: "SculptBody Studio", industry: "Healthcare", service: "Body Contouring",
    location: "Temecula, CA", website: "https://sculptbodystudio.com", email: null,
    phone: "(951) 555-0202", address: "28780 Old Town Front St, Temecula, CA 92590",
    category: "Medical spa", rating: 3.8, reviews: 34,
    opportunity_score: 78, weaknesses: "Dated website, no email capture, zero blog content for SEO",
    recommended_offer: "SEO content + email funnel build-out",
    pitch_angle: "Your competitors are outranking you on Google — here's how to flip that in 30 days",
    email_subject: "Why SculptBody isn't showing up when patients search CoolSculpting Temecula",
    email_body: null,
    audit_data: null, social_data: null, raw_data: null,
    scraped_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

export async function DELETE(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ deleted: 0 });

  const url = new URL(request.url);
  const runId = url.searchParams.get("run_id") ?? null;

  let query = db.from("businesses").delete({ count: "exact" }).eq("org_id", ctx.org.id);
  if (runId) query = (query as typeof query).eq("run_id", runId);

  const { error, count } = await query;
  if (error) return errorResponse(error.message, 500);

  return jsonResponse({ deleted: count ?? 0 });
}

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "25")));
  const search = url.searchParams.get("search");
  const runId = url.searchParams.get("run_id");
  const sortBy = url.searchParams.get("sort") ?? "opportunity_score";
  const sortDir = url.searchParams.get("dir") === "asc" ? true : false; // ascending = true

  const db = getSupabaseServiceClient();
  if (!db) {
    return jsonResponse({ data: DEMO_BUSINESSES, total: DEMO_BUSINESSES.length, page: 1, per_page: 25 });
  }

  let query = db
    .from("businesses")
    .select("*", { count: "exact" })
    .eq("org_id", ctx.org.id)
    .order(sortBy, { ascending: sortDir })
    .range((page - 1) * perPage, page * perPage - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%,service.ilike.%${search}%`);
  }
  if (runId) {
    query = query.eq("run_id", runId);
  }

  const { data, error, count } = await query;
  if (error) return errorResponse(error.message, 500);

  return jsonResponse({
    data: data as Business[],
    total: count ?? 0,
    page,
    per_page: perPage,
  });
}
