"use client";

import { useState } from "react";

const METRICS = [
  { label: "Total Reach", value: "1.2M", delta: "+18.3%", up: true, color: "#7c3aed" },
  { label: "Engagement Rate", value: "4.7%", delta: "+0.8%", up: true, color: "#0891b2" },
  { label: "Leads Generated", value: "847", delta: "+124", up: true, color: "#059669" },
  { label: "Revenue Attributed", value: "$48.2K", delta: "+22.1%", up: true, color: "#d97706" },
];

const CHART_DATA = [
  12, 15, 18, 14, 22, 25, 20, 28, 32, 30, 35, 38, 33, 40, 42, 38, 45, 48, 44, 50, 55, 52, 58, 60, 56, 62, 65, 68, 72, 70,
];

const PLATFORMS_DATA = [
  { name: "Instagram", reach: "480K", engagement: "5.2%", leads: 312, color: "#e040fb", pct: 40 },
  { name: "LinkedIn", reach: "320K", engagement: "3.8%", leads: 256, color: "#0a66c2", pct: 27 },
  { name: "TikTok", reach: "240K", engagement: "6.1%", leads: 148, color: "#00f2ea", pct: 20 },
  { name: "Twitter/X", reach: "110K", engagement: "2.4%", leads: 89, color: "#8899a6", pct: 9 },
  { name: "Facebook", reach: "50K", engagement: "1.9%", leads: 42, color: "#1877f2", pct: 4 },
];

const TOP_CONTENT = [
  { title: "5 AI Marketing Trends for 2025", platform: "LinkedIn", reach: "84.2K", engagement: "6.8%", type: "Blog Post" },
  { title: "Behind the Scenes: Agency Life", platform: "Instagram", reach: "62.1K", engagement: "8.3%", type: "Reel" },
  { title: "Lead Gen Framework Breakdown", platform: "TikTok", reach: "55.8K", engagement: "9.1%", type: "Video" },
  { title: "Why We Ditched Cold Email", platform: "Twitter/X", reach: "42.3K", engagement: "4.2%", type: "Thread" },
  { title: "Client Success Story: Bloom Digital", platform: "LinkedIn", reach: "38.7K", engagement: "5.5%", type: "Case Study" },
];

function AreaChart() {
  const max = Math.max(...CHART_DATA);
  const w = 800, h = 200;
  const points = CHART_DATA.map((v, i) => `${(i / (CHART_DATA.length - 1)) * w},${h - (v / max) * (h - 20)}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 200 }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="0" y1={(i / 4) * h} x2={w} y2={(i / 4) * h} stroke="var(--color-border-subtle)" strokeWidth="0.5" />
      ))}
      <polygon points={areaPoints} fill="url(#chartGrad)" />
      <polyline points={points} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState("30d");
  const ranges = [{ label: "7 days", value: "7d" }, { label: "30 days", value: "30d" }, { label: "90 days", value: "90d" }, { label: "12 months", value: "12m" }];

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Performance insights</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Analytics</h1>
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
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{m.label}</span>
              <span className="text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 7V3M3 5l2-2 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {m.delta}
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.2s" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Growth Trend</h2>
        <AreaChart />
        <div className="flex justify-between mt-2 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          <span>Apr 1</span><span>Apr 8</span><span>Apr 15</span><span>Apr 22</span><span>Apr 30</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Platform Breakdown */}
        <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.25s" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Platform Breakdown</h2>
          <div className="space-y-3">
            {PLATFORMS_DATA.map((p) => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-1)" }}>{p.name}</span>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{p.reach} reach · {p.leads} leads</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: "var(--color-surface-2)" }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${p.pct}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Content */}
        <div className="rounded-2xl animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.3s" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Top Performing Content</h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
            {TOP_CONTENT.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-6 py-3.5 transition-colors"
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span className="text-lg font-bold w-6 text-center" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-muted)" }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--color-text-1)" }}>{c.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{c.platform} · {c.type}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium" style={{ color: "var(--color-text-1)" }}>{c.reach}</div>
                  <div className="text-xs" style={{ color: "#34d399" }}>{c.engagement} eng.</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
