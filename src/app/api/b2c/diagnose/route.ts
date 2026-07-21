import { requireOrgContext } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import OpenAI from "openai";

export const maxDuration = 30;

/**
 * GET /api/b2c/diagnose
 *
 * Preflight for the B2C lead pipeline. Hits every upstream dependency with the
 * smallest possible request and reports exactly which one is broken.
 *
 * This exists because `/api/b2c/search` can only tell you *that* something failed.
 * When the deploy is on Vercel and you can't read the env vars, this tells you *what*.
 *
 * Auth-gated. Secrets are never returned — only presence, length, and prefix.
 */

type CheckStatus = "ok" | "fail" | "skipped";

interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
  latency_ms?: number;
}

/** Show enough to identify a key, never enough to use one. */
function fingerprint(value: string | undefined): string {
  if (!value) return "MISSING";
  return `set (len ${value.length}, starts "${value.slice(0, 6)}…")`;
}

function redact(text: string): string {
  return text
    .replace(/\b(sk-[A-Za-z0-9_-]{8,}|fc-[A-Za-z0-9_-]{8,}|Bearer\s+\S+)/gi, "[redacted]")
    .slice(0, 240);
}

/** Times a check and turns any thrown error (timeout, DNS, TLS) into a `fail` row. */
async function timed(name: string, fn: () => Promise<Check>): Promise<Check> {
  const t0 = Date.now();
  try {
    const result = await fn();
    return { ...result, latency_ms: Date.now() - t0 };
  } catch (err) {
    return {
      name,
      status: "fail",
      detail: redact(err instanceof Error ? err.message : String(err)),
      latency_ms: Date.now() - t0,
    };
  }
}

async function checkOpenAI(): Promise<Check> {
  const key = process.env.OPENAI_API_KEY;
  // Empty string is not nullish — normalise it away or the SDK treats "" as the host.
  const baseURL = process.env.OPENAI_BASE_URL || undefined;
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";

  if (!key) return { name: "openai", status: "fail", detail: "OPENAI_API_KEY is missing" };

  const openai = new OpenAI({ apiKey: key, baseURL });

  try {
    // Smallest possible round trip that still exercises auth + model access + JSON mode.
    const resp = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: 'Reply with exactly: {"ok":true}' }],
      response_format: { type: "json_object" },
      max_tokens: 20,
      temperature: 0,
    });
    const content = resp.choices[0]?.message?.content ?? "";
    JSON.parse(content); // if this throws, JSON mode isn't behaving on this provider
    return {
      name: "openai",
      status: "ok",
      detail: `model "${model}" responded${baseURL ? ` via custom baseURL ${baseURL}` : " via api.openai.com"}`,
    };
  } catch (err) {
    const msg = redact(err instanceof Error ? err.message : String(err));
    // The three failures that actually happen, named.
    const guess = /401|invalid_api_key|Incorrect API key/i.test(msg)
      ? baseURL
        ? `Auth failed. OPENAI_BASE_URL is set to "${baseURL}" — an OpenAI key sent to a different provider always 401s. Unset it.`
        : "Auth failed. The key is invalid, revoked, or scoped to a different project."
      : /model.*(not found|does not exist)|404/i.test(msg)
        ? `Model "${model}" is not available to this key. Check AI_MODEL.`
        : /quota|429|rate.?limit|billing/i.test(msg)
          ? "Quota or rate limit. Check billing on the OpenAI project."
          : "Unclassified failure — read `detail`.";
    return { name: "openai", status: "fail", detail: `${msg} — ${guess}` };
  }
}

/**
 * Reddit is the primary free source. Without OAuth it's blocked from datacenter IPs,
 * so a "skipped" here means Reddit will silently return nothing in production.
 */
