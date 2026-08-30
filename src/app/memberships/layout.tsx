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
  return children;
}
