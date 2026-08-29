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
    canonical: "https://musclehubeg.vercel.app/foods",
  },
  openGraph: {
    title: "Food Database | Musclehubeg",
    description: "Complete food database with calories and macros. Search, filter, and calculate grams.",
    type: "website",
    locale: "en_US",
    url: "https://musclehubeg.vercel.app/foods",
  },
};

export default function FoodsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
