import type { OrgContext } from "@/lib/supabase/types";
import { LIMITS } from "@/lib/ratelimit";
import { errorResponse, withinLimit } from "@/lib/utils";

/** General API rate limit (per org). Super admin skips. */
export async function guardApiRate(ctx: OrgContext): Promise<Response | null> {
  if (ctx.isSuperAdmin) return null;
  if (!(await LIMITS.api(ctx.org.id))) {
    return errorResponse("Rate limit exceeded — too many requests", 429);
  }
  return null;
}

/** Lead discovery: hourly cap + monthly usage. Super admin skips. */
export async function guardLeadDiscoveryUsage(ctx: OrgContext): Promise<Response | null> {
  if (ctx.isSuperAdmin) return null;
  if (!(await LIMITS.leadDiscovery(ctx.org.id))) {
    return errorResponse("Lead discovery rate limit exceeded — max 10 runs/hour", 429);
  }
  if (!withinLimit(ctx.org.usage_leads_mo, ctx.org.limits_leads_mo)) {
    return errorResponse(`Monthly lead limit reached (${ctx.org.limits_leads_mo}). Upgrade your plan.`, 402);
  }
  return null;
}

/** Content generation: hourly cap + monthly usage. Super admin skips. */
export async function guardContentGenerationUsage(ctx: OrgContext): Promise<Response | null> {
  if (ctx.isSuperAdmin) return null;
  if (!(await LIMITS.contentGenerate(ctx.org.id))) {
    return errorResponse("Content generation rate limit exceeded", 429);
  }
  if (!withinLimit(ctx.org.usage_content_mo, ctx.org.limits_content_mo)) {
    return errorResponse(`Monthly content limit reached (${ctx.org.limits_content_mo}). Upgrade your plan.`, 402);
  }
  return null;
}

/** SEO research hourly cap. Super admin skips. */
export async function guardSeoResearchRate(ctx: OrgContext): Promise<Response | null> {
  if (ctx.isSuperAdmin) return null;
  if (!(await LIMITS.seoResearch(ctx.org.id))) {
    return errorResponse("SEO research rate limit exceeded", 429);
  }
  return null;
}
