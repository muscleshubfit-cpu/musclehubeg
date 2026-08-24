import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "مكتبة الأكلات | MuscleHubEG",
  description:
    "مكتبة أطعمة كاملة بالسعرات والماكروز لكل 100 جرام. ابحث عن الأكلات، صفّي حسب البروتين والكارب والدهون، واحسب الجرامات اللي محتاجها.",
  keywords: [
    "مكتبة أطعمة",
    "سعرات حرارية",
    "ماكروز",
    "food database",
    "calories",
    "macros",
    "حاسبة جرامات",
  ],
  openGraph: {
    title: "مكتبة الأكلات | MuscleHubEG",
    description: "مكتبة أطعمة كاملة بالسعرات والماكروز. ابحث وصفّي واحسب الجرامات.",
    type: "website",
    locale: "ar_EG",
  },
};

export default function FoodsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
