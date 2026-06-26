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
          <p style={{ fontSize: 14, color: "var(--c3)", marginBottom: 8, fontWeight: 500 }}>Performance insights</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--c1)", margin: 0, lineHeight: 1.1 }}>Analytics</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {ranges.map((r) => (
            <button key={r.value} onClick={() => setRange(r.value)} style={{
              padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 500,
              cursor: "pointer", transition: "all 0.2s",
              background: range === r.value ? "rgba(124,58,237,0.15)" : "var(--color-surface)",
              border: range === r.value ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border)",
              color: range === r.value ? "#a78bfa" : "var(--color-text-2)",
            }}>{r.label}</button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {METRICS.map((m, i) => (
          <div
            key={m.label}
            className="animate-fade-up"
            style={{
              borderRadius: 16, padding: "26px 28px", position: "relative", overflow: "hidden",
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              animationDelay: `${i * 0.07}s`, transition: "all 0.3s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.border = `1px solid ${m.color}33`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${m.color}15`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <div style={{ position: "absolute", top: 0, right: 0, width: 96, height: 96, borderRadius: "50%", pointerEvents: "none", opacity: 0.3, background: `radial-gradient(circle, ${m.color}25 0%, transparent 70%)`, transform: "translate(25%, -25%)" }} />
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12, color: "var(--c3)", letterSpacing: "0.03em" }}>{m.label}</div>
            <div className={loading ? "animate-pulse" : ""} style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--c1)" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="animate-fade-up" style={{ borderRadius: 16, padding: "28px 32px", background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.2s" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, color: "var(--c1)" }}>
            Reach Trend — <span style={{ fontWeight: 400, color: "var(--c3)" }}>{ranges.find(r => r.value === range)?.label}</span>
          </h2>
          <DynamicAreaChart data={chartData} />
        </div>
      )}

      {loading && (
        <div className="animate-pulse" style={{ borderRadius: 16, padding: "28px 32px", background: "var(--color-surface)", border: "1px solid var(--color-border)", height: 240 }} />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
        {/* Platform Breakdown */}
        <div className="animate-fade-up" style={{ borderRadius: 16, padding: "28px 32px", background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.25s" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, color: "var(--c1)" }}>Platform Breakdown</h2>
          {platforms.length === 0 ? (
            <p style={{ fontSize: 14, padding: "32px 0", textAlign: "center", color: "var(--c3)" }}>
              Connect social accounts to see platform breakdown.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {platforms.map((p) => {
                const color = PLATFORM_COLORS[p.name] ?? "#7c3aed";
                return (
                  <div key={p.name}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--c1)" }}>{p.name}</span>
                      <span style={{ fontSize: 12, color: "var(--c3)" }}>{fmt(p.reach)} reach · {p.leads} leads</span>
                    </div>
                    <div style={{ width: "100%", height: 6, borderRadius: 999, background: "var(--color-surface-2)" }}>
                      <div style={{ height: 6, borderRadius: 999, transition: "all 0.3s", width: `${p.pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Content */}
        <div className="animate-fade-up" style={{ borderRadius: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.3s", overflow: "hidden" }}>
          <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--color-border-subtle)" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--c1)" }}>Top Performing Content</h2>
          </div>
          {topContent.length === 0 ? (
            <div style={{ padding: "40px 28px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--c3)" }}>Generate and publish content to track performance.</p>
            </div>
          ) : (
            <div>
              {topContent.slice(0, 5).map((c, i) => (
                <div
                  key={i}
                  className="flex items-center transition-colors"
                  style={{ padding: "16px 28px", gap: 16, borderBottom: "1px solid var(--color-border-subtle)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 18, fontWeight: 800, width: 24, textAlign: "center", flexShrink: 0, color: "var(--c4)" }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--c1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title ?? (c.body ? c.body.slice(0, 60) + "…" : "Untitled")}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 2, color: "var(--c3)" }}>{c.platform} · {c.type ?? "Content"}</div>
                  </div>
                  {c.engagement_prediction != null && (
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, color: "#34d399" }}>{c.engagement_prediction.toFixed(1)}% eng.</div>
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
