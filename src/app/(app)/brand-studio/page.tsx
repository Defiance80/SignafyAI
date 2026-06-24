"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────
interface BrandProfile {
  company_type: string;
  industry: string;
  description: string;
  logo_url: string;
  primary_color: string;
  personality_traits: string[];
  background_story: string;
  interests: string[];
  content_themes: string[];
  target_audience_description: string;
  posting_goals: string[];
  hashtag_strategy: string;
}

interface InspirationAccount {
  id: string;
  platform: string;
  handle: string;
  display_name?: string;
  why?: string;
  category: string;
}

interface CalendarSettings {
  platforms: string[];
  posting_frequency: string;
  posts_per_week: number;
  content_mix: Record<string, number>;
  auto_approve: boolean;
  auto_post_approved: boolean;
  generate_variations: number;
  auto_post_platforms: string[];
}

// ── Constants ─────────────────────────────────────────────────
const COMPANY_TYPES = [
  { value: "business",   label: "Business",   icon: "🏢", desc: "Product or service company" },
  { value: "individual", label: "Individual",  icon: "👤", desc: "Personal brand or freelancer" },
  { value: "creator",    label: "Creator",     icon: "🎨", desc: "Content creator or influencer" },
  { value: "agency",     label: "Agency",      icon: "🚀", desc: "Marketing or creative agency" },
];

const PERSONALITY_TRAITS = [
  "Authentic", "Educational", "Humorous", "Inspirational", "Bold",
  "Professional", "Casual", "Community-driven", "Storytelling", "Data-driven",
  "Motivational", "Controversial", "Empathetic", "Expert", "Relatable",
];

const POSTING_GOALS = [
  { value: "brand_awareness", label: "Brand Awareness", icon: "📢" },
  { value: "lead_gen",        label: "Lead Generation", icon: "🎯" },
  { value: "community",       label: "Community Building", icon: "🤝" },
  { value: "sales",           label: "Drive Sales", icon: "💰" },
  { value: "education",       label: "Educate Audience", icon: "📚" },
  { value: "authority",       label: "Build Authority", icon: "🏆" },
];

const CONTENT_THEMES = [
  "Behind-the-scenes", "Tips & How-tos", "Client wins", "Industry news",
  "Motivational quotes", "Product showcases", "Team highlights", "FAQs",
  "Case studies", "Trends & opinions", "Local events", "User-generated content",
];

const PLATFORMS = [
  { value: "linkedin",  label: "LinkedIn",  color: "#0a66c2" },
  { value: "instagram", label: "Instagram", color: "#e1306c" },
  { value: "tiktok",    label: "TikTok",    color: "#00f2ea" },
  { value: "facebook",  label: "Facebook",  color: "#1877f2" },
  { value: "x",         label: "X / Twitter", color: "#e7e9ea" },
];

const INSPO_PLATFORMS = ["LinkedIn", "Instagram", "TikTok", "Facebook", "X", "YouTube"];
const INSPO_CATEGORIES = [
  { value: "inspiration",    label: "Inspiration" },
  { value: "competitor",     label: "Competitor" },
  { value: "industry_leader",label: "Industry Leader" },
  { value: "aspirational",   label: "Aspirational" },
];

const FREQUENCIES = [
  { value: "daily",    label: "Daily",          sub: "7x / week" },
  { value: "5x_week",  label: "Most Days",      sub: "5x / week" },
  { value: "3x_week",  label: "Every Other Day", sub: "3x / week" },
  { value: "weekly",   label: "Weekly",          sub: "1x / week" },
];

const CONTENT_MIX_TYPES = [
  { key: "educational",   label: "Educational", color: "#3b82f6" },
  { key: "promotional",   label: "Promotional", color: "#7c3aed" },
  { key: "entertainment", label: "Entertainment", color: "#f59e0b" },
  { key: "behind_scenes", label: "Behind-the-scenes", color: "#10b981" },
];

// ── Helpers ───────────────────────────────────────────────────
function toggleArray<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
}