async function checkReddit(): Promise<Check> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) {
    return {
      name: "reddit",
      status: "fail",
      detail:
        "REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET not set. Reddit blocks unauthenticated requests from datacenter IPs (Vercel), so Reddit results will be empty in production. Create a free 'script' app at reddit.com/prefs/apps.",
    };
  }

  const tokenResp = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "User-Agent": "SignafyAI/1.0 b2c-diagnose",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(8000),
  });
  if (!tokenResp.ok) {
    return { name: "reddit", status: "fail", detail: `token HTTP ${tokenResp.status}: ${redact(await tokenResp.text().catch(() => ""))}` };
  }
  const { access_token } = (await tokenResp.json()) as { access_token?: string };
  if (!access_token) return { name: "reddit", status: "fail", detail: "token endpoint returned no access_token" };

  const searchResp = await fetch("https://oauth.reddit.com/search?q=test&limit=1&type=link&raw_json=1", {
    headers: { Authorization: `Bearer ${access_token}`, "User-Agent": "SignafyAI/1.0 b2c-diagnose" },
    signal: AbortSignal.timeout(8000),
  });
  if (!searchResp.ok) return { name: "reddit", status: "fail", detail: `authenticated search HTTP ${searchResp.status}` };
  return { name: "reddit", status: "ok", detail: "OAuth token issued and authenticated search succeeded" };
}

/** DuckDuckGo HTML is the free web sweep. It throttles datacenter IPs, so a fail
 *  here is common and non-fatal — Reddit carries the search on its own. */
async function checkDuckDuckGo(): Promise<Check> {
  const resp = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
    body: "q=signafyai connectivity check",
    signal: AbortSignal.timeout(9000),
  });
  if (!resp.ok) {
    return { name: "duckduckgo", status: "fail", detail: `HTTP ${resp.status} — DuckDuckGo throttles server IPs. Non-fatal; Reddit still works.` };
  }
  const html = await resp.text();
  const hits = (html.match(/class="result__a"/g) ?? []).length;
  return hits > 0
    ? { name: "duckduckgo", status: "ok", detail: `returned ${hits} web result(s)` }
    : { name: "duckduckgo", status: "fail", detail: "200 but zero results — likely soft-blocked this IP. Non-fatal." };
}

/** Free geocoder. Confirms zip/city → coordinates works for local scoping. */
async function checkGeocode(): Promise<Check> {
  const resp = await fetch("https://api.zippopotam.us/us/90210", {
    headers: { "User-Agent": "SignafyAI/1.0 b2c-diagnose" },
    signal: AbortSignal.timeout(6000),
  });
  if (!resp.ok) return { name: "geocode", status: "fail", detail: `Zippopotam HTTP ${resp.status}. Location scoping degrades to raw text.` };
  const data = (await resp.json()) as { places?: Array<{ "place name"?: string }> };
  return { name: "geocode", status: "ok", detail: `zip lookup ok (90210 → ${data.places?.[0]?.["place name"] ?? "?"})` };
}

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const checks = await Promise.all([
    timed("openai", checkOpenAI),
    timed("reddit", checkReddit),
    timed("duckduckgo", checkDuckDuckGo),
    timed("geocode", checkGeocode),
  ]);

  const env = {
    OPENAI_API_KEY: fingerprint(process.env.OPENAI_API_KEY),
    // Not a secret, and the single most likely cause of `extraction_failed`.
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "unset (correct when AI_PROVIDER=openai)",
    AI_MODEL: process.env.AI_MODEL ?? "unset (defaults to gpt-4o-mini)",
    AI_PROVIDER: process.env.AI_PROVIDER ?? "unset",
    REDDIT_CLIENT_ID: fingerprint(process.env.REDDIT_CLIENT_ID),
    REDDIT_CLIENT_SECRET: fingerprint(process.env.REDDIT_CLIENT_SECRET),
    VERCEL_ENV: process.env.VERCEL_ENV ?? "local",
  };

  const openaiOk = checks.find((c) => c.name === "openai")?.status === "ok";
  const redditOk = checks.find((c) => c.name === "reddit")?.status === "ok";
  const ddgOk = checks.find((c) => c.name === "duckduckgo")?.status === "ok";
  // The pipeline works if the AI is reachable AND at least one search source is live.
  const canReturnRealLeads = openaiOk && (redditOk || ddgOk);

  return jsonResponse({
    healthy: canReturnRealLeads,
    can_return_real_leads: canReturnRealLeads,
    summary: canReturnRealLeads
      ? "The AI plus at least one free search source are live. Any demo fallback now means the search genuinely found nothing local — check debug.profiles_extracted vs profiles_kept."
      : !openaiOk
        ? "OpenAI is unreachable — fix that first; nothing else matters until it works."
        : "Both search sources are down. Reddit needs REDDIT_CLIENT_ID/SECRET; DuckDuckGo throttles server IPs. Set up Reddit OAuth.",
    checks,
    env,
  });
}
