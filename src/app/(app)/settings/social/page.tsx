"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface SocialAccount {
  id: string;
  platform: string;
  account_name: string;
  avatar_url?: string;
  is_active: boolean;
  token_expires?: string;
}

const PLATFORMS = [
  {
    id:       "linkedin",
    label:    "LinkedIn",
    color:    "#0a66c2",
    bg:       "rgba(10,102,194,0.12)",
    b2cScan:  true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="6" fill="#0a66c2"/>
        <path d="M8 11h3v9H8v-9zm1.5-4.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM13 11h2.9v1.2h.04C16.4 11.5 17.4 11 18.6 11c3 0 3.4 2 3.4 4.5V20h-3v-4c0-1 0-2.2-1.4-2.2S16 14.9 16 15.9V20h-3V11z" fill="#fff"/>
      </svg>
    ),
    scopes: "Post, schedule, read analytics",
    devConsole: "https://www.linkedin.com/developers/apps",
  },
  {
    id:       "instagram",
    label:    "Instagram",
    color:    "#e1306c",
    bg:       "rgba(225,48,108,0.1)",
    b2cScan:  true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="6" fill="url(#ig)"/>
        <defs><linearGradient id="ig" x1="0" y1="28" x2="28" y2="0"><stop stopColor="#f09433"/><stop offset=".25" stopColor="#e6683c"/><stop offset=".5" stopColor="#dc2743"/><stop offset=".75" stopColor="#cc2366"/><stop offset="1" stopColor="#bc1888"/></linearGradient></defs>
        <rect x="7" y="7" width="14" height="14" rx="4" stroke="#fff" strokeWidth="1.5"/>
        <circle cx="14" cy="14" r="3.5" stroke="#fff" strokeWidth="1.5"/>
        <circle cx="18.5" cy="9.5" r="1" fill="#fff"/>
      </svg>
    ),
    scopes: "Post photos/reels, read insights, B2C scanning",
    devConsole: "https://developers.facebook.com/apps",
  },
  {
    id:       "facebook",
    label:    "Facebook",
    color:    "#1877f2",
    bg:       "rgba(24,119,242,0.1)",
    b2cScan:  true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="6" fill="#1877f2"/>
        <path d="M18 8h-2.5A1.5 1.5 0 0 0 14 9.5V12h4l-.5 3h-3.5v7h-3v-7H9v-3h2.5V9.5A4.5 4.5 0 0 1 16 5h2v3z" fill="#fff"/>
      </svg>
    ),
    scopes: "Post to pages, read page analytics, B2C scanning",
    devConsole: "https://developers.facebook.com/apps",
  },
  {
    id:       "x",
    label:    "X (Twitter)",
    color:    "#e7e9ea",
    bg:       "rgba(231,233,234,0.08)",
    b2cScan:  true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="6" fill="#000"/>
        <path d="M7 7l5.5 6.5L7 21h2l4.3-5 3.7 5H21l-5.8-7.8L21 7h-2l-3.9 4.6L11.4 7H7z" fill="#fff"/>
      </svg>
    ),
    scopes: "Post tweets, read timeline, DM conversations",
    devConsole: "https://developer.twitter.com/en/portal/dashboard",
  },
  {
    id:       "tiktok",
    label:    "TikTok",
    color:    "#00f2ea",
    bg:       "rgba(0,242,234,0.08)",
    b2cScan:  true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="6" fill="#010101"/>
        <path d="M19 10.5c-1 0-2.5-1-3-2.5h-2.5v12A2.5 2.5 0 0 1 11 22.5a2.5 2.5 0 0 1-2.5-2.5A2.5 2.5 0 0 1 11 17.5c.3 0 .6 0 .9.1V15a5 5 0 0 0-5.4 7.3A5 5 0 0 0 16 20V14.3c.8.5 1.9.7 3 .7v-4.5z" fill="#fff"/>
      </svg>
    ),
    scopes: "Post videos, read account info, view comments",
    devConsole: "https://developers.tiktok.com/",
  },
  {
    id:       "reddit",
    label:    "Reddit",
    color:    "#ff4500",
    bg:       "rgba(255,69,0,0.1)",
    b2cScan:  true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="6" fill="#ff4500"/>
        <circle cx="14" cy="15" r="6" stroke="#fff" strokeWidth="1.4"/>
        <circle cx="10.5" cy="14" r="1.2" fill="#fff"/>
        <circle cx="17.5" cy="14" r="1.2" fill="#fff"/>
        <path d="M11 17.5c.8.8 2 1.2 3 1.2s2.2-.4 3-1.2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M17.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="#fff"/>
        <path d="M14 10V8.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="20" cy="9" r="2" fill="#fff"/>
        <circle cx="20" cy="9" r="1" fill="#ff4500"/>
      </svg>
    ),
    scopes: "Read posts, send DMs, B2C conversation scanning",
    devConsole: "https://www.reddit.com/prefs/apps",
  },
  {
    id:       "youtube",
    label:    "YouTube",
    color:    "#ff0000",
    bg:       "rgba(255,0,0,0.08)",
    b2cScan:  true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="6" fill="#ff0000"/>
        <rect x="5" y="8" width="18" height="12" rx="3" fill="#fff"/>
        <path d="M12 11l6 3-6 3V11z" fill="#ff0000"/>
      </svg>
    ),
    scopes: "Read comments, view channel analytics, B2C scanning",
    devConsole: "https://console.cloud.google.com/apis",
  },
];

