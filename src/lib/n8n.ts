/**
 * n8n webhook trigger helpers.
 * All calls are fire-and-forget — n8n runs async and posts back to /api/webhooks/n8n.
 * Each request is HMAC-SHA256 signed so n8n can verify origin.
 */

import crypto from "crypto";

const N8N_BASE = process.env.N8N_WEBHOOK_BASE_URL ?? "";
const N8N_API_KEY = process.env.N8N_API_KEY ?? "";
const N8N_HMAC_SECRET = process.env.N8N_HMAC_SECRET ?? "dev-secret";

function sign(payload: string): string {
  return crypto.createHmac("sha256", N8N_HMAC_SECRET).update(payload).digest("hex");
}

async function trigger(path: string, body: object): Promise<{ ok: boolean; error?: string }> {
  if (!N8N_BASE) {
    console.warn("[n8n] N8N_WEBHOOK_BASE_URL not set — skipping trigger:", path);
    return { ok: false, error: "n8n not configured" };
  }

  const payload = JSON.stringify(body);
  const signature = sign(payload);

  try {
    const res = await fetch(`${N8N_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": N8N_API_KEY,
        "X-Signature": signature,
      },
      body: payload,
      signal: AbortSignal.timeout(10_000), // 10s — don't block the request
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `n8n returned ${res.status}: ${text}` };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[n8n] trigger failed:", path, msg);
    return { ok: false, error: msg };
  }
}

// ─── Workflow triggers ────────────────────────────────────────────────────────

export interface LeadDiscoveryInput {
  run_id: string;
  org_id: string;
  callback_url: string;
  target_market?: "b2b" | "b2c" | "both";
  // ─── AI-interpreted target (primary input — replaces manual pickers) ──────
  /** Free-text description of who to target — AI builds search queries from this */
  target_description?: string;
  // ─── B2B fields (kept for programmatic/API use) ───────────────────────────
  b2b_vertical?: "marketing_agency" | "saas_software" | "business_consultant" | "commercial_support" | "recruiting_firm" | "insurance_agency";
  insurance_sub_targets?: Array<"construction" | "medical" | "manufacturing">;
  b2b_sources?: Array<"linkedin" | "directories" | "company_websites">;
  // ─── B2C fields (kept for programmatic/API use) ───────────────────────────
  b2c_sources?: Array<"reddit" | "twitter" | "yelp" | "youtube">;
  // ─── Common fields ────────────────────────────────────────────────────────
  industry?: string;
  location?: string;
  platforms?: string[];
  keywords?: string[];
  min_score?: number;
  count?: number;
  user_email?: string;
  // ─── Agency mode fields ───────────────────────────────────────────────────
  /** The service the client offers (used for B2C signal targeting) */
  client_service?: string;
  /** If true, generate organic landing pages for B2C signals via WF3 */
  generate_landing_page?: boolean;
  /** Agency mode: user is finding leads FOR their client, not themselves */
  for_client?: boolean;
}

export function triggerLeadDiscovery(input: LeadDiscoveryInput) {
  return trigger("/webhook/lead-discovery", input);
}

/**
 * Trigger the Blue Wolf Router (WF0) — routes to WF1 (prospects), WF2 (intent),
 * WF3 (assets) based on target_market and sources.  This is the primary path
 * for all new lead discovery runs.
 */
export function triggerBWRouter(input: LeadDiscoveryInput) {
  return trigger("/webhook/bw-router", input);
}

export interface ContentGenerationInput {
  run_id: string;
  org_id: string;
  content_type: string;
  platform: string;
  tone: string;
  prompt: string;
  voice_id?: string;
  callback_url: string;
}

export function triggerContentGeneration(input: ContentGenerationInput) {
  return trigger("/webhook/content-generation", input);
}

export interface SocialReplyInput {
  run_id: string;
  org_id: string;
  message_id: string;
  reply_id: string;
  reply_body: string;
  platform: string;
  account_id: string;
  callback_url: string;
}

export function triggerSocialReply(input: SocialReplyInput) {
  return trigger("/webhook/social-reply", input);
}

export interface SeoResearchInput {
  run_id: string;
  org_id: string;
  project_id: string;
  seed_keyword?: string;
  domain?: string;
  location?: string;
  language?: string;
  callback_url: string;
}

export function triggerSeoResearch(input: SeoResearchInput) {
  return trigger("/webhook/seo-research", input);
}

// ─── Social Post (Growth Intel outbound publishing) ───────────────────────────

export interface SocialPostInput {
  run_id: string;
  org_id: string;
  platform: string;
  account_id: string;
  content: string;
  hashtags?: string[];
  media_url?: string | null;
  scheduled_at?: string | null;
  content_piece_id: string;
  calendar_item_id?: string | null;
  callback_url: string;
}

export function triggerSocialPost(input: SocialPostInput) {
  return trigger("/webhook/social-post", input);
}

/** Verify that an inbound callback from n8n has a valid HMAC signature */
export function verifyN8nSignature(payload: string, signature: string): boolean {
  const expected = sign(payload);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
