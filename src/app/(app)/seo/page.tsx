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
    <div style={{ padding: "36px 40px", maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Research & optimize</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: "rgba(255,255,255,0.95)", margin: 0, lineHeight: 1.1 }}>SEO Research</h1>
        </div>
        <button
          onClick={() => downloadCsv(filtered, lastTopic ? `keywords-${lastTopic.slice(0, 20)}.csv` : "keywords.csv")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "all 0.2s", background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface)"; }}
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
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 14, fontSize: 14, fontWeight: 600, flexShrink: 0, transition: "all 0.2s",
            cursor: isResearching ? "not-allowed" : "pointer", opacity: isResearching ? 0.6 : 1,
            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
          }}
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
      <div className="animate-fade-up" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, animationDelay: "0.15s" }}>
        {clusters.map((c) => (
          <div
            key={c.name}
            style={{
              borderRadius: 16, padding: "22px 24px", position: "relative", overflow: "hidden",
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.border = `1px solid ${c.color}33`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${c.color}15`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderRadius: "50%", pointerEvents: "none", opacity: 0.3, background: `radial-gradient(circle, ${c.color}25 0%, transparent 70%)`, transform: "translate(25%, -25%)" }} />
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: c.color, letterSpacing: "0.04em", textTransform: "uppercase" }}>{c.name}</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 6, fontFamily: "var(--font-syne)", color: "rgba(255,255,255,0.92)" }}>{c.volume}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{c.keywords} keywords</div>
          </div>
        ))}
      </div>

      {/* Keywords Table */}
      <div className="animate-fade-up" style={{ borderRadius: 16, overflow: "hidden", background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.2s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", borderBottom: "1px solid var(--color-border-subtle)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-syne)", color: "rgba(255,255,255,0.9)" }}>
            Keyword Opportunities
            {lastTopic && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>for &ldquo;{lastTopic}&rdquo;</span>}
          </h2>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{filtered.length} keywords</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                {["Keyword", "Volume", "Difficulty", "CPC", "Trend"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "14px 24px", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.32)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((kw) => {
                const d = DIFF_STYLES[kw.difficulty] ?? { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" };
                return (
                  <tr
                    key={kw.keyword}
                    style={{ borderBottom: "1px solid var(--color-border-subtle)", cursor: "default", transition: "background 0.15s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <td style={{ padding: "15px 24px", fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>{kw.keyword}</td>
                    <td style={{ padding: "15px 24px", color: "rgba(255,255,255,0.55)" }}>{kw.volume.toLocaleString()}</td>
                    <td style={{ padding: "15px 24px" }}><span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8, background: d.bg, color: d.color }}>{kw.difficulty}</span></td>
                    <td style={{ padding: "15px 24px", color: "rgba(255,255,255,0.55)" }}>{kw.cpc}</td>
                    <td style={{ padding: "15px 24px" }}>
                      <span style={{ fontSize: 13, color: kw.trend === "up" ? "#34d399" : kw.trend === "down" ? "#f87171" : "rgba(255,255,255,0.35)" }}>
                        {kw.trend === "up" ? "↑ Up" : kw.trend === "down" ? "↓ Down" : "→ Stable"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: "40px 28px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>No keywords match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
