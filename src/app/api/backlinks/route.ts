import { z } from "zod";
import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse, generateId } from "@/lib/utils";
import { getChatCompletionRaw } from "@/lib/ai";

const DiscoverSchema = z.object({
  action: z.literal("discover"),
  domain: z.string().min(1).max(200),
  keywords: z.array(z.string().max(100)).max(10).optional(),
  niche: z.string().max(100).optional(),
});

const AddSchema = z.object({
  url: z.string().url(),
  target_url: z.string().url(),
  anchor_text: z.string().max(200).optional(),
  domain_authority: z.number().int().min(0).max(100).optional(),
  status: z.enum(["live", "pending", "lost"]).default("pending"),
});

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ data: DEMO_BACKLINKS, total: DEMO_BACKLINKS.length });

  const { data, error, count } = await db
    .from("backlinks")
    .select("*", { count: "exact" })
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ data: data ?? [], total: count ?? 0 });
}

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  if (typeof body === "object" && body !== null && (body as Record<string, unknown>).action === "discover") {
    return handleDiscover(ctx, body);
  }

  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);

  const db = getSupabaseServiceClient();
  if (!db) {
    return jsonResponse({ id: generateId(), org_id: ctx.org.id, ...parsed.data, created_at: new Date().toISOString() }, 201);
  }

  const { data, error } = await db.from("backlinks").insert({
    org_id: ctx.org.id,
    ...parsed.data,
  }).select().single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data, 201);
}

async function handleDiscover(ctx: Awaited<ReturnType<typeof requireOrgContext>>, body: unknown) {
  const parsed = DiscoverSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);

  const opportunities = await discoverBacklinkOpportunities(parsed.data.domain, parsed.data.niche, parsed.data.keywords);
  return jsonResponse({ opportunities });
}

async function discoverBacklinkOpportunities(domain: string, niche?: string, keywords?: string[]) {
  try {
    const result = await getChatCompletionRaw(`You are an SEO backlink expert. Find 10 realistic backlink opportunities for the domain "${domain}" in the ${niche ?? "marketing"} niche${keywords?.length ? `, targeting keywords: ${keywords.join(", ")}` : ""}.

Return JSON with an "opportunities" array:
[
  {
    "site_name": "<website name>",
    "site_url": "<realistic URL>",
    "domain_authority": <30-90>,
    "type": "guest_post"|"directory"|"resource_page"|"niche_edit"|"broken_link",
    "relevance": <60-100>,
    "estimated_traffic": "<like 12K/mo>",
    "contact_email": "<likely email format>",
    "notes": "<why this is a good fit>"
  }
]`);

    const json = JSON.parse(result ?? "{}");
    return Array.isArray(json) ? json : (json.opportunities ?? DEMO_OPPORTUNITIES);
  } catch {
    return DEMO_OPPORTUNITIES;
  }
}

const DEMO_BACKLINKS = [
  { id: "bl-1", url: "https://marketingweekly.io/tools", target_url: "https://example.com", anchor_text: "AI marketing platform", domain_authority: 72, status: "live", created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "bl-2", url: "https://agencyhub.co/resources", target_url: "https://example.com/leads", anchor_text: "lead generation software", domain_authority: 58, status: "live", created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: "bl-3", url: "https://growthtools.io/directory", target_url: "https://example.com", anchor_text: "SignafyAI", domain_authority: 64, status: "pending", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "bl-4", url: "https://saasreview.net/marketing-automation", target_url: "https://example.com", anchor_text: "content automation", domain_authority: 51, status: "lost", created_at: new Date(Date.now() - 20 * 86400000).toISOString() },
];

const DEMO_OPPORTUNITIES = [
  { site_name: "Marketing Weekly", site_url: "https://marketingweekly.io", domain_authority: 72, type: "guest_post", relevance: 94, estimated_traffic: "85K/mo", contact_email: "editorial@marketingweekly.io", notes: "Covers AI marketing tools extensively — high relevance" },
  { site_name: "Agency Hub", site_url: "https://agencyhub.co", domain_authority: 61, type: "resource_page", relevance: 88, estimated_traffic: "42K/mo", contact_email: "hello@agencyhub.co", notes: "Has a dedicated tools & resources section" },
  { site_name: "Growth Tools", site_url: "https://growthtools.io", domain_authority: 58, type: "directory", relevance: 82, estimated_traffic: "31K/mo", contact_email: "submit@growthtools.io", notes: "Actively accepts new tool submissions" },
  { site_name: "SaaS Review Net", site_url: "https://saasreview.net", domain_authority: 54, type: "niche_edit", relevance: 79, estimated_traffic: "28K/mo", contact_email: "reviews@saasreview.net", notes: "Has existing article on marketing automation" },
  { site_name: "Digital Agency Daily", site_url: "https://digitalagencydaily.com", domain_authority: 67, type: "guest_post", relevance: 91, estimated_traffic: "55K/mo", contact_email: "content@digitalagencydaily.com", notes: "Top 10 resource for agency owners" },
];
