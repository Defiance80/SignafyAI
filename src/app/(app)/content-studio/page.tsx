"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────
interface Variation {
  id: string;
  variation_label: string;
  tone: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
  predicted_reach: number;
  is_selected: boolean;
}

interface Suggestion {
  id: string;
  title: string;
  topic: string;
  content_type: string;
  target_platforms: string[];
  best_posting_time: string;
  performance_score: number;
  virality_score: number;
  image_type: string;
  image_prompt?: string;
  image_description?: string;
  benchmark_reference?: string;
  optimization_tips: string[];
  engagement_prediction: { likes: number; comments: number; shares: number; reach: number };
  status: string;
  week_of: string;
  created_at: string;
  variations: Variation[];
}

// ── Constants ─────────────────────────────────────────────────
const PLATFORM_META: Record<string, { label: string; color: string; icon: string }> = {
  linkedin:  { label: "LinkedIn",  color: "#0a66c2", icon: "in" },
  instagram: { label: "Instagram", color: "#e1306c", icon: "ig" },
  tiktok:    { label: "TikTok",    color: "#00f2ea", icon: "tt" },
  facebook:  { label: "Facebook",  color: "#1877f2", icon: "fb" },
  x:         { label: "X",         color: "#e7e9ea", icon: "𝕏"  },
};

const TYPE_COLORS: Record<string, string> = {
  educational:    "#3b82f6",
  promotional:    "#7c3aed",
  entertainment:  "#f59e0b",
  behind_scenes:  "#10b981",
  trend:          "#ec4899",
  local_event:    "#f97316",
  announcement:   "#06b6d4",
  testimonial:    "#8b5cf6",
};

const IMAGE_TYPE_LABELS: Record<string, string> = {
  ai_generated:  "AI Generated",
  stock_photo:   "Stock Photo",
  local_event:   "Local Event Photo",
  screenshot:    "Screenshot",
  video:         "Video",
  user_provided: "Your Own Photo",
};

