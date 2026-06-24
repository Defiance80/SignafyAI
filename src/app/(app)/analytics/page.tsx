"use client";

import { useState, useEffect } from "react";

interface AnalyticsData {
  overview: {
    total_reach: number;
    total_impressions: number;
    total_engagement: number;
    avg_engagement_rate: number;
    leads_generated: number;
    conversions: number;
    revenue_attributed: number;
  };
  daily: { date: string; total_reach?: number; engagement_rate?: number; leads_generated?: number; revenue_attributed?: number }[];
  platforms: { name: string; reach: number; engagement_rate: number; leads: number; pct: number }[];
  top_content: { title?: string; body?: string; platform: string; engagement_prediction?: number; type?: string }[];
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "#e040fb",
  LinkedIn: "#0a66c2",
  TikTok: "#00f2ea",
  "Twitter/X": "#8899a6",
  Facebook: "#1877f2",
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function DynamicAreaChart({ data }: { data: number[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const w = 800, h = 200;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / Math.max(max, 1)) * (h - 20)}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 200 }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="0" y1={(i / 4) * h} x2={w} y2={(i / 4) * h} stroke="var(--color-border-subtle)" strokeWidth="0.5"/>
      ))}
      <polygon points={areaPoints} fill="url(#chartGrad)"/>
      <polyline points={points} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const ranges = [
    { label: "7 days", value: "7d" },
    { label: "30 days", value: "30d" },
    { label: "90 days", value: "90d" },
    { label: "12 months", value: "12m" },
  ];

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?range=${range}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  const overview = data?.overview;
  const chartData = (data?.daily ?? []).map((d) => d.total_reach ?? 0).filter((v) => v > 0);

  const METRICS = [
    { label: "Total Reach", value: overview ? fmt(overview.total_reach) : "—", color: "#7c3aed" },
    { label: "Engagement Rate", value: overview ? `${overview.avg_engagement_rate.toFixed(1)}%` : "—", color: "#0891b2" },
    { label: "Leads Generated", value: overview ? fmt(overview.leads_generated) : "—", color: "#059669" },
    { label: "Revenue Attributed", value: overview ? `$${fmt(overview.revenue_attributed)}` : "—", color: "#d97706" },
  ];

  const platforms = data?.platforms ?? [];
  const topContent = data?.top_content ?? [];

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.32)", marginBottom: 8, fontWeight: 500 }}>Performance insights</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: "rgba(255,255,255,0.95)", margin: 0, lineHeight: 1.1 }}>Analytics</h1>
        </div>
        <div className="flex gap-2">
          {ranges.map((r) => (
            <button key={r.value} onClick={() => setRange(r.value)} className="px-3 py-2 rounded-xl text-xs font-medium transition-all" style={{
              background: range === r.value ? "rgba(124,58,237,0.15)" : "var(--color-surface)",
              border: range === r.value ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border)",
              color: range === r.value ? "#a78bfa" : "var(--color-text-2)",
            }}>{r.label}</button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {METRICS.map((m, i) => (
          <div
            key={m.label}
            className="rounded-2xl p-5 animate-fade-up relative overflow-hidden transition-all duration-300"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: `${i * 0.07}s` }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.border = `1px solid ${m.color}33`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${m.color}15`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none opacity-30" style={{ background: `radial-gradient(circle, ${m.color}25 0%, transparent 70%)`, transform: "translate(25%, -25%)" }} />
            <div className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>{m.label}</div>
            <div className={`text-2xl font-bold ${loading ? "animate-pulse" : ""}`} style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.2s" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
            Reach Trend — <span className="font-normal" style={{ color: "var(--color-text-muted)" }}>{ranges.find(r => r.value === range)?.label}</span>
          </h2>
          <DynamicAreaChart data={chartData} />
        </div>
      )}

      {loading && (
        <div className="rounded-2xl p-6 animate-pulse" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", height: 240 }} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Platform Breakdown */}
        <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.25s" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Platform Breakdown</h2>
          {platforms.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
              Connect social accounts to see platform breakdown.
            </p>
          ) : (
            <div className="space-y-3">
              {platforms.map((p) => {
                const color = PLATFORM_COLORS[p.name] ?? "#7c3aed";
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-1)" }}>{p.name}</span>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{fmt(p.reach)} reach · {p.leads} leads</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: "var(--color-surface-2)" }}>
                      <div className="h-2 rounded-full transition-all" style={{ width: `${p.pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Content */}
        <div className="rounded-2xl animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.3s" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Top Performing Content</h2>
          </div>
          {topContent.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Generate and publish content to track performance.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
              {topContent.slice(0, 5).map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-6 py-3.5 transition-colors"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span className="text-lg font-bold w-6 text-center" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-muted)" }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "var(--color-text-1)" }}>
                      {c.title ?? (c.body ? c.body.slice(0, 60) + "…" : "Untitled")}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{c.platform} · {c.type ?? "Content"}</div>
                  </div>
                  {c.engagement_prediction != null && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs" style={{ color: "#34d399" }}>{c.engagement_prediction.toFixed(1)}% eng.</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
