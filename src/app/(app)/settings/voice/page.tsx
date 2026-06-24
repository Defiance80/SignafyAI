"use client";

import { useState, useEffect } from "react";

const TONE_OPTIONS = [
  { id: "conversational",  label: "Conversational",  desc: "Warm, approachable, uses everyday language",      emoji: "💬" },
  { id: "professional",    label: "Professional",    desc: "Polished, expert-led, industry authority",         emoji: "🏢" },
  { id: "bold",            label: "Bold & Direct",   desc: "Confident, no fluff, punchy statements",           emoji: "⚡" },
  { id: "empathetic",      label: "Empathetic",      desc: "People-first, understanding pain points",          emoji: "❤️" },
  { id: "playful",         label: "Playful",         desc: "Light, witty, memorable with personality",         emoji: "✨" },
  { id: "educational",     label: "Educational",     desc: "Informative, clear explanations, builds trust",    emoji: "📚" },
];

const STYLE_OPTIONS = [
  { id: "punchy",     label: "Short & Punchy",    desc: "Crisp sentences, high-impact, scroll-stopping" },
  { id: "narrative",  label: "Story-Driven",      desc: "Narratives and case studies that resonate" },
  { id: "data",       label: "Data-Led",          desc: "Stats, metrics, and evidence-backed claims" },
  { id: "depth",      label: "In-Depth",          desc: "Thorough, long-form, educational content" },
];

const FORMALITY_LEVELS = [
  { id: "casual",    label: "Casual" },
  { id: "neutral",   label: "Balanced" },
  { id: "formal",    label: "Formal" },
];

interface VoiceConfig {
  tone: string;
  style: string;
  formality: string;
  audience: string;
  pillars: string[];
  dos: string[];
  donts: string[];
  examplePhrase: string;
}

