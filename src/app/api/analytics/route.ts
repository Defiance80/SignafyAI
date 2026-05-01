import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";

export async function GET(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "30d";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  // Calculate date range
  let fromDate: string;
  const toDate = to ?? new Date().toISOString().split("T")[0];

  if (from) {
    fromDate = from;
  } else {
    const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "12m" ? 365 : 30;
    const d = new Date();
    d.setDate(d.getDate() - days);
    fromDate = d.toISOString().split("T")[0];
  }

  const db = getSupabaseServiceClient();
  if (!db) {
    return jsonResponse({
      overview: DEMO_OVERVIEW,
      daily: DEMO_DAILY,
      platforms: DEMO_PLATFORMS,
      top_content: DEMO_TOP_CONTENT,
    });
  }

  const [overviewRes, dailyRes] = await Promise.all([
    db.from("analytics_daily")
      .select("*")
      .eq("org_id", ctx.org.id)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true }),
    db.from("content_pieces")
      .select("id, type, platform, engagement_prediction, body, created_at")
      .eq("org_id", ctx.org.id)
      .eq("status", "published")
      .order("engagement_prediction", { ascending: false })
      .limit(10),
  ]);

  const rows = overviewRes.data ?? [];
  const overview = {
    total_reach: rows.reduce((s, r) => s + (r.total_reach ?? 0), 0),
    total_impressions: rows.reduce((s, r) => s + (r.total_impressions ?? 0), 0),
    total_engagement: rows.reduce((s, r) => s + (r.total_engagement ?? 0), 0),
    avg_engagement_rate: rows.length ? rows.reduce((s, r) => s + (r.engagement_rate ?? 0), 0) / rows.length : 0,
    leads_generated: rows.reduce((s, r) => s + (r.leads_generated ?? 0), 0),
    conversions: rows.reduce((s, r) => s + (r.conversions ?? 0), 0),
    revenue_attributed: rows.reduce((s, r) => s + (Number(r.revenue_attributed) ?? 0), 0),
  };

  return jsonResponse({
    overview,
    daily: rows,
    platforms: [],
    top_content: dailyRes.data ?? [],
  });
}

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_OVERVIEW = {
  total_reach: 1_240_000,
  total_impressions: 3_800_000,
  total_engagement: 58_280,
  avg_engagement_rate: 4.7,
  leads_generated: 847,
  conversions: 73,
  revenue_attributed: 48200,
};

const DEMO_DAILY = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  return {
    date: d.toISOString().split("T")[0],
    total_reach: 20000 + Math.floor(Math.random() * 30000),
    engagement_rate: 3.5 + Math.random() * 3,
    leads_generated: 15 + Math.floor(Math.random() * 40),
    revenue_attributed: 800 + Math.floor(Math.random() * 2000),
  };
});

const DEMO_PLATFORMS = [
  { name: "Instagram", reach: 480000, engagement_rate: 5.2, leads: 312, pct: 40 },
  { name: "LinkedIn", reach: 320000, engagement_rate: 3.8, leads: 256, pct: 27 },
  { name: "TikTok", reach: 240000, engagement_rate: 6.1, leads: 148, pct: 20 },
  { name: "Twitter/X", reach: 110000, engagement_rate: 2.4, leads: 89, pct: 9 },
  { name: "Facebook", reach: 90000, engagement_rate: 1.9, leads: 42, pct: 4 },
];

const DEMO_TOP_CONTENT = [
  { title: "5 AI Marketing Trends for 2025", platform: "LinkedIn", reach: "84.2K", engagement: "6.8%", type: "Blog Post" },
  { title: "Behind the Scenes: Agency Life", platform: "Instagram", reach: "62.1K", engagement: "8.3%", type: "Reel" },
  { title: "Lead Gen Framework Breakdown", platform: "TikTok", reach: "55.8K", engagement: "9.1%", type: "Video" },
  { title: "Why We Ditched Cold Email", platform: "Twitter/X", reach: "42.3K", engagement: "4.2%", type: "Thread" },
  { title: "Client Success: Bloom Digital", platform: "LinkedIn", reach: "38.7K", engagement: "5.5%", type: "Case Study" },
];
