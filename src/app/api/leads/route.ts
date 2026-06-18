import { z } from "zod";
import { requireOrgContext, getSupabaseServiceClient, DEMO_ORG_ID } from "@/lib/supabase/server";
import { triggerBWRouter, triggerLeadDiscovery, type LeadDiscoveryInput } from "@/lib/n8n";
import { guardApiRate, guardLeadDiscoveryUsage } from "@/lib/access";
import { errorResponse, jsonResponse, sanitizeText, generateId } from "@/lib/utils";
import { discoverLeads } from "@/lib/ai";
import type { Lead } from "@/lib/supabase/types";

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
  target_market: z.enum(["b2b", "b2c", "both"]).optional(),
  // AI-interpreted target description — primary input from UI
  target_description: z.string().max(1000).optional(),
  // B2B specific (programmatic/API use)
  b2b_vertical: z.enum([
    "marketing_agency", "saas_software", "business_consultant",
    "commercial_support", "recruiting_firm", "insurance_agency",
  ]).optional(),
  insurance_sub_targets: z.array(z.enum(["construction", "medical", "manufacturing"])).max(3).optional(),
  b2b_sources: z.array(z.enum(["linkedin", "directories", "company_websites"])).max(3).optional(),
  // B2C specific (programmatic/API use)
  b2c_sources: z.array(z.enum(["reddit", "twitter", "yelp", "youtube"])).max(4).optional(),
  // Common
  industry: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  platforms: z.array(z.string()).max(6).optional(),
  keywords: z.array(z.string().max(100)).max(20).optional(),
  min_score: z.number().int().min(0).max(100).optional(),
  save_config_name: z.string().max(100).optional(),
  // Agency mode
  client_service: z.string().max(200).optional(),
  generate_landing_page: z.boolean().optional(),
  for_client: z.boolean().optional(),
});

const DEFAULT_B2C_SOURCES: NonNullable<LeadDiscoveryInput["b2c_sources"]> = [
  "reddit",
  "yelp",
];
const DEFAULT_B2B_SOURCES: NonNullable<LeadDiscoveryInput["b2b_sources"]> = [
  "linkedin",
  "directories",
];

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const apiLimit = await guardApiRate(ctx);
  if (apiLimit) return apiLimit;

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

  const market = parsed.data.target_market ?? "b2b";
  // "both" = B2B + B2C; WF0 router handles all sources when both are present
  const b2c_sources: LeadDiscoveryInput["b2c_sources"] =
    market === "b2c" || market === "both"
      ? (parsed.data.b2c_sources?.length ? parsed.data.b2c_sources : DEFAULT_B2C_SOURCES)
      : undefined;
  const b2b_sources: LeadDiscoveryInput["b2b_sources"] =
    market === "b2b" || market === "both"
      ? (parsed.data.b2b_sources?.length ? parsed.data.b2b_sources : DEFAULT_B2B_SOURCES)
      : undefined;

  const normalizedParams = {
    ...parsed.data,
    target_market: market,
    b2c_sources,
    b2b_sources,
  };

  const discoveryLimit = await guardLeadDiscoveryUsage(ctx);
  if (discoveryLimit) return discoveryLimit;

  const runId = generateId();
  const db = getSupabaseServiceClient();

  if (db) {
    // Persist workflow run record
    await db.from("workflow_runs").insert({
      id: runId,
      org_id: ctx.org.id,
      workflow_type: "lead_discovery",
      status: "pending",
      input_params: normalizedParams,
      started_at: new Date().toISOString(),
    });

    // Save discovery config if requested
    if (normalizedParams.save_config_name) {
      await db.from("lead_discovery_configs").insert({
        org_id: ctx.org.id,
        name: sanitizeText(normalizedParams.save_config_name),
        filters: {
          target_market: normalizedParams.target_market,
          b2c_sources: normalizedParams.b2c_sources,
          b2b_sources: normalizedParams.b2b_sources,
          industry: normalizedParams.industry,
          location: normalizedParams.location,
          platforms: normalizedParams.platforms,
          keywords: normalizedParams.keywords,
          min_score: normalizedParams.min_score,
        },
      });
    }
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`;

  // Fetch user email so n8n can send the lead list directly
  let userEmail = "";
  if (db && ctx.userId) {
    const { data: userRow } = await db
      .from("users")
      .select("email")
      .eq("clerk_id", ctx.userId)
      .maybeSingle();
    userEmail = userRow?.email ?? "";
  }

  const keywordsFlat = parsed.data.keywords ?? [];
  const triggerPayload: LeadDiscoveryInput = {
    run_id: runId,
    org_id: ctx.org.id,
    callback_url: callbackUrl,
    target_market: market as LeadDiscoveryInput["target_market"],
    // AI target description (primary)
    target_description: parsed.data.target_description,
    // B2B
    b2b_vertical: parsed.data.b2b_vertical,
    insurance_sub_targets: parsed.data.insurance_sub_targets,
    b2b_sources,
    // B2C
    b2c_sources,
    // Common
    industry: parsed.data.industry || parsed.data.target_description,
    location: parsed.data.location,
    platforms: parsed.data.platforms,
    keywords: keywordsFlat,
    min_score: parsed.data.min_score,
    count: 50,  // request 50 raw from Apify; score filter trims to quality results
    user_email: userEmail,
    // Agency mode
    client_service: parsed.data.client_service,
    generate_landing_page: parsed.data.generate_landing_page,
    for_client: parsed.data.for_client,
  };

  // Prefer Blue Wolf Router (WF0); fall back to legacy if not configured
  let n8nResult = await triggerBWRouter(triggerPayload);
  if (!n8nResult.ok) {
    // BW router not available — try legacy workflow
    n8nResult = await triggerLeadDiscovery(triggerPayload);
  }

  if (!n8nResult.ok && db) {
    // n8n not configured — use AI to generate leads directly and mark run complete
    const aiMarket: "b2b" | "b2c" = market === "both" ? "b2b" : market;
    try {
      const discovered = await discoverLeads({
        target_market: aiMarket,
        industry: normalizedParams.industry,
        location: normalizedParams.location,
        keywords: normalizedParams.keywords,
        count: 10,
      });

      if (discovered.length > 0) {
        const rows = discovered.map((lead) => ({
          org_id: ctx.org.id,
          name: sanitizeText(lead.name),
          company: lead.company ? sanitizeText(lead.company) : null,
          email: lead.email || null,
          platform: lead.platform as Lead["platform"],
          industry: lead.industry || null,
          location: lead.location || null,
          notes: lead.notes ? sanitizeText(lead.notes) : null,
          tags: lead.tags,
          score: lead.score,
          status: "new" as const,
          last_activity: new Date().toISOString(),
        }));

        await db.from("leads").insert(rows);

        // Increment usage
        await db.from("organizations")
          .update({ usage_leads_mo: ctx.org.usage_leads_mo + discovered.length })
          .eq("id", ctx.org.id);
      }

      await db.from("workflow_runs").update({
        status: "complete",
        completed_at: new Date().toISOString(),
        output_summary: { leads_found: discovered.length, source: "ai" },
      }).eq("id", runId);
    } catch {
      await db.from("workflow_runs").update({ status: "failed" }).eq("id", runId);
    }
  }

  return jsonResponse({
    run_id: runId,
    status: n8nResult.ok ? "pending" : "complete",
    n8n_triggered: n8nResult.ok,
    target_market: market,
    message: n8nResult.ok
      ? "Lead discovery started — prospects, intent signals, and assets will appear in real-time"
      : "Discovery complete — AI-generated leads added to your pipeline",
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
