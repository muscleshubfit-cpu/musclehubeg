import type { Metadata } from "next";
import { getCoachingServiceSchema } from "@/lib/seo";

/**
 * M30 fix: English-first metadata for /coaching.
 */
export const metadata: Metadata = {
  title: "Online Coaching | Musclehubeg — Coaches & Nutrition Specialists",
  description:
    "Online coaching with professional coaches and nutrition specialists. Personalized meal plans, adaptive workout programs, personal follow-up, and EVO AI assistant available 24/7. Start your journey today.",
  keywords: [
    "online coaching",
    "nutrition coaching",
    "personalized meal plans",
    "custom workout programs",
    "personal coaching",
    "fitness coach online",
    "nutrition specialist",
  ],
  openGraph: {
    title: "Online Coaching | Musclehubeg — Coaches & Nutrition Specialists",
    description:
      "Personalized meal plans, adaptive workouts, personal follow-up, and EVO AI available 24/7.",
    type: "website",
    locale: "en_US",
    url: "https://musclehubeg.vercel.app/coaching",
  },
  alternates: {
    canonical: "https://musclehubeg.vercel.app/coaching",
  },
};

const coachingSchema = getCoachingServiceSchema();

export default function CoachingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(coachingSchema) }}
      />
      {children}
    </>
  );
}
