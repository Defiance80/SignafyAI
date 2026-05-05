# Signafy n8n Lead Discovery Handoff

This document is the implementation handoff for building and maintaining the Signafy lead discovery workflow in n8n, with Supabase as the datastore and Signafy as the orchestration layer.

## 1) Product Goal

Signafy users run lead discovery from the Leads page by choosing:

- `industry`
- optional filters (`location`, `keywords`, `min_score`)
- lead type: `B2B` or `B2C`
- source targets:
  - `B2C`: `reddit`, `review_platforms`, `directories`
  - `B2B`: `linkedin`, `directories`, `company_websites`

Signafy sends a fire-and-forget webhook to n8n. n8n does collection/enrichment/scoring in background, then posts results back to Signafy callback endpoint.

---

## 2) Current Signafy Flow (Implemented)

### UI -> API

- Frontend discovery modal: `src/app/(app)/leads/page.tsx`
- Hook/mutation: `src/hooks/use-leads.ts`
- API endpoint: `POST /api/leads` with `{ action: "discover", ... }`
- Server route: `src/app/api/leads/route.ts`

### API -> n8n trigger

- Trigger helper: `src/lib/n8n.ts`
- n8n webhook path used by Signafy:
  - `POST {N8N_WEBHOOK_BASE_URL}/webhook/lead-discovery`
- Request headers:
  - `Content-Type: application/json`
  - `X-API-Key: {N8N_API_KEY}`
  - `X-Signature: {HMAC_SHA256(payload, N8N_HMAC_SECRET)}`

### n8n -> Signafy callback

- Callback endpoint:
  - `POST {NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`
- Callback verification:
  - Signafy validates `x-signature` with `verifyN8nSignature(...)` in `src/lib/n8n.ts`
- Callback handler:
  - `src/app/api/webhooks/n8n/route.ts`

---

## 3) Discovery Trigger Payload Contract (Signafy -> n8n)

n8n should expect this JSON shape for lead discovery:

```json
{
  "run_id": "uuid",
  "org_id": "uuid",
  "target_market": "b2b | b2c",
  "b2c_sources": ["reddit", "review_platforms", "directories"],
  "b2b_sources": ["linkedin", "directories", "company_websites"],
  "industry": "string",
  "location": "string",
  "platforms": ["string"],
  "keywords": ["string"],
  "min_score": 0,
  "save_config_name": "string",
  "action": "discover",
  "callback_url": "https://.../api/webhooks/n8n"
}
```

Notes:

- `target_market` defaults to `b2b` server-side if omitted.
- If `target_market = b2c` and no `b2c_sources` provided, Signafy defaults to all 3 B2C sources.
- If `target_market = b2b` and no `b2b_sources` provided, Signafy defaults to `linkedin` + `directories`.
- `save_config_name` and `action` may be present because Signafy forwards normalized request object.

---

## 4) Callback Contract (n8n -> Signafy)

n8n must POST signed callback JSON:

```json
{
  "run_id": "uuid",
  "workflow_type": "lead_discovery",
  "status": "complete | failed",
  "org_id": "uuid",
  "error_message": "string",
  "output": {
    "summary": "optional summary object"
  },
  "leads": [
    {
      "id": "uuid",
      "name": "string",
      "company": "string",
      "email": "string",
      "phone": "string",
      "platform": "instagram | linkedin | tiktok | twitter | facebook | google | manual",
      "source_url": "https://...",
      "score": 0,
      "status": "new | contacted | qualified | converted | lost",
      "industry": "string",
      "location": "string",
      "notes": "string",
      "tags": ["string"],
      "enrichment_data": {}
    }
  ]
}
```

Required behavior:

- Always include `workflow_type = "lead_discovery"`.
- Always include `run_id`, `status`, `org_id`.
- On failure, set `status = "failed"` and send `error_message`.
- On success, set `status = "complete"` and include `leads` array (can be empty).

Signing:

- Compute `HMAC_SHA256(raw_json_payload, N8N_HMAC_SECRET)`.
- Send as header: `x-signature`.

---

## 5) Supabase Tables n8n Must Respect

