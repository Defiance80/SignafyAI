"use client";

import { useState } from "react";

const CONNECTED_ACCOUNTS = [
  { name: "Instagram", status: "connected", handle: "@signafyai", color: "#e040fb" },
  { name: "LinkedIn", status: "connected", handle: "Signafy AI", color: "#0a66c2" },
  { name: "TikTok", status: "connected", handle: "@signafyai", color: "#00f2ea" },
  { name: "Twitter/X", status: "disconnected", handle: "", color: "#8899a6" },
  { name: "Facebook", status: "disconnected", handle: "", color: "#1877f2" },
];

const NOTIFICATIONS = [
  { label: "New leads discovered", description: "Get notified when new leads match your criteria", key: "leads", on: true },
  { label: "Content ready for review", description: "AI-generated content awaiting approval", key: "content", on: true },
  { label: "Social inbox messages", description: "New inbound messages from connected platforms", key: "social", on: true },
  { label: "Campaign status changes", description: "When campaigns start, pause, or complete", key: "campaigns", on: false },
  { label: "Weekly performance digest", description: "Summary of key metrics every Monday", key: "digest", on: true },
  { label: "SEO ranking changes", description: "Keyword position changes above threshold", key: "seo", on: false },
];

export default function SettingsPage() {
  const [notifs, setNotifs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATIONS.map((n) => [n.key, n.on]))
  );

  const toggleNotif = (key: string) => setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="p-5 sm:p-8 max-w-[1000px] mx-auto space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Configure your workspace</p>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Settings</h1>
      </div>

      {/* Profile */}
      <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.07s" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Profile</h2>
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>D</div>
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Name</label>
                <input defaultValue="Demo User" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Email</label>
                <input defaultValue="demo@signafy.ai" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Company</label>
              <input defaultValue="Acme Agency" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Brand Voice */}
      <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.14s" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Brand Voice</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Tone</label>
            <div className="flex flex-wrap gap-2">
              {["Professional", "Warm", "Consultative", "Bold", "Casual"].map((t, i) => (
                <span key={t} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{
                  background: i < 3 ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                  border: i < 3 ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)",
                  color: i < 3 ? "#a78bfa" : "var(--color-text-muted)",
                }}>{t}</span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Brand description</label>
            <textarea defaultValue="We help marketing agencies and DTC brands scale with AI-powered lead generation, content creation, and social management." rows={3} className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }} />
          </div>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.21s" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Connected Accounts</h2>
        <div className="space-y-3">
          {CONNECTED_ACCOUNTS.map((acc) => (
            <div key={acc.name} className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${acc.color}18`, color: acc.color }}>
                  <span className="text-xs font-bold">{acc.name[0]}</span>
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--color-text-1)" }}>{acc.name}</div>
                  {acc.handle && <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>{acc.handle}</div>}
                </div>
              </div>
              <button className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{
                background: acc.status === "connected" ? "rgba(52,211,153,0.1)" : "rgba(124,58,237,0.15)",
                border: acc.status === "connected" ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(124,58,237,0.3)",
                color: acc.status === "connected" ? "#34d399" : "#a78bfa",
              }}>
                {acc.status === "connected" ? "Connected" : "Connect"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.28s" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Notifications</h2>
        <div className="space-y-3">
          {NOTIFICATIONS.map((n) => (
            <div key={n.key} className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}>
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--color-text-1)" }}>{n.label}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{n.description}</div>
              </div>
              <button
                onClick={() => toggleNotif(n.key)}
                className="w-10 h-6 rounded-full relative transition-all flex-shrink-0"
                style={{ background: notifs[n.key] ? "#7c3aed" : "var(--color-border)" }}
              >
                <div className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all" style={{ left: notifs[n.key] ? 20 : 4 }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Billing */}
      <div className="rounded-2xl p-6 animate-fade-up relative overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.35s" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(109,40,217,0.06) 0%, transparent 70%)" }} />
        <div className="relative">
          <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Plan & Billing</h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold" style={{ color: "var(--color-text-1)" }}>Growth Plan</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>Active</span>
              </div>
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>$99/month · Renews Jun 1, 2025 · 3 team members</div>
            </div>
            <button className="px-4 py-2 rounded-xl text-sm font-medium transition-all" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
              Manage Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
