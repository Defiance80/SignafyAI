"use client";

import { useState } from "react";

const CONTENT_TYPES = ["Blog Post", "Social Caption", "Email Sequence", "Ad Copy", "Video Script"];
const PLATFORMS = ["Instagram", "LinkedIn", "TikTok", "Twitter/X", "Facebook"];
const TONES = ["Professional", "Casual", "Witty", "Inspirational", "Bold"];

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  Instagram: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="13" height="13" rx="3.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3"/><circle cx="12" cy="4" r="0.8" fill="currentColor"/></svg>,
  LinkedIn: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 7v4M5 5.5v.01M8 11V8.5a1.5 1.5 0 0 1 3 0V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  TikTok: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 2v8a3 3 0 1 1-2-2.83" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M10 2c1 0 2.5 1 3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  "Twitter/X": <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l5.5 6.5L2 14M14 2l-5.5 6.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Facebook: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10 3.5H9a2.5 2.5 0 0 0-2.5 2.5V8H5v2h1.5v4h2v-4H10l.5-2H8.5V6a.5.5 0 0 1 .5-.5h1v-2z" fill="currentColor"/></svg>,
};

const MOCK_CONTENT = [
  {
    platform: "Instagram",
    type: "Social Caption",
    text: "Your brand isn't what you say it is — it's what they feel when they see you. ✨\n\nWe just helped @bloomdigital triple their engagement in 30 days by rebuilding their content strategy from scratch.\n\nThe secret? Consistency > perfection.\n\n#BrandStrategy #DigitalMarketing #GrowthMindset",
    chars: 284,
    engagement: 8.4,
    color: "#e040fb",
  },
  {
    platform: "LinkedIn",
    type: "Blog Post",
    text: "I've spent the last decade building marketing agencies, and here's what nobody tells you about lead generation in 2025:\n\nThe funnel is dead. The flywheel is everything.\n\nWe analyzed 10,000+ B2B campaigns and found that companies using AI-assisted content workflows saw 3.2x more qualified leads than those relying on traditional methods...",
    chars: 412,
    engagement: 6.2,
    color: "#0a66c2",
  },
  {
    platform: "TikTok",
    type: "Video Script",
    text: "[HOOK - 0:00] \"Stop wasting money on Facebook ads that don't convert.\"\n\n[PROBLEM - 0:03] Most businesses throw $500/mo at boost buttons and wonder why nothing happens.\n\n[SOLUTION - 0:08] Here's the 3-step framework we use for our clients:\n1. Audience-first targeting\n2. Story-driven creative\n3. Retarget warm leads only\n\n[CTA - 0:25] Follow for more growth hacks 🚀",
    chars: 358,
    engagement: 12.1,
    color: "#00f2ea",
  },
  {
    platform: "Twitter/X",
    type: "Ad Copy",
    text: "Your competitors are using AI to find leads while you're still scrolling LinkedIn manually.\n\nSignafyAI scans 50+ data sources, scores prospects in real-time, and generates personalized outreach — automatically.\n\nStop searching. Start closing.\n→ Try free for 14 days",
    chars: 261,
    engagement: 4.8,
    color: "#8899a6",
  },
];

export default function ContentPage() {
  const [contentType, setContentType] = useState("Social Caption");
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("Professional");

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>AI-powered creation</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
            Content Generator
          </h1>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
            Schedule
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h4l1.5-3 2 6L11 7h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Generate
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        {/* Content Type */}
        <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <label className="text-xs font-semibold mb-3 block" style={{ color: "var(--color-text-muted)" }}>Content Type</label>
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map((t) => (
              <button key={t} onClick={() => setContentType(t)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{
                background: contentType === t ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                border: contentType === t ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)",
                color: contentType === t ? "#a78bfa" : "var(--color-text-2)",
              }}>{t}</button>
            ))}
          </div>
        </div>
        {/* Platform */}
        <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <label className="text-xs font-semibold mb-3 block" style={{ color: "var(--color-text-muted)" }}>Platform</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button key={p} onClick={() => setPlatform(p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{
                background: platform === p ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                border: platform === p ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)",
                color: platform === p ? "#a78bfa" : "var(--color-text-2)",
              }}>
                <span style={{ color: platform === p ? "#a78bfa" : "var(--color-text-muted)" }}>{PLATFORM_ICONS[p]}</span>
                {p}
              </button>
            ))}
          </div>
        </div>
        {/* Tone */}
        <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <label className="text-xs font-semibold mb-3 block" style={{ color: "var(--color-text-muted)" }}>Tone / Voice</label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button key={t} onClick={() => setTone(t)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{
                background: tone === t ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                border: tone === t ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)",
                color: tone === t ? "#a78bfa" : "var(--color-text-2)",
              }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Generated Content */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold animate-fade-up" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)", animationDelay: "0.2s" }}>Generated Content</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {MOCK_CONTENT.map((c, i) => (
            <div
              key={i}
              className="rounded-2xl p-5 animate-fade-up transition-all duration-300 group"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: `${0.25 + i * 0.07}s` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.border = `1px solid ${c.color}40`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${c.color}12`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="p-1.5 rounded-lg" style={{ background: `${c.color}18`, color: c.color }}>{PLATFORM_ICONS[c.platform]}</span>
                <span className="text-xs font-semibold" style={{ color: "var(--color-text-1)" }}>{c.platform}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>{c.type}</span>
              </div>
              <p className="text-sm leading-relaxed mb-4 whitespace-pre-line" style={{ color: "var(--color-text-2)" }}>{c.text}</p>
              <div className="flex items-center gap-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
                <span>{c.chars} chars</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v4l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/></svg>
                  {c.engagement}% predicted engagement
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
