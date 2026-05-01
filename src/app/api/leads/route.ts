import { z } from "zod";
import { requireOrgContext, getSupabaseServiceClient, DEMO_ORG_ID } from "@/lib/supabase/server";
import { triggerLeadDiscovery } from "@/lib/n8n";
import { LIMITS } from "@/lib/ratelimit";
import { errorResponse, jsonResponse, sanitizeText, generateId, withinLimit } from "@/lib/utils";
import type { Lead, WorkflowRun } from "@/lib/supabase/types";

// ─── GET /api/leads ────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "25")));
  const status = url.searchParams.get("status");
  const platform = url.searchParams.get("platform");
  const search = url.searchParams.get("search");
  const sortBy = url.searchParams.get("sort") ?? "created_at";
  const sortDir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";

  const db = getSupabaseServiceClient();
  if (!db) {
    // Demo mode — return mock data
    return jsonResponse({ data: DEMO_LEADS, total: DEMO_LEADS.length, page: 1, per_page: 25 });
  }

  let query = db
    .from("leads")
    .select("*", { count: "exact" })
    .eq("org_id", ctx.org.id)
    .order(sortBy, { ascending: sortDir === "asc" })
    .range((page - 1) * perPage, page * perPage - 1);

  if (status) query = query.eq("status", status);
  if (platform) query = query.eq("platform", platform);
  if (search) {
    query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) return errorResponse(error.message, 500);

  return jsonResponse({ data: data as Lead[], total: count ?? 0, page, per_page: perPage });
}

// ─── POST /api/leads — manual add OR trigger discovery ────────────────────────
const AddLeadSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  platform: z.enum(["instagram","linkedin","tiktok","twitter","facebook","google","manual"]).optional(),
  source_url: z.string().url().optional().or(z.literal("")),
  industry: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

