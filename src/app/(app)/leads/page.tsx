"use client";

import { useState } from "react";

const STATS = [
  { label: "Total Leads", value: "2,847", color: "#6d28d9" },
  { label: "Qualified Rate", value: "34.2%", color: "#059669" },
  { label: "Avg Score", value: "67", color: "#0891b2" },
  { label: "Conversion Rate", value: "8.7%", color: "#d97706" },
];

const STATUS_MAP: Record<string, { color: string; bg: string }> = {
  New: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  Contacted: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  Qualified: { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  Converted: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
};

const PLATFORMS = ["Instagram", "LinkedIn", "TikTok", "Twitter/X", "Facebook"];

const LEADS = [
  { name: "Sarah Chen", company: "Bloom Digital Agency", platform: "LinkedIn", score: 92, status: "Qualified", activity: "2h ago" },
  { name: "Marcus Rivera", company: "TrueNorth Marketing", platform: "Instagram", score: 87, status: "Contacted", activity: "4h ago" },
  { name: "Aisha Patel", company: "Evergreen Studios", platform: "LinkedIn", score: 84, status: "New", activity: "1h ago" },
  { name: "Jason Kim", company: "Velocity Growth Co", platform: "Twitter/X", score: 79, status: "Qualified", activity: "6h ago" },
  { name: "Elena Vasquez", company: "Prism Creative Lab", platform: "Instagram", score: 76, status: "Converted", activity: "1d ago" },
  { name: "David Okonkwo", company: "Summit Strategies", platform: "LinkedIn", score: 73, status: "Contacted", activity: "3h ago" },
  { name: "Rachel Foster", company: "BrightPath Consulting", platform: "TikTok", score: 71, status: "New", activity: "30m ago" },
  { name: "Omar Hassan", company: "Nexus Digital Media", platform: "Facebook", score: 68, status: "Contacted", activity: "5h ago" },
  { name: "Lily Zhang", company: "Coral & Co Agency", platform: "Instagram", score: 65, status: "New", activity: "2h ago" },
  { name: "Thomas Müller", company: "Alpine Growth GmbH", platform: "LinkedIn", score: 62, status: "Qualified", activity: "8h ago" },
  { name: "Nina Johansson", company: "Fjord Creative", platform: "TikTok", score: 58, status: "New", activity: "12h ago" },
  { name: "Carlos Mendes", company: "Solaris Branding", platform: "Twitter/X", score: 54, status: "Contacted", activity: "1d ago" },
  { name: "Priya Sharma", company: "Mosaic Marketing Hub", platform: "Facebook", score: 49, status: "New", activity: "3h ago" },
  { name: "Jake Morrison", company: "Redwood Content Co", platform: "Instagram", score: 44, status: "New", activity: "2d ago" },
  { name: "Fatima Al-Rashid", company: "Oasis Digital Partners", platform: "LinkedIn", score: 38, status: "New", activity: "1d ago" },
];

function scoreColor(score: number) {
  if (score >= 80) return { color: "#34d399", bg: "rgba(52,211,153,0.12)" };
  if (score >= 60) return { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" };
  if (score >= 40) return { color: "#fb923c", bg: "rgba(251,146,60,0.12)" };
  return { color: "#f87171", bg: "rgba(248,113,113,0.12)" };
}

export default function LeadsPage() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = LEADS.filter((l) => {
    if (filter !== "All" && l.status !== filter) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.company.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Discover & manage</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
            Lead Discovery
          </h1>
        </div>
        <button
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" /><path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          Run Discovery
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className="rounded-2xl p-5 animate-fade-up relative overflow-hidden group transition-all duration-300"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: `${i * 0.07}s` }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.border = `1px solid ${s.color}33`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${s.color}15`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none opacity-30" style={{ background: `radial-gradient(circle, ${s.color}25 0%, transparent 70%)`, transform: "translate(25%, -25%)" }} />
            <div className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>{s.value}</div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-up" style={{ animationDelay: "0.2s" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-1)" }}
        />
        <div className="flex gap-2 flex-wrap">
          {["All", "New", "Contacted", "Qualified", "Converted"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: filter === f ? "rgba(124,58,237,0.15)" : "var(--color-surface)",
                border: filter === f ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border)",
                color: filter === f ? "#a78bfa" : "var(--color-text-2)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.3s" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                {["Name", "Company", "Platform", "Score", "Status", "Last Activity"].map((h) => (
                  <th key={h} className="text-left px-6 py-3.5 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const sc = scoreColor(lead.score);
                const st = STATUS_MAP[lead.status];
                return (
                  <tr
                    key={lead.name}
                    className="transition-colors cursor-default"
                    style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <td className="px-6 py-3.5 font-medium" style={{ color: "var(--color-text-1)" }}>{lead.name}</td>
                    <td className="px-6 py-3.5" style={{ color: "var(--color-text-2)" }}>{lead.company}</td>
                    <td className="px-6 py-3.5" style={{ color: "var(--color-text-2)" }}>{lead.platform}</td>
                    <td className="px-6 py-3.5">
                      <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: sc.bg, color: sc.color }}>{lead.score}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: st.bg, color: st.color }}>{lead.status}</span>
                    </td>
                    <td className="px-6 py-3.5 text-xs" style={{ color: "var(--color-text-muted)" }}>{lead.activity}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
