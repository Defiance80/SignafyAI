"use client";

import { useState, useEffect } from "react";

const CONTENT_TYPES = [
  { label: "Blog Post", value: "blog_post" },
  { label: "Social Caption", value: "social_caption" },
  { label: "Email Sequence", value: "email_sequence" },
  { label: "Ad Copy", value: "ad_copy" },
  { label: "Video Script", value: "video_script" },
];

const PLATFORMS = [
  { label: "Instagram", value: "instagram" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "TikTok", value: "tiktok" },
  { label: "Twitter/X", value: "twitter" },
  { label: "Facebook", value: "facebook" },
];

const TONES = [
  { label: "Professional", value: "professional" },
  { label: "Casual", value: "casual" },
  { label: "Witty", value: "witty" },
  { label: "Inspirational", value: "inspirational" },
  { label: "Bold", value: "bold" },
];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#e040fb",
  linkedin: "#0a66c2",
  tiktok: "#00f2ea",
  twitter: "#8899a6",
  facebook: "#1877f2",
  cross_platform: "#7c3aed",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  twitter: "Twitter/X",
  facebook: "Facebook",
  cross_platform: "All Platforms",
};

const TYPE_LABELS: Record<string, string> = {
  blog_post: "Blog Post",
  social_caption: "Social Caption",
  email_sequence: "Email Sequence",
  ad_copy: "Ad Copy",
  video_script: "Video Script",
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="13" height="13" rx="3.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3"/><circle cx="12" cy="4" r="0.8" fill="currentColor"/></svg>,
  linkedin: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 7v4M5 5.5v.01M8 11V8.5a1.5 1.5 0 0 1 3 0V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  tiktok: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 2v8a3 3 0 1 1-2-2.83" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M10 2c1 0 2.5 1 3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  twitter: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l5.5 6.5L2 14M14 2l-5.5 6.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  facebook: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10 3.5H9a2.5 2.5 0 0 0-2.5 2.5V8H5v2h1.5v4h2v-4H10l.5-2H8.5V6a.5.5 0 0 1 .5-.5h1v-2z" fill="currentColor"/></svg>,
};

interface ContentPiece {
  id: string;
  type: string;
  platform: string;
  body: string;
  char_count: number;
  engagement_prediction: number;
  metadata?: { hashtags?: string[]; media_suggestions?: string[] };
  status: string;
  created_at: string;
}

export default function ContentPage() {
  const [contentType, setContentType] = useState("social_caption");
  const [platform, setPlatform] = useState("instagram");
  const [tone, setTone] = useState("professional");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ContentPiece[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content?per_page=8")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.data)) setResults(d.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError("Enter a topic or prompt to generate content.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_type: contentType, platform, tone, prompt: prompt.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
      }
      const piece: ContentPiece = await res.json();
      setResults((prev) => [piece, ...prev]);
      setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard blocked
    }
  }

  async function handleDelete(id: string) {
    setResults((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/content/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>AI-powered creation</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
            Content Generator
          </h1>
        </div>
        <div className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
          {results.length} pieces generated
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl p-5 space-y-4 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.05s" }}>
        {/* Selectors row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Content Type */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--color-text-muted)" }}>Content Type</label>
            <div className="flex flex-wrap gap-1.5">
              {CONTENT_TYPES.map((t) => (
                <button key={t.value} onClick={() => setContentType(t.value)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all" style={{
                  background: contentType === t.value ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                  border: contentType === t.value ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)",
                  color: contentType === t.value ? "#a78bfa" : "var(--color-text-2)",
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--color-text-muted)" }}>Platform</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <button key={p.value} onClick={() => setPlatform(p.value)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all" style={{
                  background: platform === p.value ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                  border: platform === p.value ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)",
                  color: platform === p.value ? "#a78bfa" : "var(--color-text-2)",
                }}>
                  <span style={{ color: platform === p.value ? "#a78bfa" : "var(--color-text-muted)" }}>{PLATFORM_ICONS[p.value]}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--color-text-muted)" }}>Tone</label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button key={t.value} onClick={() => setTone(t.value)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all" style={{
                  background: tone === t.value ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                  border: tone === t.value ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)",
                  color: tone === t.value ? "#a78bfa" : "var(--color-text-2)",
                }}>{t.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Prompt textarea */}
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--color-text-muted)" }}>Topic / Prompt</label>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
              placeholder={`Describe what to create — e.g. "${contentType === "social_caption" ? "how our AI tool saved an agency 20 hours/week" : contentType === "blog_post" ? "top 5 AI marketing tools agencies need in 2025" : "email drip sequence for SaaS free trial users"}"`}
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border-subtle)",
                color: "var(--color-text-1)",
              }}
              onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(124,58,237,0.4)"; }}
              onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--color-border-subtle)"; }}
            />
            <span className="absolute bottom-2.5 right-3 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              ⌘↵ to generate
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                  <path d="M7 2a5 5 0 0 1 5 5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h4l1.5-3 2 6L11 7h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Generate Content
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", height: 180 }} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl p-12 text-center animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa" }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="2" y="2" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 8h8M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-1)" }}>No content yet</p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Enter a topic above and click Generate to create your first piece.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold animate-fade-up" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
            Generated Content
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {results.map((c, i) => {
              const color = PLATFORM_COLORS[c.platform] ?? "#7c3aed";
              const platformLabel = PLATFORM_LABELS[c.platform] ?? c.platform;
              const typeLabel = TYPE_LABELS[c.type] ?? c.type;
              const hashtags = c.metadata?.hashtags ?? [];

              return (
                <div
                  key={c.id}
                  className="rounded-2xl p-5 animate-fade-up group transition-all duration-200"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: `${i * 0.05}s` }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.border = `1px solid ${color}35`;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${color}10`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="p-1.5 rounded-lg" style={{ background: `${color}18`, color }}>{PLATFORM_ICONS[c.platform] ?? <span className="text-xs">{platformLabel[0]}</span>}</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--color-text-1)" }}>{platformLabel}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>{typeLabel}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md ml-auto" style={{ background: c.status === "published" ? "rgba(52,211,153,0.1)" : "rgba(250,204,21,0.1)", color: c.status === "published" ? "#34d399" : "#fbbf24" }}>
                      {c.status ?? "draft"}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed mb-3 whitespace-pre-line" style={{ color: "var(--color-text-2)" }}>
                    {c.body.length > 400 ? c.body.slice(0, 400) + "…" : c.body}
                  </p>

                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {hashtags.slice(0, 4).map((tag: string) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: `${color}12`, color }}>{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-3" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                    <span className="text-xs flex-1" style={{ color: "var(--color-text-muted)" }}>
                      {c.char_count} chars
                      {c.engagement_prediction > 0 && ` · ${c.engagement_prediction.toFixed(1)}% predicted eng.`}
                    </span>
                    <button
                      onClick={() => handleCopy(c.body, c.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: copied === c.id ? "rgba(52,211,153,0.12)" : "var(--color-surface-2)",
                        border: "1px solid var(--color-border-subtle)",
                        color: copied === c.id ? "#34d399" : "var(--color-text-2)",
                      }}
                    >
                      {copied === c.id ? (
                        <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Copied</>
                      ) : (
                        <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M4 1h6a1 1 0 0 1 1 1v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> Copy</>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded-lg text-xs transition-all"
                      style={{ color: "var(--color-text-muted)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2 3.5h9M5 3.5V2h3v1.5M5.5 6v4M7.5 6v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        <rect x="2.5" y="3.5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
