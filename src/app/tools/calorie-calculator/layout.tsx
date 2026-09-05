import type { Metadata } from "next";

/**
 * M30 fix: English-first metadata for /tools/calorie-calculator.
 */
export const metadata: Metadata = {
  title: "Calorie Calculator | Musclehubeg — Calculate Your Daily Needs",
  description:
    "Calculate your daily calorie needs and macros (protein, carbs, fat) based on your weight, height, age, and activity level. Free and accurate using the Mifflin-St Jeor equation.",
  keywords: [
    "calorie calculator",
    "TDEE calculator",
    "BMR calculator",
    "macro calculator",
    "daily calorie needs",
    "Mifflin-St Jeor",
    "protein calculator",
  ],
  alternates: {
    canonical: "https://alkemos.com/tools/calorie-calculator",
  },
  openGraph: {
    title: "Calorie Calculator | Musclehubeg",
    description: "Calculate your daily calorie needs and macros for free.",
    type: "website",
    locale: "en_US",
    url: "https://alkemos.com/tools/calorie-calculator",
  },
  twitter: {
    card: "summary_large_image",
    title: "Calorie Calculator | Musclehubeg",
    description: "Calculate your daily calorie needs and macros for free.",
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