const DEFAULT_CONFIG: VoiceConfig = {
  tone: "professional",
  style: "punchy",
  formality: "neutral",
  audience: "",
  pillars: ["", "", "", "", ""],
  dos: ["", "", ""],
  donts: ["", "", ""],
  examplePhrase: "",
};

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 16, padding: "28px 32px", background: "var(--color-surface)",
      border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 20,
    }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.92)", letterSpacing: "-0.02em" }}>{title}</h2>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function BrandVoicePage() {
  const [config, setConfig] = useState<VoiceConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hoveredTone, setHoveredTone] = useState<string | null>(null);
  const [hoveredStyle, setHoveredStyle] = useState<string | null>(null);

  // Persist to localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("signafy_brand_voice");
      if (stored) setConfig(JSON.parse(stored) as VoiceConfig);
    } catch {}
  }, []);

  function setPillar(index: number, value: string) {
    setConfig((c) => { const p = [...c.pillars]; p[index] = value; return { ...c, pillars: p }; });
  }
  function setDo(index: number, value: string) {
    setConfig((c) => { const d = [...c.dos]; d[index] = value; return { ...c, dos: d }; });
  }
  function setDont(index: number, value: string) {
    setConfig((c) => { const d = [...c.donts]; d[index] = value; return { ...c, donts: d }; });
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    try { localStorage.setItem("signafy_brand_voice", JSON.stringify(config)); } catch {}
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14,
    background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
    color: "rgba(255,255,255,0.88)", outline: "none", transition: "border-color 0.15s",
    boxSizing: "border-box",
  };

  return (
    <div style={{ padding: "36px 40px", maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.32)", marginBottom: 8, fontWeight: 500 }}>Settings</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", color: "rgba(255,255,255,0.95)", margin: 0, lineHeight: 1.1 }}>Brand Voice</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
            Define how your brand communicates. SignafyAI uses this to generate on-brand content across every channel.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "11px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            background: saved ? "rgba(52,211,153,0.15)" : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
            color: saved ? "#34d399" : "white",
            border: saved ? "1px solid rgba(52,211,153,0.3)" : "none",
            boxShadow: saved ? "none" : "0 4px 12px rgba(124,58,237,0.3)",
            transition: "all 0.25s", opacity: saving ? 0.7 : 1, flexShrink: 0,
          }}
        >
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Voice"}
        </button>
      </div>

      {/* Tone */}
      <SectionCard title="Tone & Personality" subtitle="How should your brand feel to the reader?">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {TONE_OPTIONS.map((t) => {
            const isActive = config.tone === t.id;
            const isHover = hoveredTone === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setConfig((c) => ({ ...c, tone: t.id }))}
                onMouseEnter={() => setHoveredTone(t.id)}
                onMouseLeave={() => setHoveredTone(null)}
                style={{
                  padding: "16px 14px", borderRadius: 12, textAlign: "left", cursor: "pointer",
                  background: isActive ? "rgba(124,58,237,0.12)" : isHover ? "rgba(255,255,255,0.04)" : "var(--color-surface-2)",
                  border: isActive ? "1px solid rgba(124,58,237,0.35)" : "1px solid var(--color-border)",
                  transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 6,
                  boxShadow: isActive ? "0 0 0 1px rgba(124,58,237,0.15)" : "none",
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{t.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? "#a78bfa" : "rgba(255,255,255,0.82)" }}>{t.label}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.45 }}>{t.desc}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Writing Style */}
      <SectionCard title="Writing Style" subtitle="The structure and depth of your content">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {STYLE_OPTIONS.map((s) => {
            const isActive = config.style === s.id;
            const isHover = hoveredStyle === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setConfig((c) => ({ ...c, style: s.id }))}
                onMouseEnter={() => setHoveredStyle(s.id)}
                onMouseLeave={() => setHoveredStyle(null)}
                style={{
                  padding: "18px 20px", borderRadius: 12, textAlign: "left", cursor: "pointer",
                  background: isActive ? "rgba(124,58,237,0.12)" : isHover ? "rgba(255,255,255,0.04)" : "var(--color-surface-2)",
                  border: isActive ? "1px solid rgba(124,58,237,0.35)" : "1px solid var(--color-border)",
                  transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 6,
                  boxShadow: isActive ? "0 0 0 1px rgba(124,58,237,0.15)" : "none",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? "#a78bfa" : "rgba(255,255,255,0.82)" }}>{s.label}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>{s.desc}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Formality + Audience */}
      <SectionCard title="Audience & Formality" subtitle="Who you're talking to and how formally">
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Formality level
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {FORMALITY_LEVELS.map((f) => {
              const isActive = config.formality === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setConfig((c) => ({ ...c, formality: f.id }))}
                  style={{
                    padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
                    background: isActive ? "rgba(124,58,237,0.12)" : "var(--color-surface-2)",
                    border: isActive ? "1px solid rgba(124,58,237,0.35)" : "1px solid var(--color-border)",
                    color: isActive ? "#a78bfa" : "rgba(255,255,255,0.55)",
                    transition: "all 0.15s",
                  }}
                >{f.label}</button>
              );
            })}
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Target audience
          </label>
          <input
            value={config.audience}
            onChange={(e) => setConfig((c) => ({ ...c, audience: e.target.value }))}
            placeholder="e.g. B2B SaaS founders scaling from $1M to $10M ARR"
            style={inputStyle}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(124,58,237,0.45)"; }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--color-border)"; }}
          />
        </div>
      </SectionCard>

      {/* Brand Pillars */}
      <SectionCard title="Brand Pillars" subtitle="The core themes and values your content always reflects (up to 5)">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {config.pillars.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.22)", width: 20, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
              <input
                value={p}
                onChange={(e) => setPillar(i, e.target.value)}
                placeholder={["Innovation & speed", "Customer empathy", "Radical transparency", "Proven results", "Always-on growth"][i]}
                style={inputStyle}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(124,58,237,0.45)"; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--color-border)"; }}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Do's and Don'ts */}
      <SectionCard title="Voice Do's & Don'ts" subtitle="Guide the AI with what to embrace and avoid in your copy">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Do's */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399", letterSpacing: "0.04em", textTransform: "uppercase" }}>Always Do</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {config.dos.map((d, i) => (
                <input
                  key={i}
                  value={d}
                  onChange={(e) => setDo(i, e.target.value)}
                  placeholder={["Lead with the outcome", "Use active voice", "Cite real numbers"][i]}
                  style={{ ...inputStyle, borderColor: d ? "rgba(52,211,153,0.2)" : undefined }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(52,211,153,0.35)"; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = d ? "rgba(52,211,153,0.2)" : "var(--color-border)"; }}
                />
              ))}
            </div>
          </div>
          {/* Don'ts */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>✕</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#f87171", letterSpacing: "0.04em", textTransform: "uppercase" }}>Never Do</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {config.donts.map((d, i) => (
                <input
                  key={i}
                  value={d}
                  onChange={(e) => setDont(i, e.target.value)}
                  placeholder={["Use jargon without context", "Over-promise results", "Passive, hedging language"][i]}
                  style={{ ...inputStyle, borderColor: d ? "rgba(248,113,113,0.2)" : undefined }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(248,113,113,0.35)"; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = d ? "rgba(248,113,113,0.2)" : "var(--color-border)"; }}
                />
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Example Phrase */}
      <SectionCard title="Signature Phrase" subtitle="A sentence that perfectly captures your brand's voice — used as a reference example">
        <textarea
          value={config.examplePhrase}
          onChange={(e) => setConfig((c) => ({ ...c, examplePhrase: e.target.value }))}
          rows={3}
          placeholder='e.g. "We help growth-stage founders stop guessing and start scaling — with AI that works as hard as they do."'
          style={{
            ...inputStyle, resize: "vertical", lineHeight: 1.65,
            minHeight: 90, fontStyle: config.examplePhrase ? "normal" : "normal",
          }}
          onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(124,58,237,0.45)"; }}
          onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--color-border)"; }}
        />
        {config.examplePhrase && (
          <div style={{ padding: "14px 18px", borderRadius: 10, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, fontStyle: "italic" }}>
              &ldquo;{config.examplePhrase}&rdquo;
            </p>
          </div>
        )}
      </SectionCard>

      {/* Preview Card */}
      {(config.tone || config.style) && (
        <div style={{
          borderRadius: 16, padding: "24px 28px", background: "rgba(124,58,237,0.06)",
          border: "1px solid rgba(124,58,237,0.18)", display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🎯</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Voice Summary
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
            Your brand speaks in a{" "}
            <span style={{ color: "#c4b5fd", fontWeight: 600 }}>
              {TONE_OPTIONS.find((t) => t.id === config.tone)?.label.toLowerCase() ?? config.tone}
            </span>{" "}
            tone with a{" "}
            <span style={{ color: "#c4b5fd", fontWeight: 600 }}>
              {STYLE_OPTIONS.find((s) => s.id === config.style)?.label.toLowerCase() ?? config.style}
            </span>{" "}
            writing style
            {config.formality !== "neutral" && (
              <>, using a <span style={{ color: "#c4b5fd", fontWeight: 600 }}>{config.formality}</span> register</>
            )}
            {config.audience && (
              <>, targeting <span style={{ color: "#c4b5fd", fontWeight: 600 }}>{config.audience}</span></>
            )}.
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
            SignafyAI will apply this voice to all generated content — social posts, email sequences, ad copy, and SEO articles.
          </p>
        </div>
      )}

      {/* Bottom save */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "12px 32px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            background: saved ? "rgba(52,211,153,0.15)" : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
            color: saved ? "#34d399" : "white",
            border: saved ? "1px solid rgba(52,211,153,0.3)" : "none",
            boxShadow: saved ? "none" : "0 4px 16px rgba(124,58,237,0.35)",
            transition: "all 0.25s", opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : saved ? "✓ Voice Saved" : "Save Brand Voice"}
        </button>
      </div>

    </div>
  );
}
