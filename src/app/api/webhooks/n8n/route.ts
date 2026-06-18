import { verifyN8nSignature } from "@/lib/n8n";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import type { Lead, Business, IntentSignal, GeneratedAsset } from "@/lib/supabase/types";

/**
 * n8n workflow callback — receives results after async workflows complete.
 * Handles both legacy lead_discovery and Blue Wolf Intelligence workflows.
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
    // Legacy lead discovery
    leads?: Lead[];
    // Content generation
    content?: { body: string; char_count: number; engagement_prediction: number; hashtags: string[] };
    reply_id?: string;
    reply_status?: "sent" | "failed";
    // Blue Wolf WF1 — prospect finder
    businesses?: Business[];
    // Blue Wolf WF2 — intent finder
    intent_signals?: IntentSignal[];
    // Blue Wolf WF3 — asset generator
    generated_assets?: GeneratedAsset[];
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

    // ─── Legacy / BW umbrella ─────────────────────────────────────────────────
    case "lead_discovery": {
      if (body.status === "complete" && Array.isArray(body.leads) && body.leads.length > 0) {
        const leads = body.leads.map((l) => ({ ...l, org_id: body.org_id }));
        await db.from("leads").upsert(leads, { onConflict: "org_id,email", ignoreDuplicates: true });

        await db.rpc("increment_leads_usage", {
          p_org_id: body.org_id,
          p_amount: leads.length,
        });

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

    // ─── Blue Wolf WF1: Business Prospect Finder ─────────────────────────────
    case "prospect_discovery": {
      if (body.status === "complete") {
        // WF1 may send businesses in the callback payload OR write directly to Supabase
        if (Array.isArray(body.businesses) && body.businesses.length > 0) {
          const rows = body.businesses.map((b) => ({
            ...b,
            org_id: body.org_id,
            run_id: body.run_id,
          }));
          // Upsert on org_id + website to prevent dupes across runs
          await db
            .from("businesses")
            .upsert(rows, { onConflict: "org_id,website", ignoreDuplicates: true });

          await db.rpc("increment_leads_usage", {
            p_org_id: body.org_id,
            p_amount: rows.length,
          });
        }
        // Supabase Realtime will broadcast the new rows to subscribed UI clients
      }
      break;
    }

    // ─── Blue Wolf WF2: Consumer Intent Finder ────────────────────────────────
    case "intent_discovery": {
      if (body.status === "complete") {
        if (Array.isArray(body.intent_signals) && body.intent_signals.length > 0) {
          const rows = body.intent_signals.map((s) => ({
            ...s,
            org_id: body.org_id,
            run_id: body.run_id,
          }));
          await db.from("intent_signals").insert(rows);
        }
      }
      break;
    }

    // ─── Blue Wolf WF3: Funnel Asset Generator ────────────────────────────────
    case "asset_generation": {
      if (body.status === "complete") {
        if (Array.isArray(body.generated_assets) && body.generated_assets.length > 0) {
          const rows = body.generated_assets.map((a) => ({
            ...a,
            org_id: body.org_id,
            run_id: body.run_id,
          }));
          await db.from("generated_assets").insert(rows);
        }
      }
      break;
    }

    // ─── Content generation ───────────────────────────────────────────────────
    case "content_generation": {
      if (body.status === "complete" && body.content) {
        await db.from("content_pieces")
          .update({
            body: body.content.body,
            char_count: body.content.char_count,
            engagement_prediction: body.content.engagement_prediction,
            metadata: { hashtags: body.content.hashtags },
            status: "draft",
          })
          .eq("org_id", body.org_id)
          .filter("metadata->run_id", "eq", body.run_id);
      }
      break;
    }

    case "social_classification":
    case "seo_research":
      // Written directly by n8n → Supabase; just acknowledge
      break;
  }

  // Supabase Realtime broadcasts DB changes to subscribed UI clients automatically
  return jsonResponse({ received: true });
}
