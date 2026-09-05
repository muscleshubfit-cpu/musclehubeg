import type { Metadata } from "next";

/**
 * M30 fix: English-first metadata for /programs and /programs/[slug].
 * Arabic mirrors (/ar/programs) have their own layout with Arabic metadata.
 */
export const metadata: Metadata = {
  title: "Workout Programs | Musclehubeg",
  description:
    "Ready-made workout programs for all levels and goals. Home workouts without equipment, dumbbell programs, and full gym programs. Start your fitness journey today.",
  keywords: [
    "workout programs",
    "training programs",
    "home workout",
    "gym program",
    "bodyweight workout",
    "dumbbell program",
    "fitness plan",
  ],
  alternates: {
    canonical: "https://alkemos.com/programs",
  },
  openGraph: {
    title: "Workout Programs | Musclehubeg",
    description: "Ready-made workout programs for all levels and goals.",
    type: "website",
    locale: "en_US",
    url: "https://alkemos.com/programs",
  },
};

export default function ProgramsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
