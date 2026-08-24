import type { Metadata } from "next";
import { getEVOApplicationSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "EVO — كوتش ذكاء اصطناعي | MuscleHubEG",
  description:
    "EVO محرك أداء ذكي — مش مجرد شات بوت. يحلل بياناتك الصحية، يتنبأ بنتائجك، يحدّث خططك تلقائياً، ويوفر استشارات لياقة وتغذية 24/7 عبر الذكاء الاصطناعي. مجاني للجميع.",
  keywords: [
    "EVO AI coach",
    "كوتش ذكاء اصطناعي",
    "مساعد رياضي ذكي",
    "AI fitness coach",
    "محرك أداء ذكي",
    "استشارات لياقة",
    "استشارات تغذية",
    "ذكاء اصطناعي رياضي",
  ],
  openGraph: {
    title: "EVO — كوتش ذكاء اصطناعي | MuscleHubEG",
    description:
      "محرك أداء ذكي يحلل بياناتك ويحدّث خططك تلقائياً. مجاني للجميع.",
    type: "website",
    locale: "ar_EG",
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
