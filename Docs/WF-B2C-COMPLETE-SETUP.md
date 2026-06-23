# B2C Full Setup & Connection Guide

**Last updated**: 2026-06-23  
**Status**: WF2 + WF3 built, need manual n8n import + env vars

---

## What the B2C Stack Does

1. User clicks **Run Discovery → B2C Intent** in the app
2. App fires `POST /api/leads` → triggers **WF0 (BW Router)**
3. WF0 routes the payload to **WF2** (`/webhook/bw-consumer-intent`)
4. WF2 uses **Firecrawl** to search Reddit, Yelp, YouTube, Twitter for real consumer posts
5. WF2's GPT layer scores each post (intent score 0-100), classifies buying stage & urgency
6. WF2 calls back to `/api/webhooks/n8n` with signed payload → rows inserted into `intent_signals`
7. Supabase Realtime fires → UI auto-refreshes the **Intent Signals** tab
8. User clicks a signal → **Signal Drawer** opens
9. User clicks **Generate Funnel Assets** → fires `POST /api/generated-assets/generate`
10. That endpoint calls **WF3** (`/webhook/bw-asset-generator`) OR falls back to GPT directly
11. WF3 generates: landing page, FAQ, CTA, email sequence, AI script, blog outline, social posts, video script
12. WF3 calls back → rows inserted into `generated_assets` → **Funnel Assets** tab updates

---

## Setup Checklist

### Step 1 — n8n Environment Variables (must be set before anything works)

SSH into your VPS (`n8n.srv1104500.hstgr.cloud`) and add these to n8n's environment:

```bash
# In n8n UI: Settings → Variables → Add
FIRECRAWL_API_KEY = <your Firecrawl key from firecrawl.dev>
OPENAI_API_KEY    = <your OpenAI key>
N8N_HMAC_SECRET   = <copy from your .env.local N8N_HMAC_SECRET>
```

OR via `docker-compose.yml` / `.env` on the VPS:
```yaml
environment:
  FIRECRAWL_API_KEY: <your Firecrawl key>
  N8N_HMAC_SECRET:   <copy from .env.local>
  OPENAI_API_KEY:    sk-...
```

---

### Step 2 — Get Your n8n API Key

1. n8n UI → top-right avatar → **Settings → API Keys → Add API Key**
2. Copy the key
3. Add to Vercel env vars:
   ```
   N8N_API_KEY = n8n_api_...
   ```
4. Add to your local `.env.local`:
   ```
   N8N_API_KEY=n8n_api_...
   ```

---

### Step 3 — Import WF2 (Consumer Intent Finder)

1. In n8n UI: **Workflows → Import from File**
2. Select `scripts/wf2-consumer-intent.json`
3. Click **Import**
4. Open the workflow, click **Active** toggle to activate it
5. Confirm the webhook path is `bw-consumer-intent`

---

### Step 4 — Import WF3 (Funnel Asset Generator)

1. Same as above, select `scripts/wf3-funnel-asset-generator.json`
2. Activate it
3. Confirm webhook path is `bw-asset-generator`

---

### Step 5 — Update WF0 (BW Router) for B2C Routing

In WF0, find the router/switch node and add a new branch:

**Condition**: `{{ $json.body.target_market === 'b2c' || $json.body.target_market === 'both' }}`

**Output**: HTTP POST to `https://n8n.srv1104500.hstgr.cloud/webhook/bw-consumer-intent`

Pass through the full request body unchanged.

Optionally also handle `both`: route to WF1 for B2B AND WF2 for B2C in parallel.

---

### Step 6 — Verify Your App Env Vars (Vercel + .env.local)

```
FIRECRAWL_API_KEY=<your Firecrawl key>
N8N_WEBHOOK_BASE_URL=https://n8n.srv1104500.hstgr.cloud
N8N_HMAC_SECRET=<your HMAC secret — must match n8n env>
N8N_API_KEY=n8n_api_...
NEXT_PUBLIC_APP_URL=https://signafyai.com
OPENAI_API_KEY=sk-...
```

---

### Step 7 — Run a Test

