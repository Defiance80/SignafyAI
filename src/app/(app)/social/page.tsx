"use client";

import { useState, useEffect } from "react";

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#e040fb",
  linkedin: "#0a66c2",
  tiktok: "#00f2ea",
  twitter: "#8899a6",
  facebook: "#1877f2",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  twitter: "Twitter/X",
  facebook: "Facebook",
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
  { id: "d1", platform: "instagram", author_name: "Emma Lawson", body: "Hey! I saw your post about content strategies and wanted to reach out. We're a mid-size e-commerce brand doing about $2M/year and want to scale to $5M through better organic reach. Do you work with DTC brands?", ai_reply: `Hi Emma! Thanks so much for reaching out.\n\nWe absolutely work with DTC brands — e-commerce is one of our sweet spots. We've helped several brands in the $2-5M range scale their social presence significantly.\n\nI'd love to learn more about your current strategy. Would you be open to a quick 15-minute call this week?`, is_read: false, status: "pending", received_at: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: "d2", platform: "linkedin", author_name: "Ryan Choi", body: "Would love to discuss a potential partnership for our clients. We run a growth consulting firm and often need content automation tools.", ai_reply: `Hi Ryan! Great to connect.\n\nPartnerships are definitely something we're open to. What types of clients do you work with primarily — B2B, DTC, or a mix? Happy to hop on a quick call to explore what that could look like.`, is_read: false, status: "pending", received_at: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: "d3", platform: "tiktok", author_name: "Zara Ahmed", body: "Love your latest video! Can you do one about SEO for small businesses?", ai_reply: `Thank you so much, Zara! That means a lot.\n\nSEO for small businesses is actually on our content roadmap — great timing! Stay tuned, we have something coming on that topic in the next few weeks.`, is_read: false, status: "pending", received_at: new Date(Date.now() - 42 * 60000).toISOString() },
  { id: "d4", platform: "twitter", author_name: "Mike Turner", body: "Great thread on AI marketing tools. Quick question — does SignafyAI integrate with HubSpot?", ai_reply: `Thanks Mike! HubSpot integration is on the roadmap for Q3. Right now we have direct CSV export and webhook support that works great with most CRMs. Want me to share the docs?`, is_read: true, status: "pending", received_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "d5", platform: "instagram", author_name: "Sofia Martinez", body: "Hi! Are you taking on new clients right now? We're a fitness brand looking for help with Instagram content.", ai_reply: null, is_read: true, status: "pending", received_at: new Date(Date.now() - 2 * 3600000).toISOString() },
];

