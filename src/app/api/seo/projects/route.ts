import { z } from "zod";
import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { triggerSeoResearch } from "@/lib/n8n";
import { LIMITS } from "@/lib/ratelimit";
import { errorResponse, jsonResponse, sanitizeText, generateId } from "@/lib/utils";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  target_domain: z.string().max(200).optional(),
  target_keywords: z.array(z.string().max(100)).max(50).default([]),
  run_research: z.boolean().default(false),
  seed_keyword: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  language: z.string().max(10).optional(),
});

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  if (!await LIMITS.seoResearch(ctx.org.id)) {
    return errorResponse("SEO research rate limit exceeded — max 20/hour", 429);
  }

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);

  const db = getSupabaseServiceClient();

  if (!db) {
    const projectId = generateId();
    if (parsed.data.run_research) {
      await triggerSeoResearch({
        run_id: generateId(), org_id: ctx.org.id, project_id: projectId,
        seed_keyword: parsed.data.seed_keyword, domain: parsed.data.target_domain,
        location: parsed.data.location, language: parsed.data.language,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`,
      });
    }
    return jsonResponse({ id: projectId, ...parsed.data, created_at: new Date().toISOString() }, 201);
  }

  const { data: project, error } = await db.from("seo_projects").insert({
    org_id: ctx.org.id,
    name: sanitizeText(parsed.data.name),
    target_domain: parsed.data.target_domain || null,
    target_keywords: parsed.data.target_keywords,
  }).select().single();

  if (error) return errorResponse(error.message, 500);

  if (parsed.data.run_research) {
    const runId = generateId();
    await db.from("workflow_runs").insert({
      id: runId, org_id: ctx.org.id, workflow_type: "seo_research",
      status: "pending", started_at: new Date().toISOString(),
      input_params: { project_id: project.id, ...parsed.data },
    });
    await triggerSeoResearch({
      run_id: runId, org_id: ctx.org.id, project_id: project.id,
      seed_keyword: parsed.data.seed_keyword, domain: parsed.data.target_domain,
      location: parsed.data.location, language: parsed.data.language,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`,
    });
  }

  return jsonResponse(project, 201);
}

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ data: [] });

  const { data, error } = await db.from("seo_projects").select("*").eq("org_id", ctx.org.id).order("created_at", { ascending: false });
  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ data });
}