1. In the app, click **Run Discovery**
2. Select **B2C Intent** tab
3. Describe target: *"Homeowners in Phoenix asking about HVAC repair on Reddit who are ready to book"*
4. Choose platforms: Reddit + Yelp
5. Click **Launch Discovery**
6. App switches to Intent Signals tab and shows a spinning banner
7. Wait 30-60 seconds for WF2 to run
8. Signals should appear in the Intent Signals list
9. Click a signal → Signal Drawer opens
10. Click **Generate Funnel Assets** → wait ~15s
11. Assets appear in the Funnel Assets tab

---

## Testing Without n8n (Direct GPT Fallback)

If n8n is unreachable, the **Generate Funnel Assets** button in the Signal Drawer  
calls GPT directly on the app server (no n8n needed). This means:

- **Intent Signals discovery** still requires WF2/n8n (no fallback currently)
- **Asset generation from a signal** works even without n8n (GPT fallback)

---

## Workflow Architecture Summary

```
User UI
  │
  ├─ Run Discovery (B2C)
  │     └─► POST /api/leads {target_market: "b2c", b2c_sources: [...]}
  │               └─► WF0 (BW Router)
  │                     └─► WF2 (Consumer Intent Finder) — Firecrawl + GPT
  │                           └─► /api/webhooks/n8n {workflow_type: "intent_discovery"}
  │                                 └─► INSERT intent_signals
  │                                       └─► Supabase Realtime → UI refresh
  │
  └─ Click Signal → Generate Assets
        └─► POST /api/generated-assets/generate {signal_id}
                  ├─► WF3 (Funnel Asset Generator) [if n8n up]
                  │     └─► /api/webhooks/n8n {workflow_type: "asset_generation"}
                  │           └─► INSERT generated_assets
                  │                 └─► Supabase Realtime → Funnel Assets tab
                  └─► GPT Direct [fallback if n8n down]
                        └─► INSERT generated_assets + return in response
```

---

## B2C Signal Flow (What Firecrawl Returns)

Firecrawl searches each platform like this:
- Reddit: `site:reddit.com "HVAC repair" "Phoenix" (recommend OR "looking for" OR advice)`
- Yelp: `site:yelp.com "HVAC repair" "Phoenix" review`
- YouTube: `site:youtube.com "HVAC repair" "Phoenix" (review OR "how to find" OR best)`
- Twitter: `(site:x.com OR site:twitter.com) "HVAC repair" "Phoenix" (recommend OR need OR help)`

GPT then reads all scraped content and outputs intent signals like:
```json
{
  "source": "reddit",
  "question": "My AC broke during the heatwave, need a reliable HVAC tech in Phoenix ASAP",
  "location": "Phoenix, AZ",
  "source_url": "https://reddit.com/r/phoenix/...",
  "intent_score": 89,
  "buying_stage": "Ready To Buy",
  "urgency": "High",
  "service": "HVAC Repair",
  "industry": "Home Services"
}
```

---

## Troubleshooting

### "n8n automation is not connected" warning
- Check `N8N_WEBHOOK_BASE_URL` in Vercel matches your n8n instance URL
- Make sure WF2 is active (green toggle in n8n)
- Try `curl https://n8n.srv1104500.hstgr.cloud/webhook/bw-consumer-intent -X POST -d '{}'`

### Signals appear but no assets generate
- WF3 not imported or not active
- Check `OPENAI_API_KEY` set in n8n environment
- Asset generation falls back to GPT direct if n8n fails — check Vercel logs

### Callback signature mismatch (401 from /api/webhooks/n8n)
- `N8N_HMAC_SECRET` in n8n env must EXACTLY match `N8N_HMAC_SECRET` in Vercel
- Current value: `be600a5bda38c209bd4d9a9150728bb207ba544a338438e8ed01c4ad9dbf440b`

### Webhook returns sign-in page
- The Clerk middleware is intercepting the webhook route
- Check `src/middleware.ts` — `/api/webhooks/n8n` should be in the public routes list

---

## Security Reminders

- **Rotate the VPS root password** — use a random 32-char string (the default is burned)
- Never expose `N8N_HMAC_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` to the browser
- `FIRECRAWL_API_KEY` is server-side only (in n8n env and Vercel server env)
- The old Apify token is burned — do not reuse it; Firecrawl replaces it entirely
