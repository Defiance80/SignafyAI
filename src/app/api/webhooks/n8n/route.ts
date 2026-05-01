import { verifyN8nSignature } from "@/lib/n8n";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import type { Lead } from "@/lib/supabase/types";

/**
 * n8n workflow callback — receives results after async workflows complete.
 * All callbacks must include X-Signature header (HMAC-SHA256).
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  if (!verifyN8nSignature(payload, signature)) {
    return errorResponse("Invalid callback signature", 401);
  }

  let body: {
    run_id: string;
    workflow_type: string;
    status: "complete" | "failed";
    org_id: string;
    error_message?: string;
    output?: Record<string, unknown>;
    leads?: Lead[];
    content?: { body: string; char_count: number; engagement_prediction: number; hashtags: string[] };
    reply_id?: string;
    reply_status?: "sent" | "failed";
  };

  try {
    body = JSON.parse(payload);
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const db = getSupabaseServiceClient();
  if (!db) return jsonResponse({ received: true });

  // Update workflow run status
  await db.from("workflow_runs").update({
    status: body.status,
    completed_at: new Date().toISOString(),
    error_message: body.error_message ?? null,
    output_summary: body.output ?? null,
  }).eq("id", body.run_id);

  // Handle workflow-specific results
  switch (body.workflow_type) {
    case "lead_discovery": {
      if (body.status === "complete" && Array.isArray(body.leads) && body.leads.length > 0) {
        // Batch insert leads — ignore duplicates
        const leads = body.leads.map((l) => ({ ...l, org_id: body.org_id }));
        await db.from("leads").upsert(leads, { onConflict: "org_id,email", ignoreDuplicates: true });

        // Update usage counter
        await db.rpc("increment_leads_usage", {
          p_org_id: body.org_id,
          p_amount: leads.length,
        });

        // Log discovery activity for each lead
        const activities = leads.map((l) => ({
          lead_id: l.id,
          org_id: body.org_id,
          type: "discovered",
          description: `Discovered via ${l.platform ?? "unknown"} with score ${l.score}`,
        }));
        await db.from("lead_activities").insert(activities);
      }
      break;
    }

    case "content_generation": {
      if (body.status === "complete" && body.content) {
        // Find the content_piece created for this run and update it
        await db.from("content_pieces")
          .update({
            body: body.content.body,
            char_count: body.content.char_count,
            engagement_prediction: body.content.engagement_prediction,
            metadata: { hashtags: body.content.hashtags },
            status: "draft",
          })
          .eq("org_id", body.org_id)
          // Match by run_id stored in metadata
          .filter("metadata->run_id", "eq", body.run_id);
      }
      break;
    }

    case "social_classification": {
      // n8n ingested new messages and classified them — they're already in DB via n8n→Supabase
      // Just acknowledge receipt
      break;
    }

    case "seo_research": {
      // Keywords and competitors written directly by n8n to Supabase via service role
      // Just update the workflow run (done above)
      break;
    }
  }

  // Supabase Realtime will broadcast DB changes to subscribed clients automatically
  return jsonResponse({ received: true });
}
