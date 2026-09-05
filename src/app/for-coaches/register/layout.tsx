import type { Metadata } from "next";

/**
 * COACH REGISTRATION — SEO layout for /for-coaches/register.
 * EN CANONICAL of the twin pair (2026-08-30 — mirrors /ar/about & /ar/faq):
 *   EN canonical: /for-coaches/register      ← this layout (EN-first)
 *   AR mirror:    /ar/for-coaches/register   (Arabic-first)
 * Indexed deliberately: coaches searching "register as a coach" land
 * straight on the form (the /auth block in robots.txt does NOT apply —
 * this is a public recruitment surface, owner-approved).
 */

const SITE = "https://alkemos.com";
const PAGE_URL = `${SITE}/for-coaches/register`;

export const metadata: Metadata = {
  title: "Coach registration — create your free Musclehubeg account",
  description:
    "Register as a coach on Musclehubeg in one minute: instant activation, add your clients, set your own prices and collect directly — zero commission from your income.",
  keywords: [
    "coach sign up",
    "register as a coach",
    "online coaching platform",
    "Musclehubeg coach",
  ],
  alternates: {
    canonical: PAGE_URL,
    languages: {
      en: PAGE_URL,
      ar: `${SITE}/ar/for-coaches/register`,
      "x-default": PAGE_URL,
    },
  },
  openGraph: {
    title: "Coach registration — Musclehubeg",
    description:
      "Create your free coach account — instant activation, your clients at your prices, your money in your hands.",
    url: PAGE_URL,
    siteName: "Musclehubeg",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Coach registration — Musclehubeg",
    description: "Create your free coach account — instant activation.",
  },
  robots: { index: true, follow: true },
};

export default function CoachRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
