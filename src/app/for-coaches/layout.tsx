import type { Metadata } from "next";
import { getFAQSchema, getBreadcrumbSchema } from "@/lib/seo";
import { COACH_FAQ_EN } from "./content";

/**
 * FOR-COACHES — SEO layout (server component under a client page).
 *
 * EN CANONICAL of the twin pair (2026-08-30 — was a single bilingual
 * URL with self-referencing hreflang; now mirrors /ar/about & /ar/faq):
 *   EN canonical: /for-coaches      ← this layout (EN-first metadata)
 *   AR mirror:    /ar/for-coaches   (Arabic-first metadata)
 *   The pair (en/ar/x-default) is declared on BOTH sides — no
 *   self-references, no inherited signals.
 *
 * JSON-LD: FAQPage (EN questions on the EN side) + BreadcrumbList.
 */

const SITE = "https://alkemos.com";
const PAGE_URL = `${SITE}/for-coaches`;

export const metadata: Metadata = {
  title: "Coach on Musclehubeg — your clients, your prices, your money",
  description:
    "Register as a coach or nutrition specialist on Musclehubeg for free: a complete platform to run your own clients, AI-generated nutrition & workout plans, your pricing and direct collection — zero commission, a fixed monthly activation fee only. Instant activation.",
  keywords: [
    "join as a coach",
    "coach registration",
    "online coaching platform",
    "personal trainer platform",
    "manage fitness clients",
    "AI meal plans for clients",
    "Musclehubeg coach",
  ],
  alternates: {
    canonical: PAGE_URL,
    languages: {
      en: PAGE_URL,
      ar: `${SITE}/ar/for-coaches`,
      "x-default": PAGE_URL,
    },
  },
  openGraph: {
    title: "Coach on Musclehubeg — your clients, your prices, your money",
    description:
      "A complete coach platform: client management, AI plans, your pricing, direct payments — zero commission. Register free with instant activation.",
    url: PAGE_URL,
    siteName: "Musclehubeg",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: `${SITE}/images/coach-portrait.jpg`,
        width: 1122,
        height: 1402,
        alt: "Coach on Musclehubeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Coach on Musclehubeg — your clients, your prices, your money",
    description:
      "Client management, AI plans, your pricing with zero commission. Register free.",
    images: [`${SITE}/images/coach-portrait.jpg`],
  },
};

const faqSchema = getFAQSchema(COACH_FAQ_EN);
const breadcrumbSchema = getBreadcrumbSchema([
  { name: "Musclehubeg", url: SITE },
  { name: "For coaches", url: PAGE_URL },
]);

export default function ForCoachesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
