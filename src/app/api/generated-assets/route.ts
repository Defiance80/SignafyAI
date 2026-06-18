import { requireOrgContext, getSupabaseServiceClient, DEMO_ORG_ID } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import type { GeneratedAsset } from "@/lib/supabase/types";

const DEMO_ASSETS: GeneratedAsset[] = [
  {
    id: "a1", org_id: DEMO_ORG_ID, run_id: null, signal_id: "s2",
    intent_signal: "Looking for a medspa that does body contouring near Temecula. Ready to book once I find the right place.",
    service: "Body Contouring", location: "Temecula, CA", industry: "Healthcare",
    business_name: null,
    landing_page: "Transform Your Body with Proven Body Contouring in Temecula",
    landing_page_subheadline: "Trusted by 500+ patients — Non-invasive, zero downtime, real results in 4–8 weeks. Free consultation today.",
    faq: "Q: Does CoolSculpting hurt? A: Most patients feel mild pressure and cold, which fades after 10 minutes.\nQ: How many sessions do I need? A: Most clients see results after 1–2 sessions.\nQ: Do results last? A: Yes — treated fat cells are permanently removed.",
    cta: "Book Your Free Body Contouring Consultation Today — Limited Slots Available",
    ai_script: "Hi [Name], this is [Rep] from [Clinic]. I saw you were researching body contouring options in Temecula — I wanted to reach out personally because we have a special offer this month for new patients. Do you have 2 minutes to chat about your goals?",
    email_sequence: "Email 1 (Day 0): Your Temecula Body Contouring Guide [ATTACHED]\nEmail 2 (Day 3): What 87 of our patients say after treatment\nEmail 3 (Day 7): Last chance — your free consultation spot expires Friday",
    blog_outline: "Title: CoolSculpting vs Emsculpt: Which Is Right for Temecula Residents?\n1. What each treatment does\n2. Ideal candidates\n3. Cost comparison in Southern CA\n4. What to expect at your first visit\n5. How to choose the right clinic",
    social_posts: "Post 1 (IG): Real talk: 73% of our Temecula patients say they wish they'd started sooner 💙 Non-invasive body contouring that actually works. Link in bio for a free consult.\nPost 2 (FB): 'I lost 2 inches without surgery' — read Sarah's story [link]\nPost 3 (IG Reel): Before → After: 8 weeks of body contouring results [video hook]",
    video_script: "Hook (0–3s): 'What if you could lose stubborn fat without going under the knife?'\nProblem (3–15s): Dieting and exercise can't always target problem areas like love handles or belly fat.\nSolution (15–35s): Body contouring at [Clinic] uses FDA-cleared technology to permanently destroy fat cells in the areas you care about most.\nCTA (35–45s): Book your free consultation at [URL] this week — spots are limited.",
    schema_suggestion: '{"@type": "MedicalClinic", "name": "[Clinic Name]", "description": "Non-invasive body contouring and CoolSculpting in Temecula, CA", "areaServed": "Temecula, CA", "availableService": "Body Contouring, CoolSculpting, Emsculpt"}',
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "25")));
  const search = url.searchParams.get("search");
  const runId = url.searchParams.get("run_id");
  const sortBy = url.searchParams.get("sort") ?? "created_at";
  const sortDir = url.searchParams.get("dir") === "asc" ? true : false;

  const db = getSupabaseServiceClient();
  if (!db) {
    return jsonResponse({ data: DEMO_ASSETS, total: DEMO_ASSETS.length, page: 1, per_page: 25 });
  }

  let query = db
    .from("generated_assets")
    .select("*", { count: "exact" })
    .eq("org_id", ctx.org.id)
    .order(sortBy, { ascending: sortDir })
    .range((page - 1) * perPage, page * perPage - 1);

  if (search) {
    query = query.or(`service.ilike.%${search}%,location.ilike.%${search}%,landing_page.ilike.%${search}%`);
  }
  if (runId) query = query.eq("run_id", runId);

  const { data, error, count } = await query;
  if (error) return errorResponse(error.message, 500);

  return jsonResponse({
    data: data as GeneratedAsset[],
    total: count ?? 0,
    page,
    per_page: perPage,
  });
}
