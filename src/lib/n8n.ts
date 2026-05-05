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
  target_market?: "b2b" | "b2c";
  b2c_sources?: Array<"reddit" | "review_platforms" | "directories">;
  b2b_sources?: Array<"linkedin" | "directories" | "company_websites">;
  industry?: string;
  location?: string;
  platforms?: string[];
  keywords?: string[];
  min_score?: number;
  callback_url: string;
}

export function triggerLeadDiscovery(input: LeadDiscoveryInput) {
  return trigger("/webhook/lead-discovery", input);
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

/** Verify that an inbound callback from n8n has a valid HMAC signature */
export function verifyN8nSignature(payload: string, signature: string): boolean {
  const expected = sign(payload);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
