import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignafyAI — AI Growth Operating System",
  description:
    "SignafyAI is a multi-tenant AI growth platform that generates leads, creates SEO-driven content, automates social responses, and drives traffic — for agencies, consultants, and brands.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