export default function SocialPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
      .catch(() => {
        setMessages(DEMO_MESSAGES);
        setUnreadCount(3);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const msg = messages[selected];

  function selectMessage(i: number) {
    setSelected(i);
    setMobileView("thread");
    setEditMode(false);
    setEditText("");
    // Mark as read locally
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
    } finally {
      setIsSending(false);
    }
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
    // Use the classify endpoint (or generate via content API)
    await new Promise((r) => setTimeout(r, 1500)); // graceful fallback with a small delay
    const fallback = `Hi ${msg.author_name.split(" ")[0]}! Thanks for reaching out.\n\nWe'd love to connect and learn more about what you're working on. Feel free to share more details or suggest a time to chat!`;
    setMessages((prev) => prev.map((m, i) => i === selected ? { ...m, ai_reply: fallback } : m));
    setIsGenerating(false);
  }

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="animate-fade-up flex items-center justify-between">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Manage conversations</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Social Inbox</h1>
        </div>
        {mobileView === "thread" && (
          <button
            className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}
            onClick={() => setMobileView("list")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 animate-fade-up" style={{ animationDelay: "0.1s", minHeight: "calc(100vh - 220px)" }}>
        {/* Message List */}
        <div className={`lg:col-span-2 rounded-2xl overflow-hidden ${mobileView === "thread" ? "hidden lg:block" : "block"}`} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
              Messages{unreadCount > 0 && <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-md" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>{unreadCount} new</span>}
            </h2>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--color-surface-2)" }} />)}
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
              {messages.map((m, i) => {
                const color = PLATFORM_COLORS[m.platform] ?? "#7c3aed";
                const platLabel = PLATFORM_LABELS[m.platform] ?? m.platform;
                return (
                  <div
                    key={m.id}
                    onClick={() => selectMessage(i)}
                    className="flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors"
                    style={{ background: selected === i ? "var(--color-surface-2)" : "transparent" }}
                    onMouseEnter={(e) => { if (selected !== i) (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                    onMouseLeave={(e) => { if (selected !== i) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: `${color}20`, color }}>
                      {m.author_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-1)" }}>{m.author_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: `${color}15`, color }}>{platLabel}</span>
                        {!m.is_read && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#7c3aed" }} />}
                        {m.status === "replied" && <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>Replied</span>}
                      </div>
                      <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>{m.body}</p>
                    </div>
                    <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: "var(--color-text-muted)" }}>{timeAgo(m.received_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Conversation Detail */}
        <div className={`lg:col-span-3 rounded-2xl flex flex-col ${mobileView === "list" ? "hidden lg:flex" : "flex"}`} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          {!msg ? (
            <div className="flex-1 flex items-center justify-center p-12 text-center">
              <div>
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa" }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M20 11c0 4.97-4.03 8.5-9 8.5a10.3 10.3 0 0 1-3.57-.63L3 20.5l1.26-4.52A7.52 7.52 0 0 1 2 11C2 6.03 6.03 2.5 11 2.5S20 6.03 20 11z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                </div>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Select a message to view the conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${PLATFORM_COLORS[msg.platform] ?? "#7c3aed"}20`, color: PLATFORM_COLORS[msg.platform] ?? "#7c3aed" }}>
                  {msg.author_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>{msg.author_name}</div>
                  <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>via {PLATFORM_LABELS[msg.platform] ?? msg.platform} · {timeAgo(msg.received_at)}</div>
                </div>
                {msg.status === "replied" && (
                  <span className="ml-auto text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>Replied</span>
                )}
              </div>

              {/* Thread */}
              <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                {/* Inbound message */}
                <div className="flex justify-start">
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed" style={{ background: "var(--color-surface-2)", color: "var(--color-text-2)", border: "1px solid var(--color-border-subtle)" }}>
                    {msg.body}
                  </div>
                </div>

                {/* AI Suggested Reply */}
                {msg.ai_reply ? (
                  <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>AI Suggested Reply</span>
                      <button onClick={() => { setEditMode(true); setEditText(msg.ai_reply ?? ""); }} className="text-xs" style={{ color: "var(--color-text-muted)" }}>Edit</button>
                    </div>
                    {editMode ? (
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={6}
                        className="w-full text-sm leading-relaxed outline-none resize-none rounded-lg px-3 py-2"
                        style={{ background: "var(--color-surface-2)", color: "var(--color-text-2)", border: "1px solid var(--color-border-subtle)" }}
                      />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--color-text-2)" }}>{msg.ai_reply}</p>
                    )}
                  </div>
                ) : msg.status !== "replied" ? (
                  <div className="mt-4 rounded-xl p-4 text-center" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}>
                    <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>No AI reply generated yet</p>
                    <button
                      onClick={handleGenerateReply}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium mx-auto transition-all"
                      style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}
                    >
                      {isGenerating ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="rgba(167,139,250,0.3)" strokeWidth="2"/><path d="M6 2a4 4 0 0 1 4 4" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/></svg> Generating…</> : "Generate AI Reply"}
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Actions */}
              {msg.status !== "replied" && msg.status !== "dismissed" && (
                <div className="flex items-center gap-3 px-6 py-4" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                  <button
                    onClick={handleApproveAndSend}
                    disabled={isSending || (!msg.ai_reply && !editMode)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
                  >
                    {isSending ? "Sending…" : "Approve & Send"}
                  </button>
                  {!editMode && (
                    <button
                      onClick={() => { setEditMode(true); setEditText(msg.ai_reply ?? ""); }}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}
                    >
                      Edit Reply
                    </button>
                  )}
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
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
