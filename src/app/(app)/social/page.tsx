"use client";

import { useState } from "react";

const MESSAGES = [
  { id: 1, name: "Emma Lawson", platform: "Instagram", preview: "Hey! I saw your post about content strategies and...", time: "2m ago", unread: true, avatar: "EL" },
  { id: 2, name: "Ryan Choi", platform: "LinkedIn", preview: "Would love to discuss a potential partnership for...", time: "15m ago", unread: true, avatar: "RC" },
  { id: 3, name: "Zara Ahmed", platform: "TikTok", preview: "Love your latest video! Can you do one about SEO?", time: "42m ago", unread: true, avatar: "ZA" },
  { id: 4, name: "Mike Turner", platform: "Twitter/X", preview: "Great thread on AI marketing tools. Quick question...", time: "1h ago", unread: false, avatar: "MT" },
  { id: 5, name: "Sofia Martinez", platform: "Instagram", preview: "Hi! Are you taking on new clients right now?", time: "2h ago", unread: false, avatar: "SM" },
  { id: 6, name: "James Park", platform: "LinkedIn", preview: "Thanks for connecting! I run a SaaS company and...", time: "3h ago", unread: false, avatar: "JP" },
  { id: 7, name: "Olivia Brown", platform: "TikTok", preview: "Your content strategy tips are amazing! Do you offer...", time: "5h ago", unread: false, avatar: "OB" },
  { id: 8, name: "Liam Wilson", platform: "Twitter/X", preview: "Retweeted your post. Would you be open to a collab?", time: "6h ago", unread: false, avatar: "LW" },
];

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "#e040fb",
  LinkedIn: "#0a66c2",
  TikTok: "#00f2ea",
  "Twitter/X": "#8899a6",
};

const THREAD = [
  { from: "them", text: "Hey! I saw your post about content strategies and wanted to reach out. We're a mid-size e-commerce brand looking to revamp our social presence. Do you work with DTC brands?", time: "2m ago" },
  { from: "them", text: "We're currently doing about $2M/year and want to scale to $5M through better organic reach and paid social.", time: "2m ago" },
];

const AI_REPLY = `Hi Emma! Thanks so much for reaching out 🙌

We absolutely work with DTC brands — in fact, e-commerce is one of our sweet spots. We've helped several brands in the $2-5M range scale their social presence significantly.

I'd love to learn more about your current strategy and where you see the biggest opportunities. Would you be open to a quick 15-minute call this week?

I can share some case studies that might be relevant to your goals!`;

export default function SocialPage() {
  const [selected, setSelected] = useState(0);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const msg = MESSAGES[selected];

  function selectMessage(i: number) {
    setSelected(i);
    setMobileView("thread");
  }

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="animate-fade-up flex items-center justify-between">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Manage conversations</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Social Inbox</h1>
        </div>
        {/* Mobile back button — only shown in thread view */}
        {mobileView === "thread" && (
          <button
            className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}
            onClick={() => setMobileView("list")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 animate-fade-up" style={{ animationDelay: "0.1s", minHeight: "calc(100vh - 220px)" }}>
        {/* Message List */}
        <div
          className={`lg:col-span-2 rounded-2xl overflow-hidden ${mobileView === "thread" ? "hidden lg:block" : "block"}`}
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
              Messages <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-md" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>3 new</span>
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
            {MESSAGES.map((m, i) => (
              <div
                key={m.id}
                onClick={() => selectMessage(i)}
                className="flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors"
                style={{ background: selected === i ? "var(--color-surface-2)" : "transparent" }}
                onMouseEnter={(e) => { if (selected !== i) (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                onMouseLeave={(e) => { if (selected !== i) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: `${PLATFORM_COLORS[m.platform]}20`, color: PLATFORM_COLORS[m.platform] }}>
                  {m.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-1)" }}>{m.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: `${PLATFORM_COLORS[m.platform]}15`, color: PLATFORM_COLORS[m.platform] }}>{m.platform}</span>
                    {m.unread && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#7c3aed" }} />}
                  </div>
                  <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>{m.preview}</p>
                </div>
                <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: "var(--color-text-muted)" }}>{m.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation Detail */}
        <div
          className={`lg:col-span-3 rounded-2xl flex flex-col ${mobileView === "list" ? "hidden lg:flex" : "flex"}`}
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${PLATFORM_COLORS[msg.platform]}20`, color: PLATFORM_COLORS[msg.platform] }}>
              {msg.avatar}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>{msg.name}</div>
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>via {msg.platform} · {msg.time}</div>
            </div>
          </div>

          {/* Thread */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {THREAD.map((t, i) => (
              <div key={i} className={`flex ${t.from === "them" ? "justify-start" : "justify-end"}`}>
                <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed" style={{
                  background: t.from === "them" ? "var(--color-surface-2)" : "rgba(124,58,237,0.15)",
                  color: "var(--color-text-2)",
                  border: `1px solid ${t.from === "them" ? "var(--color-border-subtle)" : "rgba(124,58,237,0.2)"}`,
                }}>
                  {t.text}
                </div>
              </div>
            ))}

            {/* AI Suggested Reply */}
            <div className="mt-6 rounded-xl p-4" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>AI Suggested Reply</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--color-text-2)" }}>{AI_REPLY}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 px-6 py-4" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
            <button className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>
              Approve & Send
            </button>
            <button className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
              Edit Reply
            </button>
            <button className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
