import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Memberships | MuscleHubEG — Premium & Pro Plans",
  description:
    "Choose your MuscleHubEG membership: Free, Premium ($14.99/mo or $119/yr), or Pro ($29.99/mo or $239/yr). Unlock unlimited EVO AI, meal planner, workout plan generation, and premium content.",
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
    title: "MuscleHubEG Memberships — Premium & Pro Plans",
    description:
      "Unlock unlimited EVO AI, meal planner, workout generation, and more.",
    type: "website",
  },
  alternates: {
    canonical: "https://musclehubeg.vercel.app/memberships",
  },
};

export default function MembershipsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
