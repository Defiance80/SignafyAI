"use client";

import { useState } from "react";

const KEYWORDS = [
  { keyword: "ai marketing tools", volume: 14800, difficulty: "Hard", cpc: "$4.20", trend: "up" },
  { keyword: "social media automation", volume: 12100, difficulty: "Hard", cpc: "$3.85", trend: "up" },
  { keyword: "lead generation software", volume: 9900, difficulty: "Hard", cpc: "$8.50", trend: "up" },
  { keyword: "content marketing strategy", volume: 8100, difficulty: "Medium", cpc: "$3.20", trend: "stable" },
  { keyword: "seo keyword research tool", volume: 6600, difficulty: "Medium", cpc: "$5.40", trend: "up" },
  { keyword: "email marketing automation", volume: 5400, difficulty: "Medium", cpc: "$4.10", trend: "stable" },
  { keyword: "digital marketing agency near me", volume: 4900, difficulty: "Easy", cpc: "$12.30", trend: "up" },
  { keyword: "brand voice generator", volume: 3600, difficulty: "Easy", cpc: "$2.80", trend: "up" },
  { keyword: "tiktok marketing strategy", volume: 3200, difficulty: "Medium", cpc: "$2.40", trend: "up" },
  { keyword: "b2b lead scoring", volume: 2900, difficulty: "Medium", cpc: "$6.70", trend: "stable" },
  { keyword: "instagram growth service", volume: 2400, difficulty: "Easy", cpc: "$3.90", trend: "down" },
  { keyword: "marketing workflow automation", volume: 1900, difficulty: "Easy", cpc: "$4.60", trend: "up" },
  { keyword: "ai copywriting tool", volume: 1800, difficulty: "Medium", cpc: "$3.50", trend: "up" },
  { keyword: "competitor analysis tool", volume: 1600, difficulty: "Hard", cpc: "$5.80", trend: "stable" },
  { keyword: "social media scheduler", volume: 1400, difficulty: "Medium", cpc: "$3.10", trend: "down" },
  { keyword: "marketing campaign management", volume: 1200, difficulty: "Medium", cpc: "$4.90", trend: "stable" },
  { keyword: "linkedin lead generation", volume: 1100, difficulty: "Hard", cpc: "$7.20", trend: "up" },
  { keyword: "content calendar tool", volume: 980, difficulty: "Easy", cpc: "$2.60", trend: "stable" },
  { keyword: "seo audit service", volume: 880, difficulty: "Easy", cpc: "$9.40", trend: "up" },
  { keyword: "growth marketing platform", volume: 720, difficulty: "Easy", cpc: "$5.10", trend: "up" },
];

const DIFF_STYLES: Record<string, { color: string; bg: string }> = {
  Easy: { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  Medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  Hard: { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

const CLUSTERS = [
  { name: "AI Marketing", keywords: 12, volume: "42.3K", color: "#7c3aed" },
  { name: "Lead Generation", keywords: 8, volume: "28.1K", color: "#0891b2" },
  { name: "Content Strategy", keywords: 15, volume: "35.6K", color: "#059669" },
  { name: "Social Automation", keywords: 10, volume: "21.8K", color: "#d97706" },
];

const COMPETITORS = [
  { name: "HubSpot", overlap: 67, unique: 234, gap: 89 },
  { name: "Semrush", overlap: 54, unique: 312, gap: 156 },
  { name: "Hootsuite", overlap: 41, unique: 189, gap: 112 },
];

export default function SeoPage() {
  const [search, setSearch] = useState("");
  const filtered = KEYWORDS.filter((k) => !search || k.keyword.includes(search.toLowerCase()));

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Research & optimize</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>SEO Research</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M3 8l2.5-3L8 7l3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search keywords or enter a domain..."
          className="w-full px-5 py-3.5 rounded-2xl text-sm outline-none transition-all"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-1)" }}
        />
      </div>

      {/* Clusters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: "0.15s" }}>
        {CLUSTERS.map((c, i) => (
          <div
            key={c.name}
            className="rounded-2xl p-5 transition-all duration-300 relative overflow-hidden"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.border = `1px solid ${c.color}33`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${c.color}15`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none opacity-30" style={{ background: `radial-gradient(circle, ${c.color}25 0%, transparent 70%)`, transform: "translate(25%, -25%)" }} />
            <div className="text-xs font-semibold mb-1" style={{ color: c.color }}>{c.name}</div>
            <div className="text-xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>{c.volume}</div>
            <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{c.keywords} keywords</div>
          </div>
        ))}
      </div>

      {/* Keywords Table */}
      <div className="rounded-2xl overflow-hidden animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.2s" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Keyword Opportunities</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                {["Keyword", "Volume", "Difficulty", "CPC", "Trend"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((kw) => {
                const d = DIFF_STYLES[kw.difficulty];
                return (
                  <tr
                    key={kw.keyword}
                    className="transition-colors cursor-default"
                    style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <td className="px-6 py-3 font-medium" style={{ color: "var(--color-text-1)" }}>{kw.keyword}</td>
                    <td className="px-6 py-3" style={{ color: "var(--color-text-2)" }}>{kw.volume.toLocaleString()}</td>
                    <td className="px-6 py-3"><span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: d.bg, color: d.color }}>{kw.difficulty}</span></td>
                    <td className="px-6 py-3" style={{ color: "var(--color-text-2)" }}>{kw.cpc}</td>
                    <td className="px-6 py-3">
                      <span style={{ color: kw.trend === "up" ? "#34d399" : kw.trend === "down" ? "#f87171" : "var(--color-text-muted)" }}>
                        {kw.trend === "up" ? "↑" : kw.trend === "down" ? "↓" : "→"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Competitor Gap */}
      <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.3s" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Competitor Gap Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COMPETITORS.map((c) => (
            <div key={c.name} className="rounded-xl p-4" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}>
              <div className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-1)" }}>{c.name}</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span style={{ color: "var(--color-text-muted)" }}>Keyword overlap</span><span style={{ color: "#a78bfa" }}>{c.overlap}%</span></div>
                <div className="flex justify-between"><span style={{ color: "var(--color-text-muted)" }}>Their unique keywords</span><span style={{ color: "var(--color-text-2)" }}>{c.unique}</span></div>
                <div className="flex justify-between"><span style={{ color: "var(--color-text-muted)" }}>Gap opportunities</span><span style={{ color: "#34d399" }}>{c.gap}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
