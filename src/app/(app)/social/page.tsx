"use client";

import { useState, useEffect } from "react";

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#e040fb",
  linkedin:  "#0a66c2",
  tiktok:    "#00f2ea",
  twitter:   "#8899a6",
  facebook:  "#1877f2",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  linkedin:  "LinkedIn",
  tiktok:    "TikTok",
  twitter:   "Twitter/X",
  facebook:  "Facebook",
};

interface Message {
  id: string;
  platform: string;
  author_name: string;
  author_handle?: string;
  body: string;
  ai_reply?: string | null;
  is_read: boolean;
  status: string;
  received_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const DEMO_MESSAGES: Message[] = [
  {
    id: "d1", platform: "instagram", author_name: "Emma Lawson",
    body: "Hey! I saw your post about content strategies and wanted to reach out. We're a mid-size e-commerce brand doing about $2M/year and want to scale to $5M through better organic reach. Do you work with DTC brands?",
    ai_reply: `Hi Emma! Thanks so much for reaching out.\n\nWe absolutely work with DTC brands — e-commerce is one of our sweet spots. We've helped several brands in the $2-5M range scale their social presence significantly.\n\nI'd love to learn more about your current strategy. Would you be open to a quick 15-minute call this week?`,
    is_read: false, status: "pending", received_at: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: "d2", platform: "linkedin", author_name: "Ryan Choi",
    body: "Would love to discuss a potential partnership for our clients. We run a growth consulting firm and often need content automation tools.",
    ai_reply: `Hi Ryan! Great to connect.\n\nPartnerships are definitely something we're open to. What types of clients do you work with primarily — B2B, DTC, or a mix? Happy to hop on a quick call to explore what that could look like.`,
    is_read: false, status: "pending", received_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: "d3", platform: "tiktok", author_name: "Zara Ahmed",
    body: "Love your latest video! Can you do one about SEO for small businesses?",
    ai_reply: `Thank you so much, Zara! That means a lot.\n\nSEO for small businesses is actually on our content roadmap — great timing! Stay tuned, we have something coming on that topic in the next few weeks.`,
    is_read: false, status: "pending", received_at: new Date(Date.now() - 42 * 60000).toISOString(),
  },
  {
    id: "d4", platform: "twitter", author_name: "Mike Turner",
    body: "Great thread on AI marketing tools. Quick question — does SignafyAI integrate with HubSpot?",
    ai_reply: `Thanks Mike! HubSpot integration is on the roadmap for Q3. Right now we have direct CSV export and webhook support that works great with most CRMs. Want me to share the docs?`,
    is_read: true, status: "pending", received_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "d5", platform: "instagram", author_name: "Sofia Martinez",
    body: "Hi! Are you taking on new clients right now? We're a fitness brand looking for help with Instagram content.",
    ai_reply: null,
    is_read: true, status: "pending", received_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

export default function SocialPage() {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [selected, setSelected]     = useState<number>(0);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [isLoading, setIsLoading]   = useState(true);
  const [editMode, setEditMode]     = useState(false);
  const [editText, setEditText]     = useState("");
  const [isSending, setIsSending]   = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);

  useEffect(() => {
    fetch("/api/social/messages?per_page=20")
      .then((r) => r.json())
      .then((d) => {
        const msgs: Message[] = d.data ?? [];
        if (msgs.length === 0) {
          setMessages(DEMO_MESSAGES);
          setUnreadCount(DEMO_MESSAGES.filter((m) => !m.is_read).length);
        } else {
          setMessages(msgs);
          setUnreadCount(d.unread_count ?? 0);
        }
      })
      .catch(() => { setMessages(DEMO_MESSAGES); setUnreadCount(3); })
      .finally(() => setIsLoading(false));
  }, []);

  const msg = messages[selected];

  function selectMessage(i: number) {
    setSelected(i);
    setMobileView("thread");
    setEditMode(false);
    setEditText("");
    setMessages((prev) => prev.map((m, idx) => idx === i ? { ...m, is_read: true } : m));
  }

  async function handleApproveAndSend() {
    if (!msg) return;
    const body = editMode ? editText : (msg.ai_reply ?? "");
    if (!body.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/social/messages/${msg.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, approve_and_send: true }),
      });
      if (res.ok) {
        setMessages((prev) => prev.map((m, i) => i === selected ? { ...m, status: "replied", is_read: true } : m));
        setEditMode(false);
      }
    } finally { setIsSending(false); }
  }

  async function handleDismiss() {
    if (!msg) return;
    await fetch(`/api/social/messages/${msg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed", is_read: true }),
    }).catch(() => {});
    setMessages((prev) => prev.map((m, i) => i === selected ? { ...m, status: "dismissed" } : m));
  }

  async function handleGenerateReply() {
    if (!msg) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/social/messages/${msg.id}/generate-reply`, { method: "POST" });
      if (res.ok) {
        const d = await res.json() as { reply?: string };
        if (d.reply) {
          setMessages((prev) => prev.map((m, i) => i === selected ? { ...m, ai_reply: d.reply! } : m));
          return;
        }
      }
    } catch { /* fall through */ } finally { setIsGenerating(false); }
    const fallback = `Hi ${msg.author_name.split(" ")[0]}! Thanks for reaching out.\n\nWe'd love to connect and learn more about what you're working on. Feel free to share more details or suggest a time to chat!`;
    setMessages((prev) => prev.map((m, i) => i === selected ? { ...m, ai_reply: fallback } : m));
  }

  const platColor = msg ? (PLATFORM_COLORS[msg.platform] ?? "#7c3aed") : "#7c3aed";
  const canSend = !isSending && (!!msg?.ai_reply || editMode);

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 14, color: "var(--c3)", marginBottom: 8, fontWeight: 500 }}>Manage conversations</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--c1)", margin: 0, lineHeight: 1.1 }}>Social Inbox</h1>
        </div>
        {mobileView === "thread" && (
          <button
            onClick={() => setMobileView("list")}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 10,
              border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
              color: "var(--c2)", cursor: "pointer", fontSize: 13, fontWeight: 500,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--o2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
        )}
      </div>

      {/* ── Two-panel layout ────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 16, minHeight: "calc(100vh - 220px)" }}>

        {/* ── Message List Panel ──────────────────────────────── */}
        <div style={{
          width: 340, minWidth: 260, flexShrink: 0, borderRadius: 16, overflow: "hidden",
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          display: mobileView === "thread" ? "none" : "flex", flexDirection: "column",
        }}>
          {/* Panel header */}
          <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--color-border-subtle)", flexShrink: 0 }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--c1)", display: "flex", alignItems: "center", gap: 8 }}>
              Messages
              {unreadCount > 0 && (
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(124,58,237,0.15)", color: "#a78bfa", fontWeight: 600 }}>
                  {unreadCount} new
                </span>
              )}
            </h2>
          </div>

          {isLoading ? (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 64, borderRadius: 10, background: "var(--color-surface-2)" }} />
              ))}
            </div>
          ) : (
            <div style={{ overflowY: "auto", flex: 1 }}>
              {messages.map((m, i) => {
                const color    = PLATFORM_COLORS[m.platform] ?? "#7c3aed";
                const platLabel = PLATFORM_LABELS[m.platform] ?? m.platform;
                const isActive  = selected === i;
                return (
                  <div
                    key={m.id}
                    onClick={() => selectMessage(i)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      padding: "14px 20px", cursor: "pointer", transition: "background 0.15s",
                      background: isActive ? "var(--color-surface-2)" : "transparent",
                      borderBottom: "1px solid var(--color-border-subtle)",
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, background: `${color}20`, color,
                    }}>
                      {m.author_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.author_name}</span>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, flexShrink: 0, background: `${color}18`, color }}>{platLabel}</span>
                        {!m.is_read && <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: "#7c3aed" }} />}
                        {m.status === "replied" && (
                          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, flexShrink: 0, background: "rgba(52,211,153,0.12)", color: "#34d399" }}>Replied</span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--c3)" }}>{m.body}</p>
                    </div>

                    {/* Timestamp */}
                    <span style={{ fontSize: 10, flexShrink: 0, marginTop: 2, color: "var(--c3)", whiteSpace: "nowrap" }}>{timeAgo(m.received_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Conversation Thread Panel ────────────────────────── */}
        <div style={{
          flex: 1, minWidth: 0, borderRadius: 16,
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          display: mobileView === "list" ? "none" : "flex", flexDirection: "column",
        }}>
          {!msg ? (
            /* Empty state */
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 32px", textAlign: "center" }}>
              <div>
                <div style={{
                  width: 52, height: 52, borderRadius: 16, margin: "0 auto", marginBottom: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(124,58,237,0.1)", color: "#a78bfa",
                }}>
                  <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
                    <path d="M20 11c0 4.97-4.03 8.5-9 8.5a10.3 10.3 0 0 1-3.57-.63L3 20.5l1.26-4.52A7.52 7.52 0 0 1 2 11C2 6.03 6.03 2.5 11 2.5S20 6.03 20 11z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </div>
                <p style={{ fontSize: 14, color: "var(--c3)", margin: 0 }}>Select a message to view the conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 24px", borderBottom: "1px solid var(--color-border-subtle)", flexShrink: 0 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, background: `${platColor}20`, color: platColor,
                }}>
                  {msg.author_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--c1)" }}>{msg.author_name}</div>
                  <div style={{ fontSize: 12, color: "var(--c3)" }}>
                    via {PLATFORM_LABELS[msg.platform] ?? msg.platform} · {timeAgo(msg.received_at)}
                  </div>
                </div>
                {msg.status === "replied" && (
                  <span style={{ marginLeft: "auto", fontSize: 12, padding: "4px 12px", borderRadius: 8, background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>✓ Replied</span>
                )}
              </div>

              {/* Thread body */}
              <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
                {/* Inbound message bubble */}
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{
                    maxWidth: "78%", padding: "12px 16px", borderRadius: 16,
                    fontSize: 14, lineHeight: 1.65,
                    background: "var(--color-surface-2)", color: "rgba(255,255,255,0.78)",
                    border: "1px solid var(--color-border-subtle)",
                  }}>
                    {msg.body}
                  </div>
                </div>

                {/* AI suggested reply */}
                {msg.ai_reply ? (
                  <div style={{ borderRadius: 12, padding: "16px 18px", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 6, fontWeight: 700, letterSpacing: "0.04em", background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>
                        AI SUGGESTED REPLY
                      </span>
                      <button
                        onClick={() => { setEditMode(true); setEditText(msg.ai_reply ?? ""); }}
                        style={{ fontSize: 12, color: "var(--c3)", background: "none", border: "none", cursor: "pointer", padding: "3px 8px", borderRadius: 6, transition: "color 0.15s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#a78bfa"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--c3)"; }}
                      >
                        Edit
                      </button>
                    </div>
                    {editMode ? (
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={6}
                        style={{
                          width: "100%", fontSize: 13, lineHeight: 1.65, outline: "none", resize: "none",
                          borderRadius: 8, padding: "10px 12px", boxSizing: "border-box",
                          background: "var(--color-surface-2)", color: "var(--c2)",
                          border: "1px solid var(--color-border-subtle)",
                        }}
                      />
                    ) : (
                      <p style={{ fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-line", color: "rgba(255,255,255,0.78)", margin: 0 }}>
                        {msg.ai_reply}
                      </p>
                    )}
                  </div>
                ) : msg.status !== "replied" ? (
                  <div style={{ borderRadius: 12, padding: "22px 20px", textAlign: "center", background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}>
                    <p style={{ fontSize: 13, color: "var(--c3)", margin: "0 0 14px" }}>No AI reply generated yet</p>
                    <button
                      onClick={handleGenerateReply}
                      disabled={isGenerating}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 20px",
                        borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: isGenerating ? "not-allowed" : "pointer",
                        background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { if (!isGenerating) (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.22)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.12)"; }}
                    >
                      {isGenerating ? (
                        <>
                          <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="4" stroke="rgba(167,139,250,0.3)" strokeWidth="2" />
                            <path d="M6 2a4 4 0 0 1 4 4" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          Generating…
                        </>
                      ) : "✦ Generate AI Reply"}
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Action bar */}
              {msg.status !== "replied" && msg.status !== "dismissed" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--color-border-subtle)", flexShrink: 0 }}>
                  <button
                    onClick={handleApproveAndSend}
                    disabled={!canSend}
                    style={{
                      flex: 1, padding: "11px 18px", borderRadius: 10, border: "none",
                      fontSize: 14, fontWeight: 600, transition: "all 0.2s",
                      cursor: canSend ? "pointer" : "not-allowed",
                      background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white",
                      boxShadow: canSend ? "0 4px 12px rgba(124,58,237,0.3)" : "none",
                      opacity: canSend ? 1 : 0.45,
                    }}
                  >
                    {isSending ? "Sending…" : "✓ Approve & Send"}
                  </button>

                  {!editMode && (
                    <button
                      onClick={() => { setEditMode(true); setEditText(msg.ai_reply ?? ""); }}
                      style={{
                        padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                        cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s",
                        background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                        color: "var(--c2)",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--o2)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                    >
                      Edit Reply
                    </button>
                  )}

                  <button
                    onClick={handleDismiss}
                    style={{
                      padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s",
                      background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                      color: "var(--c3)",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--o2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
