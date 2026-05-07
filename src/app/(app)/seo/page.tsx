"use client";

import { useState } from "react";

interface SeoKeyword {
  keyword: string;
  volume: number;
  difficulty: "Easy" | "Medium" | "Hard";
  cpc: string;
  trend: "up" | "down" | "stable";
  intent?: string;
}

interface SeoCluster {
  name: string;
  keywords: number;
  volume: string;
  color: string;
}

const DIFF_STYLES: Record<string, { color: string; bg: string }> = {
  Easy: { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  Medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  Hard: { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

const DEFAULT_KEYWORDS: SeoKeyword[] = [
  { keyword: "ai marketing tools", volume: 14800, difficulty: "Hard", cpc: "$4.20", trend: "up" },
  { keyword: "social media automation", volume: 12100, difficulty: "Hard", cpc: "$3.85", trend: "up" },
  { keyword: "lead generation software", volume: 9900, difficulty: "Hard", cpc: "$8.50", trend: "up" },
  { keyword: "content marketing strategy", volume: 8100, difficulty: "Medium", cpc: "$3.20", trend: "stable" },
  { keyword: "seo keyword research tool", volume: 6600, difficulty: "Medium", cpc: "$5.40", trend: "up" },
  { keyword: "digital marketing agency near me", volume: 4900, difficulty: "Easy", cpc: "$12.30", trend: "up" },
  { keyword: "brand voice generator", volume: 3600, difficulty: "Easy", cpc: "$2.80", trend: "up" },
  { keyword: "tiktok marketing strategy", volume: 3200, difficulty: "Medium", cpc: "$2.40", trend: "up" },
  { keyword: "b2b lead scoring", volume: 2900, difficulty: "Medium", cpc: "$6.70", trend: "stable" },
  { keyword: "marketing workflow automation", volume: 1900, difficulty: "Easy", cpc: "$4.60", trend: "up" },
  { keyword: "ai copywriting tool", volume: 1800, difficulty: "Medium", cpc: "$3.50", trend: "up" },
  { keyword: "linkedin lead generation", volume: 1100, difficulty: "Hard", cpc: "$7.20", trend: "up" },
];

const DEFAULT_CLUSTERS: SeoCluster[] = [
  { name: "AI Marketing", keywords: 12, volume: "42.3K", color: "#7c3aed" },
  { name: "Lead Generation", keywords: 8, volume: "28.1K", color: "#0891b2" },
  { name: "Content Strategy", keywords: 15, volume: "35.6K", color: "#059669" },
  { name: "Social Automation", keywords: 10, volume: "21.8K", color: "#d97706" },
];

function downloadCsv(keywords: SeoKeyword[], filename = "keywords.csv") {
  const header = "Keyword,Volume,Difficulty,CPC,Trend";
  const rows = keywords.map((k) => `"${k.keyword}",${k.volume},${k.difficulty},${k.cpc},${k.trend}`);
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SeoPage() {
  const [search, setSearch] = useState("");
  const [keywords, setKeywords] = useState<SeoKeyword[]>(DEFAULT_KEYWORDS);
  const [clusters, setClusters] = useState<SeoCluster[]>(DEFAULT_CLUSTERS);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTopic, setLastTopic] = useState("");

  const filtered = keywords.filter((k) => !search || k.keyword.toLowerCase().includes(search.toLowerCase()));

  async function handleResearch() {
    const topic = search.trim();
    if (!topic) {
      setError("Enter a keyword or domain to research.");
      return;
    }
    setError(null);
    setIsResearching(true);
    setLastTopic(topic);
    try {
      const res = await fetch("/api/seo/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, count: 20 }),
      });
      if (!res.ok) throw new Error("Research failed");
      const data = await res.json() as { keywords?: SeoKeyword[]; clusters?: SeoCluster[] };
      if (data.keywords && data.keywords.length > 0) {
        setKeywords(data.keywords);
        if (data.clusters && data.clusters.length > 0) setClusters(data.clusters);
      } else {
        setError("No keywords found. AI may not be configured — showing default data.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research failed. Check AI configuration.");
    } finally {
      setIsResearching(false);
    }
  }

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Research & optimize</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>SEO Research</h1>
        </div>
        <button
          onClick={() => downloadCsv(filtered, lastTopic ? `keywords-${lastTopic.slice(0, 20)}.csv` : "keywords.csv")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all w-fit"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v7M4.5 6.5L7 9l2.5-2.5M2 10.5V12h10v-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Export CSV
        </button>
      </div>

      {/* Search + Research */}
      <div className="flex gap-3 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleResearch(); }}
          placeholder="Enter a keyword, niche, or domain to research..."
          className="flex-1 px-5 py-3.5 rounded-2xl text-sm outline-none transition-all"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-1)" }}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(124,58,237,0.4)"; }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--color-border)"; }}
        />
        <button
          onClick={handleResearch}
          disabled={isResearching}
          className="flex items-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-60 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
        >
          {isResearching ? (
            <><svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/><path d="M7 2a5 5 0 0 1 5 5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg> Researching…</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> Research</>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm animate-fade-up" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* Clusters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: "0.15s" }}>
        {clusters.map((c) => (
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
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
            Keyword Opportunities
            {lastTopic && <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>for &ldquo;{lastTopic}&rdquo;</span>}
          </h2>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{filtered.length} keywords</span>
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
                const d = DIFF_STYLES[kw.difficulty] ?? { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" };
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
                        {kw.trend === "up" ? "↑ Up" : kw.trend === "down" ? "↓ Down" : "→ Stable"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No keywords match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