function scoreColor(s: number) {
  if (s >= 80) return "#10b981";
  if (s >= 65) return "#3b82f6";
  if (s >= 50) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(s: number) {
  if (s >= 80) return "🔥 Viral Potential";
  if (s >= 65) return "⚡ Strong";
  if (s >= 50) return "📊 Average";
  return "💡 Needs Work";
}

function ScoreRing({ value, size = 60 }: { value: number; size?: number }) {
  const r = size * 0.37; const c = 2 * Math.PI * r;
  const color = scoreColor(value);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--o2)" strokeWidth={size * 0.067} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={size * 0.067}
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight="700"
        style={{ transform: `rotate(90deg) translate(0,-${size}px)` }}>{value}</text>
    </svg>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ContentStudioPage() {
  const [activeTab, setActiveTab] = useState<"suggestions" | "calendar" | "generate">("suggestions");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "declined">("pending");

  const [calMonth, setCalMonth] = useState(() => new Date());

  // Generate settings
  const [genSettings, setGenSettings] = useState({
    week_of: new Date().toISOString().slice(0, 10),
    posts_count: 7,
  });

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/content/suggestions?status=${statusFilter}`);
    const data = await res.json();
    setSuggestions(data.suggestions ?? []);
    // Pre-select A variation for each suggestion
    const sel: Record<string, string> = {};
    (data.suggestions ?? []).forEach((s: Suggestion) => {
      const a = s.variations.find(v => v.variation_label === "A") ?? s.variations[0];
      if (a) sel[s.id] = a.id;
    });
    setSelectedVariations(sel);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  const approveSuggestion = useCallback(async (suggestion: Suggestion) => {
    const variationId = selectedVariations[suggestion.id];
    const res = await fetch("/api/content/suggestions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: suggestion.id, action: "approve", variation_id: variationId }),
    });
    if (res.ok) {
      setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, status: "approved" } : s));
      if (statusFilter === "pending") {
        setTimeout(() => setSuggestions(prev => prev.filter(s => s.id !== suggestion.id)), 600);
      }
    }
  }, [selectedVariations, statusFilter]);

  const declineSuggestion = useCallback(async (id: string) => {
    await fetch("/api/content/suggestions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "decline", declined_reason: declineReason }),
    });
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: "declined" } : s));
    if (statusFilter === "pending") {
      setTimeout(() => setSuggestions(prev => prev.filter(s => s.id !== id)), 600);
    }
    setDeclineId(null);
    setDeclineReason("");
  }, [declineReason, statusFilter]);

  const triggerGeneration = useCallback(async () => {
    setGenerating(true);
    await fetch("/api/content/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate", ...genSettings }),
    });
    setTimeout(() => {
      setGenerating(false);
      setActiveTab("suggestions");
      fetchSuggestions();
    }, 3000);
  }, [genSettings, fetchSuggestions]);

  // Calendar helpers
  const calYear = calMonth.getFullYear();
  const calMonthIdx = calMonth.getMonth();
  const firstDay = new Date(calYear, calMonthIdx, 1).getDay();
  const daysInMonth = new Date(calYear, calMonthIdx + 1, 0).getDate();
  const approvedSuggestions = suggestions.filter(s => s.status === "approved");

  const tabs: { key: typeof activeTab; label: string; count?: number }[] = [
    { key: "suggestions", label: "Suggestions", count: suggestions.filter(s => s.status === "pending").length },
    { key: "calendar",    label: "Calendar" },
    { key: "generate",    label: "✦ Generate Content" },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 40px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--c1)", margin: 0 }}>Content Studio</h1>
        <p style={{ color: "var(--c3)", marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>
          AI-suggested posts with performance predictions — approve, edit, and post to all platforms at once.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 28, background: "var(--o1)", borderRadius: 10, padding: 4 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            flex: 1, padding: "9px 8px", borderRadius: 8, border: "none", cursor: "pointer",
            background: activeTab === t.key ? "rgba(124,58,237,0.3)" : "transparent",
            color: activeTab === t.key ? "#a78bfa" : "var(--c3)",
            fontSize: 13, fontWeight: activeTab === t.key ? 600 : 400,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s",
          }}>
            {t.label}
            {t.count != null && t.count > 0 && (
              <span style={{
                background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 700,
                borderRadius: 10, padding: "1px 7px",
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Suggestions Tab ───────────────────────────────────── */}
      {activeTab === "suggestions" && (
        <>
          {/* Status filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {(["pending", "approved", "declined"] as const).map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); }}
                style={{
                  padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13,
                  background: statusFilter === s ? "rgba(124,58,237,0.25)" : "var(--o2)",
                  color: statusFilter === s ? "#a78bfa" : "var(--c3)",
                  textTransform: "capitalize",
                }}>{s}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--c3)" }}>Loading suggestions…</div>
          ) : suggestions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✦</div>
              <div style={{ color: "var(--c2)", fontSize: 15, marginBottom: 20 }}>No {statusFilter} suggestions yet</div>
              <button onClick={() => setActiveTab("generate")} style={{
                padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontSize: 14, fontWeight: 600,
              }}>Generate AI Content</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {suggestions.map(s => {
                const expanded = expandedId === s.id;
                const selVariation = s.variations.find(v => v.id === (selectedVariations[s.id] ?? v.id)) ?? s.variations[0];
                const typeColor = TYPE_COLORS[s.content_type] ?? "#7c3aed";

                return (
                  <div key={s.id} style={{
                    background: "var(--o1)", borderRadius: 14,
                    border: `1px solid ${expanded ? "rgba(124,58,237,0.3)" : "var(--o2)"}`,
                    overflow: "hidden", transition: "border-color 0.2s",
                  }}>
                    {/* Card Header */}
                    <div style={{ padding: "18px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                      {/* Score ring */}
                      <div style={{ flexShrink: 0, textAlign: "center" }}>
                        <ScoreRing value={s.performance_score} size={58} />
                        <div style={{ fontSize: 10, color: scoreColor(s.performance_score), marginTop: 4, fontWeight: 600 }}>
                          {scoreLabel(s.performance_score)}
                        </div>
                      </div>

                      {/* Main content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{s.title}</h3>
                          <span style={{
                            fontSize: 11, padding: "2px 9px", borderRadius: 10, flexShrink: 0,
                            background: `${typeColor}22`, color: typeColor, fontWeight: 600,
                          }}>{s.content_type.replace("_", " ")}</span>
                        </div>

                        {/* Platforms + timing */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {s.target_platforms.map(p => {
                            const meta = PLATFORM_META[p];
                            return meta ? (
                              <span key={p} style={{
                                fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 600,
                                background: `${meta.color}20`, color: meta.color,
                              }}>{meta.label}</span>
                            ) : null;
                          })}
                          {s.best_posting_time && (
                            <span style={{ fontSize: 11, color: "var(--c3)" }}>
                              📅 Best: {s.best_posting_time}
                            </span>
                          )}
                        </div>

                        {/* Engagement prediction */}
                        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                          {[
                            { label: "Likes",    val: s.engagement_prediction?.likes },
                            { label: "Comments", val: s.engagement_prediction?.comments },
                            { label: "Shares",   val: s.engagement_prediction?.shares },
                            { label: "Reach",    val: s.engagement_prediction?.reach },
                          ].map(m => (
                            <div key={m.label} style={{ textAlign: "center" }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{(m.val ?? 0).toLocaleString()}</div>
                              <div style={{ fontSize: 10, color: "var(--c3)" }}>{m.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {s.status === "pending" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                          <button onClick={() => approveSuggestion(s)} style={{
                            padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                            background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontSize: 13, fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}>✓ Approve & Post</button>
                          <button onClick={() => setDeclineId(s.id)} style={{
                            padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                            background: "transparent", color: "var(--c3)", fontSize: 13, cursor: "pointer",
                          }}>✕ Decline</button>
                        </div>
                      )}
                      {s.status === "approved" && (
                        <span style={{
                          padding: "6px 14px", borderRadius: 8, background: "rgba(16,185,129,0.15)",
                          color: "#10b981", fontSize: 12, fontWeight: 600,
                        }}>✓ Approved</span>
                      )}
                      {s.status === "declined" && (
                        <span style={{
                          padding: "6px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)",
                          color: "#ef4444", fontSize: 12, fontWeight: 600,
                        }}>✕ Declined</span>
                      )}
                    </div>

                    {/* Expand / collapse */}
                    <button onClick={() => setExpandedId(expanded ? null : s.id)}
                      style={{
                        width: "100%", padding: "10px", background: "var(--o1)",
                        border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", cursor: "pointer",
                        color: "var(--c3)", fontSize: 12,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}>
                      {expanded ? "▲ Hide Details" : "▼ View Variations & Full Details"}
                    </button>

                    {/* Expanded: variations + details */}
                    {expanded && (
                      <div style={{ padding: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        {/* Variation selector */}
                        {s.variations.length > 0 && (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c2)", marginBottom: 12 }}>
                              Choose a Variation
                              <span style={{ fontSize: 11, color: "var(--c3)", fontWeight: 400, marginLeft: 8 }}>
                                (select one before approving)
                              </span>
                            </div>

                            {/* Variation tabs */}
                            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                              {s.variations.map(v => {
                                const isSelected = selectedVariations[s.id] === v.id;
                                return (
                                  <button key={v.id} onClick={() => setSelectedVariations(prev => ({ ...prev, [s.id]: v.id }))}
                                    style={{
                                      padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                                      border: `1.5px solid ${isSelected ? "#7c3aed" : "var(--c5)"}`,
                                      background: isSelected ? "rgba(124,58,237,0.2)" : "var(--o1)",
                                      color: isSelected ? "#a78bfa" : "var(--c2)", fontSize: 13,
                                    }}>
                                    <span style={{ fontWeight: 700 }}>Variation {v.variation_label}</span>
                                    <span style={{ display: "block", fontSize: 11, opacity: 0.6, marginTop: 1 }}>{v.tone}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Selected variation content */}
                            {selVariation && (
                              <div style={{
                                background: "var(--o1)", borderRadius: 10, padding: 16,
                                border: "1px solid rgba(255,255,255,0.08)", marginBottom: 20,
                              }}>
                                {selVariation.hook && (
                                  <div style={{ marginBottom: 10 }}>
                                    <span style={{ fontSize: 11, color: "var(--c3)" }}>HOOK</span>
                                    <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600, marginTop: 4 }}>
                                      {selVariation.hook}
                                    </div>
                                  </div>
                                )}
                                <div style={{ marginBottom: 12 }}>
                                  <span style={{ fontSize: 11, color: "var(--c3)" }}>CAPTION</span>
                                  <pre style={{
                                    fontSize: 13, color: "var(--c2)", marginTop: 8, whiteSpace: "pre-wrap",
                                    fontFamily: "inherit", lineHeight: 1.65,
                                  }}>{selVariation.caption}</pre>
                                </div>
                                {selVariation.hashtags?.length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                                    {selVariation.hashtags.map(h => (
                                      <span key={h} style={{ fontSize: 12, color: "#60a5fa", background: "rgba(96,165,250,0.1)", padding: "2px 8px", borderRadius: 4 }}>{h}</span>
                                    ))}
                                  </div>
                                )}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  {selVariation.cta && (
                                    <span style={{ fontSize: 12, color: "#10b981" }}>CTA: {selVariation.cta}</span>
                                  )}
                                  <span style={{ fontSize: 12, color: "var(--c3)" }}>
                                    Est. reach: {(selVariation.predicted_reach || 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Image guidance */}
                        <div style={{
                          background: "rgba(124,58,237,0.07)", borderRadius: 10, padding: "14px 16px", marginBottom: 16,
                          border: "1px solid rgba(124,58,237,0.15)",
                        }}>
                          <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600, marginBottom: 6 }}>
                            🖼 IMAGE: {IMAGE_TYPE_LABELS[s.image_type] ?? s.image_type}
                          </div>
                          {s.image_prompt && (
                            <div style={{ fontSize: 12, color: "var(--c2)", fontStyle: "italic", marginBottom: 6 }}>
                              Prompt: "{s.image_prompt}"
                            </div>
                          )}
                          {s.image_description && (
                            <div style={{ fontSize: 12, color: "var(--c3)" }}>{s.image_description}</div>
                          )}
                        </div>

                        {/* Benchmark */}
                        {s.benchmark_reference && (
                          <div style={{
                            background: "rgba(16,185,129,0.07)", borderRadius: 10, padding: "14px 16px", marginBottom: 16,
                            border: "1px solid rgba(16,185,129,0.15)",
                          }}>
                            <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600, marginBottom: 6 }}>📊 BENCHMARK INSIGHT</div>
                            <div style={{ fontSize: 12, color: "var(--c2)", lineHeight: 1.5 }}>{s.benchmark_reference}</div>
                          </div>
                        )}

                        {/* Optimization tips */}
                        {s.optimization_tips?.length > 0 && (
                          <div>
                            <div style={{ fontSize: 11, color: "var(--c3)", fontWeight: 600, marginBottom: 8 }}>
                              💡 OPTIMIZATION TIPS TO MAXIMIZE PERFORMANCE
                            </div>
                            {s.optimization_tips.map((tip, i) => (
                              <div key={i} style={{
                                display: "flex", gap: 10, padding: "8px 0",
                                borderBottom: i < s.optimization_tips.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                              }}>
                                <span style={{ color: "#7c3aed", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                                <span style={{ fontSize: 13, color: "var(--c2)", lineHeight: 1.5 }}>{tip}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Approve action in expanded view */}
                        {s.status === "pending" && (
                          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                            <button onClick={() => approveSuggestion(s)} style={{
                              flex: 1, padding: "12px", borderRadius: 8, border: "none", cursor: "pointer",
                              background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontSize: 14, fontWeight: 600,
                            }}>✓ Approve Variation {(selVariation?.variation_label ?? "A")} & Schedule for All Platforms</button>
                            <button onClick={() => setDeclineId(s.id)} style={{
                              padding: "12px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                              background: "transparent", color: "var(--c3)", fontSize: 14, cursor: "pointer",
                            }}>✕</button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Decline modal */}
                    {declineId === s.id && (
                      <div style={{
                        padding: 20, borderTop: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(239,68,68,0.06)",
                      }}>
                        <div style={{ fontSize: 13, color: "var(--c2)", marginBottom: 10 }}>
                          Why are you declining this? (helps the AI learn your preferences)
                        </div>
                        <input value={declineReason} onChange={e => setDeclineReason(e.target.value)}
                          placeholder="Too promotional, wrong tone, off-brand topic…"
                          style={{
                            width: "100%", padding: "10px 14px", borderRadius: 8, boxSizing: "border-box",
                            border: "1px solid rgba(255,255,255,0.1)", background: "var(--o1)",
                            color: "#fff", fontSize: 13, outline: "none", marginBottom: 12,
                          }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => declineSuggestion(s.id)} style={{
                            padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                            background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600,
                          }}>Decline</button>
                          <button onClick={() => setDeclineId(null)} style={{
                            padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                            background: "transparent", color: "var(--c2)", fontSize: 13, cursor: "pointer",
                          }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Calendar Tab ──────────────────────────────────────── */}
      {activeTab === "calendar" && (
        <div>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 14px", color: "#fff", cursor: "pointer" }}>←</button>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>
              {calMonth.toLocaleString("default", { month: "long", year: "numeric" })}
            </h2>
            <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 14px", color: "#fff", cursor: "pointer" }}>→</button>
          </div>

          {/* Grid header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--c3)", padding: "8px 0" }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} style={{ aspectRatio: "1", borderRadius: 8 }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(calYear, calMonthIdx, day);
              const dateStr = date.toISOString().slice(0, 10);
              const isToday = dateStr === new Date().toISOString().slice(0, 10);
              const dayPosts = approvedSuggestions.filter(s => s.week_of === dateStr || s.best_posting_time?.toLowerCase().includes(date.toLocaleString("default", { weekday: "long" }).toLowerCase()));

              return (
                <div key={day} style={{
                  minHeight: 80, borderRadius: 8, padding: "8px 6px",
                  background: isToday ? "rgba(124,58,237,0.12)" : "var(--o1)",
                  border: `1px solid ${isToday ? "rgba(124,58,237,0.3)" : "var(--o2)"}`,
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: isToday ? 700 : 400,
                    color: isToday ? "#a78bfa" : "var(--c2)",
                    marginBottom: 4,
                  }}>{day}</div>
                  {dayPosts.slice(0, 2).map(post => (
                    <div key={post.id} style={{
                      fontSize: 10, padding: "2px 5px", borderRadius: 4, marginBottom: 2,
                      background: "rgba(124,58,237,0.25)", color: "#a78bfa",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }} title={post.title}>{post.title}</div>
                  ))}
                  {dayPosts.length > 2 && (
                    <div style={{ fontSize: 10, color: "var(--c3)" }}>+{dayPosts.length - 2} more</div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { color: "rgba(124,58,237,0.5)", label: "Approved" },
              { color: "rgba(16,185,129,0.5)", label: "Posted" },
              { color: "rgba(59,130,246,0.5)", label: "Scheduled" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                <span style={{ fontSize: 12, color: "var(--c3)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Generate Tab ──────────────────────────────────────── */}
      {activeTab === "generate" && (
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{
            background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: 12, padding: 20, marginBottom: 24,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#a78bfa", marginBottom: 8 }}>✦ AI Content Generation</div>
            <div style={{ fontSize: 13, color: "var(--c2)", lineHeight: 1.6 }}>
              The AI reads your Brand Studio profile — company type, personality, content themes, inspiration accounts, and posting goals — then generates a full week of high-performance content suggestions with A/B/C variations and performance scores.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--c2)", display: "block", marginBottom: 8 }}>
                Generate content for week of
              </label>
              <input type="date" value={genSettings.week_of}
                onChange={e => setGenSettings(s => ({ ...s, week_of: e.target.value }))}
                style={{
                  padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                  background: "var(--o1)", color: "#fff", fontSize: 14, outline: "none",
                }} />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--c2)", display: "block", marginBottom: 8 }}>
                Number of suggestions to generate
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {[5, 7, 10, 14].map(n => (
                  <button key={n} onClick={() => setGenSettings(s => ({ ...s, posts_count: n }))}
                    style={{
                      width: 56, height: 48, borderRadius: 8, border: `1.5px solid ${genSettings.posts_count === n ? "#7c3aed" : "var(--c5)"}`,
                      background: genSettings.posts_count === n ? "rgba(124,58,237,0.2)" : "var(--o1)",
                      color: genSettings.posts_count === n ? "#a78bfa" : "var(--c2)",
                      cursor: "pointer", fontSize: 15, fontWeight: 700,
                    }}>{n}</button>
                ))}
              </div>
            </div>

            <button onClick={triggerGeneration} disabled={generating} style={{
              padding: "16px", borderRadius: 10, border: "none", cursor: generating ? "not-allowed" : "pointer",
              background: generating ? "rgba(124,58,237,0.2)" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
              color: "#fff", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center",
              justifyContent: "center", gap: 10, transition: "all 0.3s",
            }}>
              {generating ? (
                <>
                  <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  AI is generating {genSettings.posts_count} posts…
                </>
              ) : (
                <>✦ Generate {genSettings.posts_count} Content Suggestions</>
              )}
            </button>

            {generating && (
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--c3)", lineHeight: 1.8 }}>
                The AI is:<br />
                • Reading your brand profile and inspiration accounts<br />
                • Researching trending content in your industry<br />
                • Writing {genSettings.posts_count * 3} captions (3 variations each)<br />
                • Scoring each post against viral benchmarks<br />
                <br />
                Suggestions will appear in ~2-3 minutes.
              </div>
            )}
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
