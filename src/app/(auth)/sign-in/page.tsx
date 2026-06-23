"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import Link from "next/link";

const DEMO_EMAIL    = "demo@signafyai.com";
const DEMO_PASSWORD = "Demo1234!";

// ─── Signal pulse animation CSS ───────────────────────────────────────────────
// The "signal" is SignafyAI's visual identity — a live, moving dot on a line,
// directly representing the "signafy" (signal + amplify) concept.
const ANIMATION_CSS = `
@keyframes dotA {
  0%   { left: -4px; opacity: 0; }
  5%   { opacity: 1; }
  95%  { opacity: 1; }
  100% { left: calc(100% + 4px); opacity: 0; }
}
@keyframes dotB {
  0%   { left: -4px; opacity: 0; }
  5%   { opacity: 0.6; }
  95%  { opacity: 0.6; }
  100% { left: calc(100% + 4px); opacity: 0; }
}
@keyframes dotC {
  0%   { left: -4px; opacity: 0; }
  8%   { opacity: 0.35; }
  92%  { opacity: 0.35; }
  100% { left: calc(100% + 4px); opacity: 0; }
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.8); }
}
@keyframes fadeSlide {
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
}
`;

// ─── Stat chip ────────────────────────────────────────────────────────────────
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 2,
      padding: "12px 18px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
    }}>
      <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.04em", color: "rgba(255,255,255,0.92)" }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.02em" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Form field ───────────────────────────────────────────────────────────────
