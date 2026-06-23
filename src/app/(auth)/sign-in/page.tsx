"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import Link from "next/link";

const DEMO_EMAIL    = "demo@signafyai.com";
const DEMO_PASSWORD = "Demo1234!";

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
          boxShadow: "0 0 20px rgba(124,58,237,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 9L7.5 4.5L9 6L6 9L9 12L7.5 13.5L3 9Z" fill="white" fillOpacity="0.9"/>
          <path d="M9 6L13.5 9L9 12L11 9L9 6Z" fill="white"/>
        </svg>
      </div>
      <span style={{
        fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em",
        color: "rgba(255,255,255,0.92)",
      }}>
        SignafyAI
      </span>
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({
  id, label, type = "text", placeholder, autoComplete, required,
  right,
}: {
  id: string; label: string; type?: string; placeholder?: string;
  autoComplete?: string; required?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>
          {label}
        </label>
        {right}
      </div>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        style={{
          width: "100%", padding: "10px 14px",
          borderRadius: 10, fontSize: 14,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.9)",
          outline: "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onFocus={e => {
          e.target.style.border = "1px solid rgba(124,58,237,0.6)";
          e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)";
        }}
        onBlur={e => {
          e.target.style.border = "1px solid rgba(255,255,255,0.1)";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  function fillDemo() {
    const emailEl    = document.getElementById("email")    as HTMLInputElement;
    const passwordEl = document.getElementById("password") as HTMLInputElement;
    if (emailEl)    emailEl.value    = DEMO_EMAIL;
    if (passwordEl) passwordEl.value = DEMO_PASSWORD;
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        margin: "0 auto",
      }}
    >
      {/* Card */}
      <div
        style={{
          background: "rgba(17,17,24,0.9)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 18,
          padding: "36px 32px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 28 }}>
          <Logo />
        </div>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 26, fontWeight: 700, letterSpacing: "-0.04em",
            color: "rgba(255,255,255,0.95)", margin: 0, marginBottom: 6,
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            Sign in to your SignafyAI dashboard
          </p>
        </div>

        {/* Demo banner */}
        <button
          type="button"
          onClick={fillDemo}
          style={{
            width: "100%", textAlign: "left", cursor: "pointer",
            background: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.22)",
            borderRadius: 12, padding: "12px 14px", marginBottom: 24,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(124,58,237,0.16)";
            e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(124,58,237,0.1)";
            e.currentTarget.style.borderColor = "rgba(124,58,237,0.22)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "rgba(124,58,237,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="#a78bfa" strokeWidth="1.4"/>
                <path d="M6.5 4V6.5" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round"/>
                <circle cx="6.5" cy="9" r="0.7" fill="#a78bfa"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#a78bfa", marginBottom: 4 }}>
                Demo Account — click to auto-fill
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  Email: <code style={{ color: "rgba(255,255,255,0.7)", letterSpacing: 0 }}>{DEMO_EMAIL}</code>
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  Pass: <code style={{ color: "rgba(255,255,255,0.7)" }}>{DEMO_PASSWORD}</code>
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Form */}
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {state?.error && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, fontSize: 13,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171",
            }}>
              {state.error}
            </div>
          )}

          <Input
            id="email"
            label="Email address"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />

          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            right={
              <button
                type="button"
                style={{ fontSize: 12, color: "#a78bfa", background: "none", border: "none", cursor: "pointer" }}
              >
                Forgot password?
              </button>
            }
          />

          <button
            type="submit"
            disabled={isPending}
            style={{
              width: "100%", padding: "11px", borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              color: "white", border: "none",
              boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
              opacity: isPending ? 0.7 : 1,
              transition: "all 0.15s",
              marginTop: 4,
            }}
            onMouseEnter={e => {
              if (!isPending) {
                e.currentTarget.style.boxShadow = "0 6px 22px rgba(124,58,237,0.5)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,58,237,0.35)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, margin: "22px 0",
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }}/>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }}/>
        </div>

        {/* Social auth */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            {
              name: "Google",
              icon: (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M14 7.67c0-.5-.04-1-.13-1.47H7.5v2.78h3.63a3.1 3.1 0 0 1-1.35 2.04v1.7h2.19C13.28 11.45 14 9.72 14 7.67z" fill="#4285F4"/>
                  <path d="M7.5 15c1.82 0 3.35-.6 4.47-1.64l-2.19-1.7a4.5 4.5 0 0 1-2.28.63 4.5 4.5 0 0 1-4.24-3.1H.99v1.75A7.5 7.5 0 0 0 7.5 15z" fill="#34A853"/>
                  <path d="M3.26 9.19A4.5 4.5 0 0 1 3.03 7.5c0-.59.1-1.16.23-1.69V4.06H.99A7.5 7.5 0 0 0 0 7.5c0 1.21.29 2.36 1 3.44l2.26-1.75z" fill="#FBBC05"/>
                  <path d="M7.5 3c1.02 0 1.94.35 2.66 1.04l2-2A7.24 7.24 0 0 0 7.5 0 7.5 7.5 0 0 0 .99 4.06l2.27 1.75A4.5 4.5 0 0 1 7.5 3z" fill="#EA4335"/>
                </svg>
              ),
            },
            {
              name: "Microsoft",
              icon: (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="0" y="0" width="6.5" height="6.5" fill="#f25022"/>
                  <rect x="7.5" y="0" width="6.5" height="6.5" fill="#7fba00"/>
                  <rect x="0" y="7.5" width="6.5" height="6.5" fill="#00a4ef"/>
                  <rect x="7.5" y="7.5" width="6.5" height="6.5" fill="#ffb900"/>
                </svg>
              ),
            },
          ].map(provider => (
            <button
              key={provider.name}
              type="button"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "rgba(255,255,255,0.9)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.color = "rgba(255,255,255,0.6)";
              }}
            >
              {provider.icon}
              {provider.name}
            </button>
          ))}
        </div>

        {/* Sign up */}
        <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 22 }}>
          Don&apos;t have an account?{" "}
          <Link
            href={"#waitlist" as never}
            style={{ color: "#a78bfa", fontWeight: 500, textDecoration: "none" }}
          >
            Join the beta waitlist
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 20 }}>
        By signing in you agree to our{" "}
        <span style={{ color: "rgba(255,255,255,0.35)", cursor: "pointer" }}>Terms</span>
        {" "}and{" "}
        <span style={{ color: "rgba(255,255,255,0.35)", cursor: "pointer" }}>Privacy Policy</span>
      </p>
    </div>
  );
}
