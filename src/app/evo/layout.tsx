import type { Metadata } from "next";
import { getEVOApplicationSchema, jsonLd } from "@/lib/seo";

/**
 * M30 fix: English-first metadata for /evo.
 */
export const metadata: Metadata = {
  title: "EVO — AI Fitness Coach | Alkemos",
  description:
    "EVO is an intelligent performance engine — not just a chatbot. It reads your health data and goal, builds personalized nutrition and workout plans, suggests smart meal and exercise swaps, and provides 24/7 fitness and nutrition consulting via AI. Free for everyone.",
  keywords: [
    "EVO AI coach",
    "AI fitness coach",
    "intelligent performance engine",
    "AI workout assistant",
    "AI nutrition consultant",
    "fitness AI",
    "smart fitness coach",
  ],
  openGraph: {
    title: "EVO — AI Fitness Coach | Alkemos",
    description:
      "An intelligent engine that builds personalized plans from your data and suggests smart swaps. Free for everyone.",
    type: "website",
    locale: "en_US",
    url: "https://alkemos.com/evo",
  },
  alternates: {
    canonical: "https://alkemos.com/evo",
  },
};

// Inject EVO SoftwareApplication structured data
const evoSchema = getEVOApplicationSchema();

export default function EvoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(evoSchema) }}
      />
      {children}
    </>
  );
}
