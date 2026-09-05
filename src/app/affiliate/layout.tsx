import type { Metadata } from "next";

/**
 * Public Affiliate Program page SEO metadata.
 * Page itself is a client component (uses useI18n), so metadata must live
 * in a server-side layout.tsx — Next.js requirement.
 *
 * EN is the primary language (target: English-speaking audience).
 * AR metadata is provided via the alternates.hreflang entry, pointing to
 * the same /affiliate path (the page renders AR content based on the
 * I18nProvider's localStorage/browser detection).
 */
export const metadata: Metadata = {
  title: "Alkemos Affiliate Program — Turn Your Influence Into Income",
  description:
    "Join the Alkemos Affiliate Program, share smarter fitness and nutrition solutions, and earn commissions from eligible purchases made through your personal Affiliate link.",
  keywords: [
    "Alkemos affiliate program",
    "fitness affiliate program",
    "nutrition affiliate program",
    "earn commission fitness",
    "fitness influencer program",
    "personal trainer affiliate",
    "fitness blogger affiliate",
    "workout affiliate",
    "AI fitness coach affiliate",
    "sports affiliate program",
  ],
  openGraph: {
    title: "Alkemos Affiliate Program — Turn Your Influence Into Income",
    description:
      "Share Alkemos with people who trust your recommendations and earn commissions from eligible purchases.",
    type: "website",
    url: "https://alkemos.com/affiliate",
    siteName: "Alkemos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Alkemos Affiliate Program — Turn Your Influence Into Income",
    description:
      "Share Alkemos with people who trust your recommendations and earn commissions from eligible purchases.",
  },
  alternates: {
    canonical: "https://alkemos.com/affiliate",
    languages: {
      "en-US": "https://alkemos.com/affiliate",
      "ar-EG": "https://alkemos.com/affiliate",
    },
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AffiliateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