function Field({
  id, label, type = "text", placeholder, autoComplete, required, right,
}: {
  id: string; label: string; type?: string; placeholder?: string;
  autoComplete?: string; required?: boolean; right?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label htmlFor={id} style={{
          fontSize: 12, fontWeight: 500, letterSpacing: "0.01em",
          color: "rgba(255,255,255,0.45)", textTransform: "uppercase",
        }}>
          {label}
        </label>
        {right}
      </div>
      <input
        id={id} name={id} type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        style={{
          width: "100%", padding: "11px 14px",
          borderRadius: 10, fontSize: 14,
          background: "rgba(255,255,255,0.045)",
          border: "1px solid rgba(255,255,255,0.09)",
          color: "rgba(255,255,255,0.88)",
          outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
          letterSpacing: "-0.01em",
        }}
        onFocus={e => {
          e.target.style.border = "1px solid rgba(124,58,237,0.55)";
          e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)";
        }}
        onBlur={e => {
          e.target.style.border = "1px solid rgba(255,255,255,0.09)";
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
    const e = document.getElementById("email")    as HTMLInputElement;
    const p = document.getElementById("password") as HTMLInputElement;
    if (e) e.value = DEMO_EMAIL;
    if (p) p.value = DEMO_PASSWORD;
  }

  return (
    <>
      <style>{ANIMATION_CSS}</style>

      {/* Full-viewport split layout */}
      <div style={{
        display: "flex", minHeight: "100vh",
        flexDirection: "row",
      }}>

        {/* ── LEFT PANEL — Brand + signal ─────────────────────────── */}
        <div style={{
          flex: "0 0 55%",
          background: "#0b0a14",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          display: "flex", flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 52px",
          position: "relative", overflow: "hidden",

          // Hide on mobile
          // @ts-expect-error – media queries can't be inline, handled by style tag below
        }}>
          {/* Ambient glow */}
          <div style={{
            position: "absolute", top: "-80px", left: "-60px",
            width: 500, height: 500, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(109,40,217,0.14) 0%, transparent 65%)",
            filter: "blur(60px)", pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: "-40px", right: "-40px",
            width: 360, height: 360, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 65%)",
            filter: "blur(50px)", pointerEvents: "none",
          }} />

          {/* Logo */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                boxShadow: "0 0 18px rgba(124,58,237,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9L7.5 4.5L9 6L6 9L9 12L7.5 13.5L3 9Z" fill="white" fillOpacity="0.9"/>
                  <path d="M9 6L13.5 9L9 12L11 9L9 6Z" fill="white"/>
                </svg>
              </div>
              <span style={{
                fontSize: 17, fontWeight: 700, letterSpacing: "-0.03em",
                color: "rgba(255,255,255,0.9)",
              }}>
                SignafyAI
              </span>
            </div>
          </div>

          {/* Centre content */}
          <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 48, paddingBottom: 48 }}>
            {/* Brand headline — ultra thin weight contrast */}
            <div style={{ marginBottom: 40 }}>
              <p style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "rgba(167,139,250,0.7)",
                marginBottom: 16,
              }}>
                AI Growth Intelligence
              </p>
              <h1 style={{
                fontSize: "clamp(36px, 3.5vw, 50px)",
                fontWeight: 100,
                letterSpacing: "-0.04em",
                lineHeight: 1.12,
                color: "rgba(255,255,255,0.88)",
                margin: 0,
              }}>
                Your brand's
                <br />
                <span style={{ fontWeight: 700 }}>signal.</span>
                <br />
                Amplified.
              </h1>
            </div>

            {/* ── Signal visualization ── */}
            <div style={{ marginBottom: 48, position: "relative" }}>
              {/* The line */}
              <div style={{
                height: 1, background: "rgba(255,255,255,0.08)",
                position: "relative", marginBottom: 20,
              }}>
                {/* Dot A — primary, fast */}
                <div style={{
                  position: "absolute", top: "50%", marginTop: -4,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#7c3aed",
                  boxShadow: "0 0 10px 3px rgba(124,58,237,0.6)",
                  animation: "dotA 3.4s linear infinite",
                }} />
                {/* Dot B — secondary, medium speed */}
                <div style={{
                  position: "absolute", top: "50%", marginTop: -3,
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#a78bfa",
                  boxShadow: "0 0 8px 2px rgba(167,139,250,0.5)",
                  animation: "dotB 5.1s linear infinite 1.2s",
                }} />
                {/* Dot C — ghost, slow */}
                <div style={{
                  position: "absolute", top: "50%", marginTop: -2.5,
                  width: 5, height: 5, borderRadius: "50%",
                  background: "#c4b5fd",
                  boxShadow: "0 0 6px 1px rgba(196,181,253,0.3)",
                  animation: "dotC 7.8s linear infinite 2.8s",
                }} />
              </div>

              {/* Labels */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>
                  Signals in
                </span>
                <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>
                  Growth out
                </span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Stat value="4.2×" label="avg reach lift" />
              <Stat value="2,847" label="leads generated" />
              <Stat value="943" label="replies handled" />
            </div>
          </div>

          {/* Quote */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{
              borderLeft: "2px solid rgba(124,58,237,0.4)",
              paddingLeft: 16,
            }}>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0 }}>
                "Grew our Instagram reach 4.2× in 6 weeks. The AI knows our voice better than we do."
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>
                — Early access user, marketing agency
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — Form ──────────────────────────────────── */}
        <div style={{
          flex: 1,
          background: "#0e0d18",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "40px 24px",
          minHeight: "100vh",
        }}>
          <div style={{ width: "100%", maxWidth: 360 }}>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <h2 style={{
                fontSize: 24, fontWeight: 700, letterSpacing: "-0.04em",
                color: "rgba(255,255,255,0.95)", margin: 0, marginBottom: 6,
              }}>
                Welcome back
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: 0 }}>
                Sign in to your dashboard
              </p>
            </div>

            {/* Demo banner */}
            <button
              type="button"
              onClick={fillDemo}
              style={{
                width: "100%", textAlign: "left", cursor: "pointer",
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.2)",
                borderRadius: 10, padding: "10px 14px",
                marginBottom: 20, transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(124,58,237,0.14)";
                e.currentTarget.style.borderColor = "rgba(124,58,237,0.38)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(124,58,237,0.08)";
                e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)";
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 600, color: "#a78bfa", marginBottom: 5, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Demo — click to auto-fill
              </p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>
                  {DEMO_EMAIL}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>
                  {DEMO_PASSWORD}
                </span>
              </div>
            </button>

            {/* Form */}
            <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {state?.error && (
                <div style={{
                  padding: "10px 14px", borderRadius: 9, fontSize: 13,
                  background: "rgba(239,68,68,0.07)",
                  border: "1px solid rgba(239,68,68,0.18)",
                  color: "#f87171",
                }}>
                  {state.error}
                </div>
              )}

              <Field
                id="email" label="Email"
                type="email" placeholder="you@company.com"
                autoComplete="email" required
              />

              <Field
                id="password" label="Password"
                type="password" placeholder="••••••••"
                autoComplete="current-password" required
                right={
                  <button
                    type="button"
                    style={{
                      fontSize: 11, color: "rgba(167,139,250,0.7)",
                      background: "none", border: "none", cursor: "pointer",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Forgot?
                  </button>
                }
              />

              <button
                type="submit"
                disabled={isPending}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10,
                  fontSize: 14, fontWeight: 600,
                  background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                  color: "white", border: "none",
                  boxShadow: "0 4px 18px rgba(124,58,237,0.32)",
                  opacity: isPending ? 0.7 : 1, cursor: isPending ? "not-allowed" : "pointer",
                  transition: "all 0.15s", marginTop: 4,
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={e => {
                  if (!isPending) {
                    e.currentTarget.style.boxShadow = "0 6px 24px rgba(124,58,237,0.5)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = "0 4px 18px rgba(124,58,237,0.32)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {isPending ? "Signing in…" : "Sign in"}
              </button>
            </form>

            {/* Divider */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10, margin: "20px 0",
            }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", letterSpacing: "0.05em" }}>OR</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Social auth */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
              ].map(p => (
                <button
                  key={p.name}
                  type="button"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "10px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.55)", cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.88)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                  }}
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>

            <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 22 }}>
              No account?{" "}
              <Link
                href={"#waitlist" as never}
                style={{ color: "rgba(167,139,250,0.8)", fontWeight: 500, textDecoration: "none" }}
              >
                Join the beta waitlist
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Mobile: hide left panel */}
      <style>{`
        @media (max-width: 768px) {
          div[data-left-panel] { display: none !important; }
        }
      `}</style>
    </>
  );
}
