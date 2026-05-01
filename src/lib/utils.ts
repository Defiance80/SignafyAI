import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export function generateId(): string {
  return crypto.randomUUID();
}

/** Sanitize user text — strip null bytes, trim whitespace, cap length */
export function sanitizeText(input: string, maxLen = 10_000): string {
  return input.replace(/\0/g, "").trim().slice(0, maxLen);
}

/** Returns an error response body */
export function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Returns a JSON success response */
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Check plan usage limits — returns true if within limit */
export function withinLimit(used: number, limit: number): boolean {
  return used < limit;
}

/** Score color for lead scores */
export function scoreColor(score: number): { color: string; bg: string } {
  if (score >= 80) return { color: "#34d399", bg: "rgba(52,211,153,0.12)" };
  if (score >= 60) return { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" };
  if (score >= 40) return { color: "#fb923c", bg: "rgba(251,146,60,0.12)" };
  return { color: "#f87171", bg: "rgba(248,113,113,0.12)" };
}

export const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#e040fb",
  linkedin: "#0a66c2",
  tiktok: "#00f2ea",
  twitter: "#8899a6",
  facebook: "#1877f2",
  google: "#4285f4",
  manual: "#6b7280",
};
