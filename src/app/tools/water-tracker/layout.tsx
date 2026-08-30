import type { Metadata } from "next";

/**
 * FULL-SITE AUDIT FIX (2026-08-30): /tools/water-tracker previously had
 * NO metadata at all — it inherited BOTH the title AND the canonical of
 * the /tools hub, literally telling Google "I am the tools index page"
 * (a deindexing risk for the tracker). The page is a client component,
 * so a server layout owns the metadata (same pattern as the other tool
 * pages, e.g. calorie-calculator/layout.tsx). No hreflang: no /ar
 * mirror exists for this page.
 */
export const metadata: Metadata = {
  title: "Water Tracker | Musclehubeg — Daily Hydration Goal & Reminder",
  description:
    "Track your daily water intake for free: get a smart hydration goal based on your body weight (35 ml × kg), log every cup, keep your history, and build the habit of staying hydrated.",
  keywords: [
    "water tracker",
    "water intake calculator",
    "daily water goal",
    "hydration tracker",
    "how much water should I drink",
    "hydration reminder",
  ],
  alternates: {
    canonical: "/tools/water-tracker",
  },
  openGraph: {
    title: "Water Tracker | Musclehubeg",
    description:
      "Smart daily hydration goal from your body weight, cup logging, and history — free water tracker.",
    type: "website",
    url: "https://musclehubeg.vercel.app/tools/water-tracker",
  },
};

export default function WaterTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
