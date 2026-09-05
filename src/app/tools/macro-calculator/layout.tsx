import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Macro Calculator | Musclehubeg — Calculate Protein, Carbs & Fat",
  description:
    "Calculate your daily macro needs (protein, carbohydrates, fat) based on your calories and goals. Free and accurate macro calculator.",
  keywords: [
    "macro calculator",
    "macros calculator",
    "protein calculator",
    "carb calculator",
    "fat calculator",
    "daily macros",
  ],
  alternates: {
    canonical: "https://alkemos.com/tools/macro-calculator",
  },
  openGraph: {
    title: "Macro Calculator | Musclehubeg",
    description: "Calculate your daily protein, carbs, and fat needs for free.",
    type: "website",
    locale: "en_US",
    url: "https://alkemos.com/tools/macro-calculator",
  },
};

export default function MacroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
