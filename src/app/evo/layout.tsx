import type { Metadata } from "next";
import { getEVOApplicationSchema } from "@/lib/seo";

/**
 * M30 fix: English-first metadata for /evo.
 */
export const metadata: Metadata = {
  title: "EVO — AI Fitness Coach | Musclehubeg",
  description:
    "EVO is an intelligent performance engine — not just a chatbot. It analyzes your health data, predicts results, updates plans automatically, and provides 24/7 fitness and nutrition consulting via AI. Free for everyone.",
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
    title: "EVO — AI Fitness Coach | Musclehubeg",
    description:
      "An intelligent engine that analyzes your data and updates plans automatically. Free for everyone.",
    type: "website",
    locale: "en_US",
    url: "https://musclehubeg.vercel.app/evo",
  },
  alternates: {
    canonical: "https://musclehubeg.vercel.app/evo",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(evoSchema) }}
      />
      {children}
    </>
  );
}
