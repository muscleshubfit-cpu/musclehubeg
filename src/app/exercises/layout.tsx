import type { Metadata } from "next";

/**
 * M30 fix: this layout applies to BOTH /exercises and /exercises/[slug].
 * The root URL is English-first, so metadata should be English.
 * Arabic mirrors (/ar/exercises) have their own layout with Arabic metadata.
 */
export const metadata: Metadata = {
  title: "Exercise Library | Musclehubeg",
  description:
    "Browse 868+ exercises with full instructions, target muscles, and difficulty level. Exercises for chest, back, shoulders, legs, biceps, triceps, core, and cardio.",
  keywords: [
    "exercise library",
    "fitness exercises",
    "workout exercises",
    "gym exercises",
    "chest exercises",
    "back exercises",
    "leg exercises",
  ],
  alternates: {
    canonical: "https://musclehubeg.vercel.app/exercises",
  },
  openGraph: {
    title: "Exercise Library | Musclehubeg",
    description: "Browse 868+ exercises with full instructions and difficulty levels.",
    type: "website",
    locale: "en_US",
    url: "https://musclehubeg.vercel.app/exercises",
  },
};

export default function ExercisesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
