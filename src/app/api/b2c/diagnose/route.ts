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

async function checkSerper(): Promise<Check> {
  const key = process.env.SERPER_API_KEY;
  if (!key) {
    return { name: "serper", status: "fail", detail: "SERPER_API_KEY is missing. Get one at serper.dev." };
  }

  const resp = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": key },
    body: JSON.stringify({ q: "signafyai connectivity check", num: 1 }),
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) {
    const text = redact(await resp.text().catch(() => ""));
    const guess =
      resp.status === 401 || resp.status === 403
        ? "Bad or revoked key."
        : resp.status === 402
          ? "Out of Serper credits."
          : resp.status === 429
            ? "Rate limited — Serper caps concurrent searches."
            : "Check the Serper dashboard.";
    return { name: "serper", status: "fail", detail: `HTTP ${resp.status}: ${text} — ${guess}` };
  }

  const data = (await resp.json()) as { organic?: unknown[] };
  return { name: "serper", status: "ok", detail: `search returned ${data.organic?.length ?? 0} organic result(s)` };
}

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const checks = await Promise.all([timed("openai", checkOpenAI), timed("serper", checkSerper)]);

  const env = {
    OPENAI_API_KEY: fingerprint(process.env.OPENAI_API_KEY),
    // Not a secret, and the single most likely cause of `extraction_failed`.
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "unset (correct when AI_PROVIDER=openai)",
    AI_MODEL: process.env.AI_MODEL ?? "unset (defaults to gpt-4o-mini)",
    AI_PROVIDER: process.env.AI_PROVIDER ?? "unset",
    SERPER_API_KEY: fingerprint(process.env.SERPER_API_KEY),
    VERCEL_ENV: process.env.VERCEL_ENV ?? "local",
  };

  const failing = checks.filter((c) => c.status === "fail");
  const healthy = failing.length === 0;

  return jsonResponse({
    healthy,
    summary: healthy
      ? "Both dependencies are reachable. Any demo fallback from /api/b2c/search now means the search genuinely found nothing — check debug.profiles_extracted vs profiles_kept."
      : `Broken: ${failing.map((c) => c.name).join(", ")}. Fix these before touching queries or prompts.`,
    checks,
    env,
  });
}