const DiscoverSchema = z.object({
  action: z.literal("discover"),
  industry: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  platforms: z.array(z.string()).max(6).optional(),
  keywords: z.array(z.string().max(100)).max(20).optional(),
  min_score: z.number().int().min(0).max(100).optional(),
  save_config_name: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  if (!await LIMITS.api(ctx.org.id)) {
    return errorResponse("Rate limit exceeded — too many requests", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  // Distinguish: discover action vs. manual add
  if (typeof body === "object" && body !== null && (body as Record<string, unknown>).action === "discover") {
    return handleDiscover(ctx, body);
  }

  return handleAddLead(ctx, body);
}

async function handleAddLead(ctx: Awaited<ReturnType<typeof requireOrgContext>>, body: unknown) {
  const parsed = AddLeadSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);
  }

  const data = parsed.data;
  const db = getSupabaseServiceClient();

  if (!db) {
    // Demo mode
    const lead: Lead = {
      id: generateId(),
      org_id: DEMO_ORG_ID,
      name: sanitizeText(data.name),
      company: data.company ? sanitizeText(data.company) : null,
      email: data.email || null,
      phone: data.phone || null,
      platform: data.platform ?? "manual",
      source_url: data.source_url || null,
      score: 0,
      status: "new",
      industry: data.industry || null,
      location: data.location || null,
      notes: data.notes ? sanitizeText(data.notes) : null,
      tags: data.tags ?? [],
      enrichment_data: null,
      last_activity: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return jsonResponse(lead, 201);
  }

  const { data: lead, error } = await db.from("leads").insert({
    org_id: ctx.org.id,
    name: sanitizeText(data.name),
    company: data.company ? sanitizeText(data.company) : null,
    email: data.email || null,
    phone: data.phone || null,
    platform: data.platform ?? "manual",
    source_url: data.source_url || null,
    industry: data.industry || null,
    location: data.location || null,
    notes: data.notes ? sanitizeText(data.notes) : null,
    tags: data.tags ?? [],
    status: "new",
    score: 0,
    last_activity: new Date().toISOString(),
  }).select().single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(lead, 201);
}

async function handleDiscover(ctx: Awaited<ReturnType<typeof requireOrgContext>>, body: unknown) {
  const parsed = DiscoverSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);
  }

  if (!await LIMITS.leadDiscovery(ctx.org.id)) {
    return errorResponse("Lead discovery rate limit exceeded — max 10 runs/hour", 429);
  }

  if (!withinLimit(ctx.org.usage_leads_mo, ctx.org.limits_leads_mo)) {
    return errorResponse(`Monthly lead limit reached (${ctx.org.limits_leads_mo}). Upgrade your plan.`, 402);
  }

  const runId = generateId();
  const db = getSupabaseServiceClient();

  if (db) {
    // Persist workflow run record
    await db.from("workflow_runs").insert({
      id: runId,
      org_id: ctx.org.id,
      workflow_type: "lead_discovery",
      status: "pending",
      input_params: parsed.data,
      started_at: new Date().toISOString(),
    });

    // Save discovery config if requested
    if (parsed.data.save_config_name) {
      await db.from("lead_discovery_configs").insert({
        org_id: ctx.org.id,
        name: sanitizeText(parsed.data.save_config_name),
        filters: {
          industry: parsed.data.industry,
          location: parsed.data.location,
          platforms: parsed.data.platforms,
          keywords: parsed.data.keywords,
          min_score: parsed.data.min_score,
        },
      });
    }
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`;

  const n8nResult = await triggerLeadDiscovery({
    run_id: runId,
    org_id: ctx.org.id,
    ...parsed.data,
    callback_url: callbackUrl,
  });

  return jsonResponse({
    run_id: runId,
    status: "pending",
    n8n_triggered: n8nResult.ok,
    message: n8nResult.ok
      ? "Lead discovery started — results will appear in real-time"
      : "Discovery queued (n8n not configured — results will use demo data)",
  }, 202);
}

// ─── Demo leads data ──────────────────────────────────────────────────────────
const DEMO_LEADS: Lead[] = [
  { id: "1", org_id: DEMO_ORG_ID, name: "Sarah Chen", company: "Bloom Digital Agency", email: "sarah@bloomdigital.co", phone: null, platform: "linkedin", source_url: null, score: 92, status: "qualified", industry: "Marketing Agency", location: "San Francisco, CA", notes: null, tags: ["hot-lead","b2b"], enrichment_data: null, last_activity: new Date(Date.now() - 2*3600000).toISOString(), created_at: new Date(Date.now() - 3*86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: "2", org_id: DEMO_ORG_ID, name: "Marcus Rivera", company: "TrueNorth Marketing", email: null, phone: null, platform: "instagram", source_url: null, score: 87, status: "contacted", industry: "Marketing", location: "Austin, TX", notes: null, tags: ["follow-up"], enrichment_data: null, last_activity: new Date(Date.now() - 4*3600000).toISOString(), created_at: new Date(Date.now() - 5*86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: "3", org_id: DEMO_ORG_ID, name: "Aisha Patel", company: "Evergreen Studios", email: "aisha@evergreenstudios.io", phone: null, platform: "linkedin", source_url: null, score: 84, status: "new", industry: "Creative Agency", location: "New York, NY", notes: null, tags: [], enrichment_data: null, last_activity: new Date(Date.now() - 3600000).toISOString(), created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: "4", org_id: DEMO_ORG_ID, name: "Jason Kim", company: "Velocity Growth Co", email: null, phone: null, platform: "twitter", source_url: null, score: 79, status: "qualified", industry: "Growth Marketing", location: "Seattle, WA", notes: "Strong engagement signals", tags: ["decision-maker"], enrichment_data: null, last_activity: new Date(Date.now() - 6*3600000).toISOString(), created_at: new Date(Date.now() - 7*86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: "5", org_id: DEMO_ORG_ID, name: "Elena Vasquez", company: "Prism Creative Lab", email: "elena@prismcreative.com", phone: null, platform: "instagram", source_url: null, score: 76, status: "converted", industry: "Design Agency", location: "Miami, FL", notes: null, tags: ["closed"], enrichment_data: null, last_activity: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 14*86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: "6", org_id: DEMO_ORG_ID, name: "David Okonkwo", company: "Summit Strategies", email: null, phone: null, platform: "linkedin", source_url: null, score: 73, status: "contacted", industry: "Strategy Consulting", location: "Chicago, IL", notes: null, tags: [], enrichment_data: null, last_activity: new Date(Date.now() - 3*3600000).toISOString(), created_at: new Date(Date.now() - 4*86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: "7", org_id: DEMO_ORG_ID, name: "Rachel Foster", company: "BrightPath Consulting", email: "rachel@brightpath.co", phone: null, platform: "tiktok", source_url: null, score: 71, status: "new", industry: "Consulting", location: "Denver, CO", notes: null, tags: [], enrichment_data: null, last_activity: new Date(Date.now() - 1800000).toISOString(), created_at: new Date(Date.now() - 2*86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: "8", org_id: DEMO_ORG_ID, name: "Omar Hassan", company: "Nexus Digital Media", email: null, phone: null, platform: "facebook", source_url: null, score: 68, status: "contacted", industry: "Digital Media", location: "Houston, TX", notes: null, tags: [], enrichment_data: null, last_activity: new Date(Date.now() - 5*3600000).toISOString(), created_at: new Date(Date.now() - 6*86400000).toISOString(), updated_at: new Date().toISOString() },
];
