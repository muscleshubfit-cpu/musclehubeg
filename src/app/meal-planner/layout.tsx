import type { Metadata } from "next";

/**
 * FULL-SITE AUDIT FIX (2026-08-30): /meal-planner previously had no
 * metadata and INHERITED the root canonical (= homepage), telling Google
 * it was a duplicate of "/" — and the inherited ar-EG→/ar hreflang
 * falsely claimed the AR homepage was its twin. The page is a client
 * component, so a server layout owns the metadata (same pattern as the
 * tool pages). No hreflang: no /ar mirror exists for this page.
 */
export const metadata: Metadata = {
  title: "Meal Planner | Musclehubeg — Build & Download Custom Meal Plans",
  description:
    "Create a personalized meal plan in minutes: search the Musclehubeg food database, set your portions and calories, save plans as bookmarks, and download or export the final plan for free.",
  keywords: [
    "meal planner",
    "custom meal plan",
    "meal plan creator",
    "nutrition plan builder",
    "food database meal planner",
    "free meal planner",
  ],
  alternates: {
    canonical: "/meal-planner",
  },
  openGraph: {
    title: "Meal Planner | Musclehubeg",
    description:
      "Build a personalized meal plan from the full food database and download it for free.",
    type: "website",
    url: "https://alkemos.com/meal-planner",
  },
};

export default function MealPlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
