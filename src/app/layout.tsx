import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Syne } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Geist — Vercel's premium clean font for body/UI text
// GeistSans and GeistMono are already optimized CSS variables

// Syne — geometric display font for headings and brand wordmarks
const syne = Syne({
  subsets:  ["latin"],
  variable: "--font-syne",   // keep for backward compat with sidebar refs
  display:  "swap",
  weight:   ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default:  "SignafyAI — AI Growth Operating System",
    template: "%s | SignafyAI",
  },
  description:
    "The AI-powered growth OS for agencies and brands. Generate leads, create on-brand content, automate social responses, and drive traffic — all from one intelligent dashboard.",
  keywords: ["AI marketing", "lead generation", "content automation", "social media AI", "SEO automation"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${syne.variable}`}
      style={{ fontFamily: "var(--font-geist-sans, system-ui, sans-serif)" }}
    >
      <body>
        <ClerkProvider>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
