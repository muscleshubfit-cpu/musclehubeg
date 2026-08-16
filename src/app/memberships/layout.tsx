import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Memberships | MuscleHub — Premium & Pro Plans",
  description:
    "Choose your MuscleHub membership: Free, Premium ($9.99/mo), or Pro ($19.99/mo). Unlock unlimited EVO AI, meal planner, workout plan generation, and premium content.",
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
    title: "MuscleHub Memberships — Premium & Pro Plans",
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
