"use client";

import { useState } from "react";

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  Active: { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  Paused: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  Completed: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  Draft: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

const CAMPAIGNS = [
  {
    name: "Q2 Brand Awareness Push",
    status: "Active",
    dates: "Apr 1 – Jun 30, 2025",
    budget: "$12,500",
    spent: "$4,830",
    channels: ["Instagram", "LinkedIn", "TikTok"],
    sparkline: [20, 35, 28, 45, 52, 48, 61, 55, 70, 65, 72, 80],
    color: "#7c3aed",
  },
  {
    name: "Summer Lead Gen Sprint",
    status: "Active",
    dates: "May 1 – Jul 31, 2025",
    budget: "$8,000",
    spent: "$1,200",
    channels: ["LinkedIn", "Facebook"],
    sparkline: [10, 15, 22, 18, 30, 25, 35, 40, 38, 45, 42, 50],
    color: "#0891b2",
  },
  {
    name: "Product Launch – SignafyAI v2",
    status: "Draft",
    dates: "Jun 15 – Jul 15, 2025",
    budget: "$20,000",
    spent: "$0",
    channels: ["Instagram", "LinkedIn", "Twitter/X", "TikTok"],
    sparkline: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    color: "#d97706",
  },
  {
    name: "Holiday Retargeting 2024",
    status: "Completed",
    dates: "Nov 15 – Dec 31, 2024",
    budget: "$15,000",
    spent: "$14,820",
    channels: ["Instagram", "Facebook"],
    sparkline: [40, 55, 70, 85, 92, 88, 95, 100, 98, 90, 75, 60],
    color: "#059669",
  },
  {
    name: "Thought Leadership Series",
    status: "Paused",
    dates: "Mar 1 – May 31, 2025",
    budget: "$5,000",
    spent: "$2,100",
    channels: ["LinkedIn", "Twitter/X"],
    sparkline: [15, 25, 30, 35, 28, 20, 18, 15, 12, 10, 8, 8],
    color: "#ef4444",
  },
  {
    name: "Agency Partner Outreach",
    status: "Active",
    dates: "Apr 15 – Jun 15, 2025",
    budget: "$6,500",
    spent: "$3,900",
    channels: ["LinkedIn"],
    sparkline: [8, 12, 18, 25, 30, 35, 42, 48, 55, 52, 60, 58],
    color: "#a78bfa",
  },
];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 120, h = 32;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      <polygon points={areaPoints} fill={`${color}15`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CampaignsPage() {
  const [tab, setTab] = useState("All");
  const tabs = ["All", "Active", "Paused", "Completed"];
  const filtered = CAMPAIGNS.filter((c) => tab === "All" || c.status === tab);

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Plan & execute</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Campaigns</h1>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          Create Campaign
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-2 rounded-xl text-xs font-medium transition-all" style={{
            background: tab === t ? "rgba(124,58,237,0.15)" : "var(--color-surface)",
            border: tab === t ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border)",
            color: tab === t ? "#a78bfa" : "var(--color-text-2)",
          }}>{t}</button>
        ))}
      </div>

      {/* Campaign Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c, i) => {
          const s = STATUS_STYLES[c.status];
          return (
            <div
              key={c.name}
              className="rounded-2xl p-5 animate-fade-up transition-all duration-300 relative overflow-hidden"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: `${0.15 + i * 0.07}s` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.border = `1px solid ${c.color}33`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${c.color}12`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none opacity-20" style={{ background: `radial-gradient(circle, ${c.color}30 0%, transparent 70%)`, transform: "translate(25%, -25%)" }} />
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold pr-2" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>{c.name}</h3>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0" style={{ background: s.bg, color: s.color }}>{c.status}</span>
              </div>
              <div className="text-xs mb-4 space-y-1.5" style={{ color: "var(--color-text-muted)" }}>
                <div>{c.dates}</div>
                <div className="flex gap-3">
                  <span>Budget: <span style={{ color: "var(--color-text-2)" }}>{c.budget}</span></span>
                  <span>Spent: <span style={{ color: "var(--color-text-2)" }}>{c.spent}</span></span>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div className="flex gap-1.5">
                  {c.channels.map((ch) => (
                    <span key={ch} className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)" }}>{ch}</span>
                  ))}
                </div>
                <Sparkline data={c.sparkline} color={c.color} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