// Inner component — uses useSearchParams, must be inside <Suspense>
function SocialSettingsContent() {
  const searchParams = useSearchParams();
  const connected    = searchParams.get("connected");
  const errorParam   = searchParams.get("error");

  const [accounts, setAccounts]     = useState<SocialAccount[]>([]);
  const [loading, setLoading]       = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    if (connected) showToast(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!`, "success");
    if (errorParam) showToast(`Connection failed: ${errorParam.replace(/_/g, " ")}`, "error");
  }, [connected, errorParam, showToast]);

  useEffect(() => {
    fetch("/api/social/accounts")
      .then(r => r.json())
      .then(d => setAccounts(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const disconnect = useCallback(async (id: string, platform: string) => {
    setDisconnecting(id);
    const res = await fetch(`/api/social/accounts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAccounts(prev => prev.filter(a => a.id !== id));
      showToast(`${platform} disconnected`);
    } else {
      showToast("Failed to disconnect", "error");
    }
    setDisconnecting(null);
  }, [showToast]);

  const getConnectedAccount = (platformId: string) =>
    accounts.find(a => a.platform === platformId && a.is_active);

  const isExpired = (expires?: string) =>
    expires ? new Date(expires) < new Date() : false;

  return (
    <div style={{ maxWidth: 740, margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 1000,
          padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
          background: toast.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${toast.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: toast.type === "success" ? "#10b981" : "#ef4444",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0 }}>
          Social Accounts
        </h1>
        <p style={{ color: "var(--c3)", marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
          Connect your social media accounts. SignafyAI uses these to post content,
          reply to comments, and monitor engagement — all from inside the app.
          When logged in, you can reply directly to leads found in B2C conversation scanning.
        </p>
      </div>

      {/* Info banner */}
      <div style={{
        background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
        borderRadius: 10, padding: "14px 18px", marginBottom: 16,
        display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>🔐</span>
        <div style={{ fontSize: 13, color: "var(--c2)", lineHeight: 1.6 }}>
          <strong style={{ color: "#a78bfa" }}>OAuth 2.0 secured.</strong>{" "}
          We never store your password. Each platform grants SignafyAI specific permissions
          you approve during login. You can disconnect at any time.
        </div>
      </div>

      {/* B2C scanning info */}
      <div style={{
        background: "rgba(255,69,0,0.06)", border: "1px solid rgba(255,69,0,0.2)",
        borderRadius: 10, padding: "14px 18px", marginBottom: 28,
        display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>💬</span>
        <div style={{ fontSize: 13, color: "var(--c2)", lineHeight: 1.6 }}>
          <strong style={{ color: "#ff4500" }}>B2C Conversation Scanning.</strong>{" "}
          Reddit and YouTube are the most productive platforms for finding real consumers
          asking questions and seeking recommendations. Connecting them enables the &ldquo;Reply as
          @handle&rdquo; button when viewing leads found in conversation scanning.
        </div>
      </div>

      {/* Platform cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--c3)" }}>
          Loading accounts…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {PLATFORMS.map(platform => {
            const account = getConnectedAccount(platform.id);
            const expired = isExpired(account?.token_expires);

            return (
              <div key={platform.id} style={{
                background: account ? platform.bg : "var(--o1)",
                border: `1px solid ${account ? `${platform.color}40` : "var(--o2)"}`,
                borderRadius: 12, padding: "18px 20px",
                display: "flex", alignItems: "center", gap: 16,
                transition: "all 0.2s",
              }}>
                {/* Platform icon */}
                <div style={{ flexShrink: 0 }}>{platform.icon}</div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{platform.label}</span>
                    {account && !expired && (
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                        background: "rgba(16,185,129,0.15)", color: "#10b981",
                      }}>● Connected</span>
                    )}
                    {account && expired && (
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                        background: "rgba(245,158,11,0.15)", color: "#f59e0b",
                      }}>⚠ Token expired — reconnect</span>
                    )}
                    {!account && (
                      <span style={{ fontSize: 11, color: "var(--c4)" }}>Not connected</span>
                    )}
                    {platform.b2cScan && (
                      <span style={{
                        fontSize: 10, padding: "1px 7px", borderRadius: 8, fontWeight: 600,
                        background: "rgba(255,69,0,0.12)", color: "#ff6b35",
                        border: "1px solid rgba(255,69,0,0.2)",
                      }}>💬 B2C Scan</span>
                    )}
                  </div>

                  {account ? (
                    <div style={{ fontSize: 13, color: "var(--c2)" }}>
                      {account.account_name}
                      {account.token_expires && !expired && (
                        <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.5 }}>
                          · expires {new Date(account.token_expires).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--c3)" }}>
                      Permissions: {platform.scopes}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {(!account || expired) && (
                    <a href={`/api/social/connect/${platform.id}`} style={{
                      padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: `${platform.color}22`,
                      border: `1px solid ${platform.color}55`,
                      color: platform.color, cursor: "pointer",
                      textDecoration: "none", display: "inline-block",
                      transition: "all 0.15s",
                    }}>
                      {expired ? "Reconnect" : "Connect"}
                    </a>
                  )}
                  {account && !expired && (
                    <button
                      onClick={() => disconnect(account.id, platform.label)}
                      disabled={disconnecting === account.id}
                      style={{
                        padding: "8px 16px", borderRadius: 8, fontSize: 13,
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "var(--c3)", cursor: "pointer",
                      }}
                    >
                      {disconnecting === account.id ? "…" : "Disconnect"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Setup note */}
      <div style={{
        marginTop: 32, background: "var(--o1)",
        border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "16px 20px",
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c2)", marginBottom: 10 }}>
          ⚙ Developer App Setup Required
        </div>
        <div style={{ fontSize: 12, color: "var(--c3)", lineHeight: 1.8 }}>
          Each platform requires a developer app with OAuth credentials configured in your environment variables.
          Your redirect URI for each platform should be:
          <br />
          <code style={{ color: "#a78bfa", fontSize: 11 }}>
            https://signafy-ai.vercel.app/api/social/callback/[platform]
          </code>
          <br /><br />
          {PLATFORMS.map(p => (
            <span key={p.id}>
              <a href={p.devConsole} target="_blank" rel="noopener noreferrer"
                style={{ color: p.color, marginRight: 16, textDecoration: "none" }}>
                {p.label} Console ↗
              </a>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Page export — wraps content in Suspense so useSearchParams() is allowed
// (Next.js requirement for static prerendering with search params)
export default function SocialSettingsPage() {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: 740, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ color: "var(--c3)", textAlign: "center", paddingTop: 60 }}>
          Loading…
        </div>
      </div>
    }>
      <SocialSettingsContent />
    </Suspense>
  );
}
