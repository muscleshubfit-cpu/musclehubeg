import type { Metadata } from "next";
import { getCoachingServiceSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "الكوتشينج أونلاين | MuscleHub — مدربين وأخصائيين تغذية",
  description:
    "كوتشينج أونلاين مع مدربين وأخصائيين تغذية محترفين. خطط تغذية مخصصة، برامج تمارين متكيفة، متابعة شخصية، ومساعد ذكاء اصطناعي (EVO) متاح 24/7. ابدأ رحلتك اليوم.",
  keywords: [
    "كوتشينج أونلاين",
    "مدربين تغذية",
    "أخصائيين تغذية",
    "خطط تغذية مخصصة",
    "برامج تمارين شخصية",
    "متابعة شخصية",
    "online coaching",
    "nutrition coaching",
    "personalized meal plans",
    "custom workout programs",
  ],
  openGraph: {
    title: "الكوتشينج أونلاين | MuscleHub — مدربين وأخصائيين تغذية",
    description:
      "خطط تغذية مخصصة، برامج تمارين متكيفة، متابعة شخصية، و EVO AI متاح 24/7.",
    type: "website",
    locale: "ar_EG",
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