Schema source:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`

Primary lead workflow tables:

- `workflow_runs`
  - Signafy creates row at launch with `status = pending`
  - Signafy callback route updates row to `complete` / `failed`
- `leads`
  - Callback route upserts leads on `(org_id, email)` with `ignoreDuplicates: true`
- `lead_activities`
  - Callback route inserts `discovered` activity rows per lead
- `lead_discovery_configs`
  - Saved discovery presets (includes new `target_market`, `b2c_sources`, `b2b_sources` in filters JSON)

Important:

- App server uses `SUPABASE_SERVICE_ROLE_KEY` for these writes (`getSupabaseServiceClient`), so RLS is bypassed server-side.
- If n8n writes directly to Supabase, use service role credentials in n8n secret storage only.

---

## 6) Required Env Vars

From `.env.example`:

- App:
  - `NEXT_PUBLIC_APP_URL`
- Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- n8n integration:
  - `N8N_WEBHOOK_BASE_URL`
  - `N8N_API_KEY`
  - `N8N_HMAC_SECRET`

Key handling:

- Publishable/anon keys are allowed in client context.
- Service role key must stay server-only (Signafy backend, n8n secrets).
- Do not hardcode any key in repo files.

---

## 7) Rate Limits and Usage Rules

From `src/lib/ratelimit.ts` and `src/app/api/leads/route.ts`:

- General API per org: `200/min`
- Lead discovery per org: `10/hour`
- Usage quota enforcement:
  - discovery blocked when `usage_leads_mo >= limits_leads_mo`

n8n should be idempotent and resilient because users may retry discovery runs.

---

## 8) Suggested n8n Workflow Shape

## Trigger and Validation

1. Webhook node receives Signafy payload.
2. Verify `X-API-Key` and `X-Signature`.
3. Normalize arrays (`keywords`, source arrays) and defaults.

## Branching

4. IF `target_market = b2c`:
   - route to source collectors selected in `b2c_sources`
     - Reddit conversations
     - Review platform discussions
     - Directory/activity listings
5. IF `target_market = b2b`:
   - route to source collectors selected in `b2b_sources`
     - LinkedIn/company profile mining
     - Business directories
     - Company website/contact extraction

## Enrichment and Scoring

6. Standardize records to internal lead object.
7. Deduplicate (prefer email, then profile URL/hash).
8. Score 0-100 using:
   - industry match
   - location match
   - keyword intent strength
   - platform/source quality
   - available contact confidence
9. Filter by `min_score` if provided.

## Callback

10. POST callback to `callback_url` with required contract.
11. Sign callback with `x-signature`.
12. On workflow error, send failed callback payload.

---

## 9) Data Quality Rules for `leads[]`

To avoid callback ingestion issues:

- Always include `id` (uuid recommended), `name`, `score`, `status`, `org_id` in payload top-level and each lead object fields used by app.
- Keep `score` in `0..100`.
- Keep `status` valid (`new`, `contacted`, `qualified`, `converted`, `lost`).
- Keep `platform` valid if set.
- Include `source_url` whenever possible for traceability.
- Put raw source artifacts inside `enrichment_data`.

---

## 10) Known App Behavior / Constraints

- n8n trigger is non-blocking with 10s timeout on initial request.
- If n8n is unavailable, Signafy still returns accepted response but marks as queued/fallback messaging.
- Callback route currently handles `lead_discovery`, plus other workflow types in same endpoint.
- `workflow_runs` status values allowed: `pending`, `running`, `complete`, `failed`.
- Realtime publication includes `leads` and `workflow_runs`, so UI can update quickly after callback writes.

---

## 11) Testing Checklist (Minimum)

1. Launch discovery from UI with B2C + all three B2C sources.
2. Confirm n8n receives `target_market=b2c` and source list.
3. Return signed success callback with 2-3 mock leads.
4. Verify:
   - `workflow_runs` row moves to `complete`
   - leads appear in UI
   - lead activities created
5. Launch discovery with B2B and selected B2B sources.
6. Send signed failure callback and verify `workflow_runs.error_message`.
7. Verify dedupe behavior with repeated email across callbacks.

---

## 12) File Map (Where Things Live)

- Lead page UI: `src/app/(app)/leads/page.tsx`
- Lead API: `src/app/api/leads/route.ts`
- n8n trigger/signing: `src/lib/n8n.ts`
- n8n callback endpoint: `src/app/api/webhooks/n8n/route.ts`
- Supabase server client/context: `src/lib/supabase/server.ts`
- Types: `src/lib/supabase/types.ts`
- Schema: `supabase/migrations/001_initial_schema.sql`
- RLS/pubs: `supabase/migrations/002_rls_policies.sql`
- Env template: `.env.example`

---

## 13) Immediate Next Build Tasks

1. Build/adjust n8n `lead-discovery` workflow to honor `target_market` and source arrays.
2. Add source-specific collectors for B2C conversations (`reddit`, reviews, directories).
3. Add deterministic dedupe + score function in n8n.
4. Ensure signed callback delivery and retry policy.
5. Add monitoring dashboard for run success/fail by source.

