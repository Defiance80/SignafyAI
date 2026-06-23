# WF2 — B2C Consumer Intent Finder Setup

## What This Does

Receives B2C discovery requests from the BW Router (WF0), searches Reddit/Yelp/YouTube/Twitter
for consumer buying signals using Firecrawl, scores them with GPT, and posts results
back to SignafyAI's webhook handler.

**Data flow:**
```
App → BW Router (WF0) → WF2 (this workflow)
  └─ Firecrawl search (per source)
  └─ GPT intent scoring
  └─ POST back → /api/webhooks/n8n (workflow_type: intent_discovery)
  └─ UI shows results in Leads → Intent tab
```

## Step 1 — Set Environment Variables in n8n

In your n8n instance: **Settings → Environment Variables** (or set in your VPS `.env` / `docker-compose.yml`)

| Variable | Value |
|---|---|
| `FIRECRAWL_API_KEY` | `fc-8429e43158894cd595ee57b44f240a27` |
| `OPENAI_API_KEY` | *(already set from WF1)* |
| `N8N_HMAC_SECRET` | `be600a5bda38c209bd4d9a9150728bb207ba544a338438e8ed01c4ad9dbf440b` |

## Step 2 — Import WF2

1. Open your n8n instance: https://n8n.srv1104500.hstgr.cloud
2. Go to **Workflows → Import from File**
3. Upload `scripts/wf2-consumer-intent.json`
4. The workflow imports with webhook path: `/webhook/bw-consumer-intent`
5. **Activate the workflow** (toggle at top right)

The live webhook URL will be:
```
https://n8n.srv1104500.hstgr.cloud/webhook/bw-consumer-intent
```

## Step 3 — Update WF0 (BW Router) to Route B2C

In n8n, open your existing **BW Router (WF0)** workflow and add a B2C branch.

The router receives the full payload and needs to check `target_market`:

**Add an IF node** after the initial webhook/parse:
- Condition: `{{ $json.target_market }}` **equals** `b2c`
- OR: `{{ $json.target_market }}` **equals** `both`

**True branch** → HTTP Request node:
- Method: POST
- URL: `https://n8n.srv1104500.hstgr.cloud/webhook/bw-consumer-intent`
- Body: `={{ JSON.stringify($json) }}`
- Headers: same HMAC signing as existing calls (or just forward the payload)

**If already using a Switch node**, add a new case for `b2c` and `both` values.

The simplest approach: in the Switch/IF that routes to WF1 (B2B), add a parallel route that also 
fires WF2 when `target_market === 'b2c'` or `target_market === 'both'`.

## Step 4 — Get n8n API Key (for future programmatic updates)

1. In n8n: **Settings → API Keys → Add API Key**
2. Copy the key
3. Add to `SignafyAI/.env.local`:
   ```
   N8N_API_KEY=<your-key>
   ```
4. Also add to Vercel environment variables

## Step 5 — Test

Trigger a B2C discovery from the SignafyAI app:
1. Go to Leads → New Discovery
2. Select **B2C Intent** 
3. Enter: "Homeowners in Phoenix looking for HVAC repair"
4. Click Discover

Expected flow:
- App fires BW Router → WF0 routes to WF2
- Firecrawl searches Reddit/Yelp for Phoenix HVAC signals  
- GPT scores intent signals
- Results appear in **Leads → Intent** tab within ~30-60 seconds

## Supported Sources

| Source | Query pattern |
|---|---|
| `reddit` | `site:reddit.com "{industry}" "{location}" (recommend OR "looking for" OR advice)` |
| `yelp` | `site:yelp.com "{industry}" "{location}" review` |
| `youtube` | `site:youtube.com "{industry}" "{location}" (review OR recommend)` |
| `twitter` | `site:x.com "{industry}" "{location}" (recommend OR looking OR need)` |
| `google` | General web search for intent signals |

## Firecrawl Notes

- Uses `/v1/search` endpoint — searches Google + scrapes result pages
- Returns markdown content from each result page
- 8 results per source query
- Works on public Reddit, Yelp, YouTube pages without auth
- API key: `fc-8429e43158894cd595ee57b44f240a27`
- Docs: https://docs.firecrawl.dev/api-reference/endpoint/search

## Troubleshooting

**No results returned**: Firecrawl couldn't find content → try broader keywords or remove location restriction

**GPT returns empty array**: Content found but no clear buying intent → normal for very niche industries

**Callback 401**: HMAC secret mismatch → verify `N8N_HMAC_SECRET` matches in both n8n and Vercel/SignafyAI

**WF0 not routing to WF2**: Check that the BW Router's IF/Switch checks `target_market === "b2c"` and the URL points to `bw-consumer-intent`