import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "مكتبة التمارين | MuscleHubEG",
  description:
    "تصفّح مكتبة التمارين الرياضية مع شرح كامل، عضلات مستهدفة، ومستوى الصعوبة. تمارين للصدر، الظهر، الأكتاف، الأرجل، البايسبس، الترايسبس، الكور، والكارديو.",
  keywords: [
    "مكتبة تمارين",
    "تمارين رياضية",
    "exercise library",
    "fitness exercises",
    "تمارين صدر",
    "تمارين ظهر",
    "تمارين أرجل",
  ],
  openGraph: {
    title: "مكتبة التمارين | MuscleHubEG",
    description: "تصفّح مكتبة التمارين مع شرح كامل ومستوى الصعوبة.",
    type: "website",
    locale: "ar_EG",
  },
};

export default function ExercisesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
