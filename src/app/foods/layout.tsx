import type { Metadata } from "next";

/**
 * M30 fix: English-first metadata for /foods and /foods/[slug].
 * Arabic mirrors (/ar/foods) have their own layout with Arabic metadata.
 */
export const metadata: Metadata = {
  title: "Food Database | Musclehubeg",
  description:
    "Complete food database with calories and macros per 100g. Search foods, filter by protein/carbs/fat, and calculate the grams you need for your goals.",
  keywords: [
    "food database",
    "calories",
    "macros",
    "nutrition facts",
    "protein foods",
    "food calories",
    "macro calculator",
  ],
  alternates: {
    canonical: "https://alkemos.com/foods",
    // Homepage AR mirror follow-up (2026-08-30): declare the Arabic mirror
    // (src/app/ar/foods/page.tsx declares the reciprocal pair).
    languages: {
      en: "https://alkemos.com/foods",
      ar: "https://alkemos.com/ar/foods",
      "x-default": "https://alkemos.com/foods",
    },
  },
  openGraph: {
    title: "Food Database | Musclehubeg",
    description: "Complete food database with calories and macros. Search, filter, and calculate grams.",
    type: "website",
    locale: "en_US",
    url: "https://alkemos.com/foods",
  },
};

export default function FoodsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