function ScoreRing({ value }: { value: number }) {
  const r = 22; const c = 2 * Math.PI * r;
  const pct = value / 100;
  const color = value >= 80 ? "#10b981" : value >= 60 ? "#3b82f6" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="60" height="60" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x="30" y="34" textAnchor="middle" fill={color} fontSize="13" fontWeight="700"
        style={{ transform: "rotate(90deg) translate(0,-60px)" }}>{value}</text>
    </svg>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function BrandStudioPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<BrandProfile>({
    company_type: "business", industry: "", description: "", logo_url: "",
    primary_color: "#7c3aed", personality_traits: [], background_story: "",
    interests: [], content_themes: [], target_audience_description: "",
    posting_goals: [], hashtag_strategy: "",
  });

  const [inspoAccounts, setInspoAccounts] = useState<InspirationAccount[]>([]);
  const [newInspo, setNewInspo] = useState({ platform: "LinkedIn", handle: "", why: "", category: "inspiration" });
  const [addingInspo, setAddingInspo] = useState(false);

  const [calSettings, setCalSettings] = useState<CalendarSettings>({
    platforms: ["linkedin", "instagram"],
    posting_frequency: "5x_week",
    posts_per_week: 5,
    content_mix: { educational: 40, promotional: 20, entertainment: 30, behind_scenes: 10 },
    auto_approve: false,
    auto_post_approved: false,
    generate_variations: 3,
    auto_post_platforms: [],
  });

  // Load all data
  useEffect(() => {
    Promise.all([
      fetch("/api/brand/profile").then(r => r.json()),
      fetch("/api/brand/inspiration").then(r => r.json()),
      fetch("/api/calendar/settings").then(r => r.json()),
    ]).then(([profileRes, inspoRes, calRes]) => {
      if (profileRes.profile) setProfile(p => ({ ...p, ...profileRes.profile }));
      if (inspoRes.accounts) setInspoAccounts(inspoRes.accounts);
      if (calRes.settings) setCalSettings(s => ({ ...s, ...calRes.settings }));
    }).finally(() => setLoading(false));
  }, []);

  const saveAll = useCallback(async () => {
    setSaving(true);
    await Promise.all([
      fetch("/api/brand/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) }),
      fetch("/api/calendar/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(calSettings) }),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [profile, calSettings]);

  const addInspoAccount = useCallback(async () => {
    if (!newInspo.handle.trim()) return;
    setAddingInspo(true);
    const res = await fetch("/api/brand/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newInspo),
    });
    const data = await res.json();
    if (data.account) {
      setInspoAccounts(prev => [data.account, ...prev]);
    } else {
      // demo fallback
      setInspoAccounts(prev => [{ id: Date.now().toString(), ...newInspo }, ...prev]);
    }
    setNewInspo({ platform: "LinkedIn", handle: "", why: "", category: "inspiration" });
    setAddingInspo(false);
  }, [newInspo]);

  const removeInspoAccount = useCallback(async (id: string) => {
    await fetch(`/api/brand/inspiration?id=${id}`, { method: "DELETE" });
    setInspoAccounts(prev => prev.filter(a => a.id !== id));
  }, []);

  const mixTotal = Object.values(calSettings.content_mix).reduce((a, b) => a + b, 0);

  const tabs = ["Company Profile", "Brand Identity", "Inspiration", "Calendar Settings"];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "rgba(255,255,255,0.4)" }}>
        Loading brand profile…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 40px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.95)", margin: 0 }}>Brand Studio</h1>
          <p style={{ color: "rgba(255,255,255,0.38)", marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>
            Your AI content engine. The richer this is, the better your content suggestions will be.
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          style={{
            padding: "10px 24px", borderRadius: 8, border: "none", cursor: saving ? "not-allowed" : "pointer",
            background: saved ? "#10b981" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
            color: "#fff", fontSize: 14, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
          }}
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 28, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4 }}>
        {tabs.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)} style={{
            flex: 1, padding: "9px 4px", borderRadius: 8, border: "none", cursor: "pointer",
            background: activeTab === i ? "rgba(124,58,237,0.3)" : "transparent",
            color: activeTab === i ? "#a78bfa" : "rgba(255,255,255,0.45)",
            fontSize: 13, fontWeight: activeTab === i ? 600 : 400, transition: "all 0.2s",
          }}>{tab}</button>
        ))}
      </div>

      {/* ── Tab 0: Company Profile ────────────────────────────── */}
      {activeTab === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Company type */}
          <Field label="What best describes you?" required>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {COMPANY_TYPES.map(t => (
                <button key={t.value} onClick={() => setProfile(p => ({ ...p, company_type: t.value }))}
                  style={{
                    padding: "14px 16px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                    border: `1.5px solid ${profile.company_type === t.value ? "#7c3aed" : "rgba(255,255,255,0.1)"}`,
                    background: profile.company_type === t.value ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                    color: "#fff", transition: "all 0.2s",
                  }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{t.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Industry">
              <Input placeholder="e.g. Real Estate, Fitness, SaaS, Law…"
                value={profile.industry} onChange={v => setProfile(p => ({ ...p, industry: v }))} />
            </Field>
            <Field label="Logo URL">
              <Input placeholder="https://yourdomain.com/logo.png"
                value={profile.logo_url} onChange={v => setProfile(p => ({ ...p, logo_url: v }))} />
            </Field>
          </div>

          <Field label="Brand Description" hint="Your elevator pitch — what you do, who you serve, your key differentiator">
            <Textarea rows={3} placeholder="We help independent real estate agents close more deals by turning their personal brand into their biggest lead magnet…"
              value={profile.description} onChange={v => setProfile(p => ({ ...p, description: v }))} />
          </Field>

          <Field label="Target Audience" hint="Be specific — the AI uses this to write in their language">
            <Textarea rows={2} placeholder="Female entrepreneurs aged 28–45, building their first 6-figure business, tech-savvy, values authenticity over corporate polish…"
              value={profile.target_audience_description}
              onChange={v => setProfile(p => ({ ...p, target_audience_description: v }))} />
          </Field>

          <Field label="Primary Color">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input type="color" value={profile.primary_color}
                onChange={e => setProfile(p => ({ ...p, primary_color: e.target.value }))}
                style={{ width: 48, height: 40, borderRadius: 8, border: "none", cursor: "pointer", background: "none" }} />
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{profile.primary_color}</span>
            </div>
          </Field>
        </div>
      )}

      {/* ── Tab 1: Brand Identity ─────────────────────────────── */}
      {activeTab === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Field label="Personality Traits" hint="Select all that describe your brand's voice (the AI picks the right tone for each post)">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PERSONALITY_TRAITS.map(t => {
                const on = profile.personality_traits.includes(t);
                return (
                  <button key={t} onClick={() => setProfile(p => ({ ...p, personality_traits: toggleArray(p.personality_traits, t) }))}
                    style={{
                      padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${on ? "#7c3aed" : "rgba(255,255,255,0.12)"}`,
                      background: on ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                      color: on ? "#a78bfa" : "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13, fontWeight: on ? 600 : 400,
                      transition: "all 0.15s",
                    }}>{t}</button>
                );
              })}
            </div>
          </Field>

          <Field label="Posting Goals" hint="What are you trying to achieve with your content?">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {POSTING_GOALS.map(g => {
                const on = profile.posting_goals.includes(g.value);
                return (
                  <button key={g.value}
                    onClick={() => setProfile(p => ({ ...p, posting_goals: toggleArray(p.posting_goals, g.value) }))}
                    style={{
                      padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                      border: `1.5px solid ${on ? "#7c3aed" : "rgba(255,255,255,0.1)"}`,
                      background: on ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                      color: on ? "#a78bfa" : "rgba(255,255,255,0.55)", fontSize: 13, display: "flex",
                      alignItems: "center", gap: 6, transition: "all 0.15s",
                    }}>
                    <span>{g.icon}</span>{g.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Content Themes" hint="What topics do you post about regularly?">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CONTENT_THEMES.map(t => {
                const on = profile.content_themes.includes(t);
                return (
                  <button key={t} onClick={() => setProfile(p => ({ ...p, content_themes: toggleArray(p.content_themes, t) }))}
                    style={{
                      padding: "6px 14px", borderRadius: 20,
                      border: `1.5px solid ${on ? "#7c3aed" : "rgba(255,255,255,0.12)"}`,
                      background: on ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                      color: on ? "#a78bfa" : "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13,
                      transition: "all 0.15s",
                    }}>{t}</button>
                );
              })}
            </div>
          </Field>

          <Field label="Brand Story / Background" hint="Your origin story — what drove you to start, what you stand for, turning points">
            <Textarea rows={4}
              placeholder="Started in 2019 out of frustration with agencies who charged a fortune and delivered nothing…"
              value={profile.background_story}
              onChange={v => setProfile(p => ({ ...p, background_story: v }))} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Interests & Passions" hint="Comma-separated — the AI weaves these in to make content feel personal">
              <Input placeholder="travel, fitness, NBA, personal development…"
                value={profile.interests.join(", ")}
                onChange={v => setProfile(p => ({ ...p, interests: v.split(",").map(s => s.trim()).filter(Boolean) }))} />
            </Field>
            <Field label="Hashtag Strategy" hint="How you use hashtags — let the AI know">
              <Input placeholder="Mix of 3 niche + 2 broad tags per post, always include #[city]"
                value={profile.hashtag_strategy}
                onChange={v => setProfile(p => ({ ...p, hashtag_strategy: v }))} />
            </Field>
          </div>
        </div>
      )}

      {/* ── Tab 2: Inspiration ────────────────────────────────── */}
      {activeTab === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{
            background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: 10, padding: "14px 18px",
          }}>
            <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600, marginBottom: 4 }}>How this works</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              Add accounts you admire or want to emulate. The AI will study their content style, posting patterns, and engagement tactics — then suggest content with a similar energy but 100% your own voice.
            </div>
          </div>

          {/* Add new account */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 20, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 14 }}>Add Account</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 12, marginBottom: 12 }}>
              <div>
                <Label>Platform</Label>
                <select value={newInspo.platform} onChange={e => setNewInspo(p => ({ ...p, platform: e.target.value }))}
                  style={selectStyle}>
                  {INSPO_PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <Label>Handle / URL</Label>
                <Input placeholder="@garyvee or https://linkedin.com/in/…"
                  value={newInspo.handle} onChange={v => setNewInspo(p => ({ ...p, handle: v }))} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <Label>Why do you like them?</Label>
                <Input placeholder="They nail short-form education content with no fluff"
                  value={newInspo.why} onChange={v => setNewInspo(p => ({ ...p, why: v }))} />
              </div>
              <div>
                <Label>Category</Label>
                <select value={newInspo.category} onChange={e => setNewInspo(p => ({ ...p, category: e.target.value }))}
                  style={selectStyle}>
                  {INSPO_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <button onClick={addInspoAccount} disabled={addingInspo || !newInspo.handle.trim()}
              style={{
                padding: "9px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "rgba(124,58,237,0.3)", color: "#a78bfa", fontSize: 13, fontWeight: 600,
              }}>
              {addingInspo ? "Adding…" : "+ Add Account"}
            </button>
          </div>

          {/* List */}
          {inspoAccounts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
              No inspiration accounts yet. Add some above to help the AI understand your style.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inspoAccounts.map(acc => (
                <div key={acc.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "14px 16px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: "rgba(124,58,237,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: "#a78bfa", flexShrink: 0,
                  }}>{acc.platform.slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, color: "#fff", fontSize: 14 }}>{acc.handle}</span>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 10,
                        background: "rgba(124,58,237,0.15)", color: "#a78bfa",
                      }}>{acc.category.replace("_", " ")}</span>
                    </div>
                    {acc.why && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{acc.why}</div>}
                  </div>
                  <button onClick={() => removeInspoAccount(acc.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 18, lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Calendar Settings ──────────────────────────── */}
      {activeTab === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {/* Platforms */}
          <Field label="Active Platforms" hint="Where do you want to post?">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {PLATFORMS.map(p => {
                const on = calSettings.platforms.includes(p.value);
                return (
                  <button key={p.value}
                    onClick={() => setCalSettings(s => ({ ...s, platforms: toggleArray(s.platforms, p.value) }))}
                    style={{
                      padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                      border: `1.5px solid ${on ? p.color : "rgba(255,255,255,0.1)"}`,
                      background: on ? `${p.color}22` : "rgba(255,255,255,0.04)",
                      color: on ? p.color : "rgba(255,255,255,0.55)",
                      transition: "all 0.15s",
                    }}>{p.label}</button>
                );
              })}
            </div>
          </Field>

          {/* Posting frequency */}
          <Field label="Posting Frequency">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              {FREQUENCIES.map(f => {
                const on = calSettings.posting_frequency === f.value;
                return (
                  <button key={f.value}
                    onClick={() => setCalSettings(s => ({ ...s, posting_frequency: f.value }))}
                    style={{
                      padding: "12px 8px", borderRadius: 8, border: `1.5px solid ${on ? "#7c3aed" : "rgba(255,255,255,0.1)"}`,
                      background: on ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                      color: on ? "#a78bfa" : "rgba(255,255,255,0.5)", cursor: "pointer", textAlign: "center",
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{f.sub}</div>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Content mix */}
          <Field label="Content Mix" hint={`Percentages should add up to 100% — currently ${mixTotal}%`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {CONTENT_MIX_TYPES.map(type => {
                const val = calSettings.content_mix[type.key] ?? 0;
                return (
                  <div key={type.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{type.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: type.color }}>{val}%</span>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input type="range" min={0} max={100} step={5} value={val}
                        onChange={e => setCalSettings(s => ({
                          ...s,
                          content_mix: { ...s.content_mix, [type.key]: parseInt(e.target.value) }
                        }))}
                        style={{ width: "100%", accentColor: type.color }} />
                      <div style={{
                        height: 4, borderRadius: 2, background: `linear-gradient(90deg, ${type.color} ${val}%, rgba(255,255,255,0.1) ${val}%)`,
                        marginTop: -8, pointerEvents: "none",
                      }} />
                    </div>
                  </div>
                );
              })}
              {mixTotal !== 100 && (
                <div style={{ fontSize: 12, color: "#f59e0b", background: "rgba(245,158,11,0.1)", borderRadius: 6, padding: "8px 12px" }}>
                  ⚠ Total is {mixTotal}% — adjust sliders to reach 100%
                </div>
              )}
            </div>
          </Field>

          {/* AI Variations */}
          <Field label="Variations per Suggestion" hint="How many caption options (A/B/C) the AI generates for each post">
            <div style={{ display: "flex", gap: 8 }}>
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => setCalSettings(s => ({ ...s, generate_variations: n }))}
                  style={{
                    width: 48, height: 48, borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 700,
                    border: `1.5px solid ${calSettings.generate_variations === n ? "#7c3aed" : "rgba(255,255,255,0.1)"}`,
                    background: calSettings.generate_variations === n ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                    color: calSettings.generate_variations === n ? "#a78bfa" : "rgba(255,255,255,0.5)",
                  }}>{n}</button>
              ))}
            </div>
          </Field>

          {/* Automation toggles */}
          <Field label="Automation" hint="Save time — but review carefully before enabling auto-post">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Toggle
                label="Auto-approve high-confidence suggestions (score ≥ 85)"
                sub="AI marks them approved — still shows in calendar for review"
                value={calSettings.auto_approve}
                onChange={v => setCalSettings(s => ({ ...s, auto_approve: v }))}
              />
              <Toggle
                label="Auto-post when approved"
                sub="Posts go live immediately when you approve — or at scheduled time"
                value={calSettings.auto_post_approved}
                onChange={v => setCalSettings(s => ({ ...s, auto_post_approved: v }))}
              />
            </div>
          </Field>
        </div>
      )}
    </div>
  );
}

// ── Small UI components ───────────────────────────────────────

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{label}</span>
        {required && <span style={{ color: "#7c3aed", marginLeft: 4 }}>*</span>}
        {hint && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>{children}</div>;
}

const inputBase: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
  color: "#fff", fontSize: 14, outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputBase, cursor: "pointer", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='rgba(255,255,255,0.4)' strokeWidth='1.5' fill='none'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
};

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={inputBase} />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ ...inputBase, resize: "vertical", lineHeight: 1.5 }} />
  );
}

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
      background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px 14px" }}>
      <div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", flexShrink: 0,
        background: value ? "#7c3aed" : "rgba(255,255,255,0.1)", transition: "background 0.2s", position: "relative",
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute",
          top: 3, left: value ? 23 : 3, transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}
