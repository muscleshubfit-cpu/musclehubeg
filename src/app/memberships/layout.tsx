import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Memberships | Musclehubeg — Premium & Pro Plans",
  description:
    "Choose your Musclehubeg membership: Free, Premium ($14.99/mo or $119/yr), or Pro ($29.99/mo or $239/yr). Unlock unlimited EVO AI, meal planner, workout plan generation, and premium content.",
  keywords: [
    "membership",
    "premium",
    "pro",
    "subscription",
    "fitness membership",
    "AI fitness coach",
    "meal planner",
    "workout plans",
  ],
  openGraph: {
    title: "Musclehubeg Memberships — Premium & Pro Plans",
    description:
      "Unlock unlimited EVO AI, meal planner, workout generation, and more.",
    type: "website",
  },
  alternates: {
    canonical: "https://musclehubeg.vercel.app/memberships",
    // Homepage AR mirror follow-up (2026-08-30): declare the Arabic mirror
    // (src/app/ar/memberships/page.tsx declares the reciprocal pair).
    languages: {
      en: "https://musclehubeg.vercel.app/memberships",
      ar: "https://musclehubeg.vercel.app/ar/memberships",
      "x-default": "https://musclehubeg.vercel.app/memberships",
    },
  },
};

export default function MembershipsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // GEO (2026-08-30): OfferCatalog with the storefront prices (source of
  // truth: src/lib/memberships.ts MEMBERSHIPS — matches what the page
  // displays). Machine-readable pricing for Google rich results and AI
  // answer engines ("how much is musclehubeg premium?").
  const offerCatalogSchema = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "Musclehubeg Membership Plans",
    url: "https://musclehubeg.vercel.app/memberships",
    itemListElement: [
      {
        "@type": "Offer",
        name: "Free",
        description: "Limited access to the platform basics.",
        price: "0",
        priceCurrency: "USD",
        url: "https://musclehubeg.vercel.app/memberships",
      },
      {
        "@type": "Offer",
        name: "Premium",
        description:
          "Unlimited EVO AI coach + monthly meal & workout plans. $14.99/month or $119/year.",
        price: "14.99",
        priceCurrency: "USD",
        url: "https://musclehubeg.vercel.app/memberships",
      },
      {
        "@type": "Offer",
        name: "Pro",
        description:
          "Premium content + doubled plan limits. $29.99/month or $239/year.",
        price: "29.99",
        priceCurrency: "USD",
        url: "https://musclehubeg.vercel.app/memberships",
      },
      {
        "@type": "Offer",
        name: "Coaching",
        description:
          "Human 1-on-1 coaching with a nutrition specialist. $39.99/month or $359/year.",
        price: "39.99",
        priceCurrency: "USD",
        url: "https://musclehubeg.vercel.app/coaching",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerCatalogSchema) }}
      />
      {children}
    </>
  );
}
