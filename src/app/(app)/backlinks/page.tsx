"use client";

import { useState, useEffect } from "react";

interface Backlink {
  id: string;
  url: string;
  target_url: string;
  anchor_text?: string;
  domain_authority?: number;
  status: "live" | "pending" | "lost";
  created_at: string;
}

interface Opportunity {
  site_name: string;
  site_url: string;
  domain_authority: number;
  type: string;
  relevance: number;
  estimated_traffic: string;
  contact_email?: string;
  notes?: string;
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  live: { color: "#34d399", bg: "rgba(52,211,153,0.12)", label: "Live" },
  pending: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", label: "Pending" },
  lost: { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "Lost" },
};

const TYPE_LABELS: Record<string, string> = {
  guest_post: "Guest Post",
  directory: "Directory",
  resource_page: "Resource Page",
  niche_edit: "Niche Edit",
  broken_link: "Broken Link",
};

export default function BacklinksPage() {
  const [tab, setTab] = useState<"tracker" | "discover">("discover");
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [domain, setDomain] = useState("");
  const [niche, setNiche] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [requested, setRequested] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/backlinks")
      .then((r) => r.json())
      .then((d) => { if (d.data) setBacklinks(d.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleDiscover() {
    if (!domain.trim()) {
      setError("Enter your domain to discover opportunities.");
      return;
    }
    setError(null);
    setIsDiscovering(true);
    try {
      const res = await fetch("/api/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discover", domain: domain.trim(), niche: niche.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Discovery failed");
      const data = await res.json() as { opportunities?: Opportunity[] };
      setOpportunities(data.opportunities ?? []);
      if (data.opportunities?.length === 0) setError("No opportunities found. Try a different domain or niche.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discovery failed.");
    } finally {
      setIsDiscovering(false);
    }
  }

  async function handleRequest(opp: Opportunity) {
    setRequesting(opp.site_url);
    try {
      await fetch("/api/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          site_name: opp.site_name,
          site_url: opp.site_url,
          contact_email: opp.contact_email,
          domain_authority: opp.domain_authority,
          link_type: opp.type,
        }),
      });
      setRequested((prev) => new Set([...prev, opp.site_url]));
    } catch { /* silently ignore */ } finally {
      setRequesting(null);
    }
  }

  const liveCount = backlinks.filter((b) => b.status === "live").length;
  const pendingCount = backlinks.filter((b) => b.status === "pending").length;
  const lostCount = backlinks.filter((b) => b.status === "lost").length;

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Link building & tracking</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: "rgba(255,255,255,0.95)", margin: 0, lineHeight: 1.1 }}>Backlinks</h1>
        </div>
        {/* Stats pills */}
        <div className="flex items-center gap-2">
          {[
            { label: "Live", value: liveCount, color: "#34d399" },
            { label: "Pending", value: pendingCount, color: "#fbbf24" },
            { label: "Lost", value: lostCount, color: "#f87171" },
          ].map((s) => (
            <div key={s.label} className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: `${s.color}12`, border: `1px solid ${s.color}25`, color: s.color }}>
              {s.value} {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        {[{ id: "discover", label: "Discover Opportunities" }, { id: "tracker", label: "Backlink Tracker" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as "tracker" | "discover")}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? "rgba(124,58,237,0.15)" : "transparent",
              color: tab === t.id ? "#a78bfa" : "var(--color-text-2)",
              border: tab === t.id ? "1px solid rgba(124,58,237,0.2)" : "1px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Discovery Tab */}
      {tab === "discover" && (
        <div className="space-y-6 animate-fade-up">
          {/* Discovery form */}
          <div className="rounded-2xl p-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Find Link Building Opportunities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--color-text-muted)" }}>Your domain</label>
                <input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="yourdomain.com"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(124,58,237,0.4)"; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--color-border-subtle)"; }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--color-text-muted)" }}>Niche / Industry (optional)</label>
                <input
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. marketing software, DTC fashion"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(124,58,237,0.4)"; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--color-border-subtle)"; }}
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl px-4 py-2.5 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleDiscover}
              disabled={isDiscovering}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
            >
              {isDiscovering ? (
                <><svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/><path d="M7 2a5 5 0 0 1 5 5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg> Discovering…</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 10l-1.5 1.5a2.5 2.5 0 0 1-3.54-3.54l3-3A2.5 2.5 0 0 1 8.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M9 6l1.5-1.5a2.5 2.5 0 0 1 3.54 3.54l-3 3A2.5 2.5 0 0 1 7.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> Discover Opportunities</>
              )}
            </button>
          </div>

          {/* Opportunities */}
          {opportunities.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
                  {opportunities.length} Opportunities Found
                </h2>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
                {opportunities.map((opp, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 px-6 py-4 transition-colors"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa" }}>
                      {opp.domain_authority}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>{opp.site_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>{TYPE_LABELS[opp.type] ?? opp.type}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>{opp.relevance}% match</span>
                      </div>
                      <div className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                        {opp.site_url} · {opp.estimated_traffic} traffic · DA {opp.domain_authority}
                      </div>
                      {opp.notes && (
                        <p className="text-xs" style={{ color: "var(--color-text-2)" }}>{opp.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRequest(opp)}
                      disabled={requesting === opp.site_url || requested.has(opp.site_url)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 disabled:opacity-60"
                      style={requested.has(opp.site_url)
                        ? { background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }
                        : { background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}
                    >
                      {requesting === opp.site_url ? "Saving…" : requested.has(opp.site_url) ? "Requested ✓" : "Request Link"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tracker Tab */}
      {tab === "tracker" && (
        <div className="animate-fade-up">
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Tracked Backlinks</h2>
              <button
                onClick={() => setTab("discover")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                Add Links
              </button>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl" style={{ background: "var(--color-surface-2)" }} />)}
              </div>
            ) : backlinks.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa" }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M9 13l-2 2a3.5 3.5 0 0 1-4.95-4.95l4-4A3.5 3.5 0 0 1 11.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M13 9l2-2a3.5 3.5 0 0 1 4.95 4.95l-4 4A3.5 3.5 0 0 1 10.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-1)" }}>No backlinks tracked yet</p>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Discover opportunities above and start building your link profile.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
                {backlinks.map((bl) => {
                  const s = STATUS_STYLES[bl.status] ?? STATUS_STYLES.pending;
                  return (
                    <div
                      key={bl.id}
                      className="flex items-center gap-4 px-6 py-4 transition-colors"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-1)" }}>{bl.url}</span>
                          {bl.domain_authority != null && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa" }}>DA {bl.domain_authority}</span>
                          )}
                        </div>
                        {bl.anchor_text && (
                          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>Anchor: &ldquo;{bl.anchor_text}&rdquo;</div>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
