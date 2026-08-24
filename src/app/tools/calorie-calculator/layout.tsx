import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "حاسبة السعرات الحرارية | MuscleHubEG — احسب احتياجك اليومي",
  description:
    "احسب سعراتك الحرارية اليومية والماكروز (بروتين، كارب، دهون) بناءً على وزنك وطولك وعرك ومستوى نشاطك. حاسبة مجانية ودقيقة باستخدام معادلة Mifflin-St Jeor.",
  keywords: [
    "حاسبة السعرات الحرارية",
    "حساب السعرات",
    "حاسبة ماكروز",
    "TDEE calculator",
    "calorie calculator",
    "حاسبة احتياج يومي",
    "BMR calculator",
    "حساب البروتين اليومي",
  ],
  openGraph: {
    title: "حاسبة السعرات الحرارية | MuscleHubEG",
    description: "احسب احتياجك اليومي من السعرات والماكروز مجاناً.",
    type: "website",
    locale: "ar_EG",
  },
  twitter: {
    card: "summary_large_image",
    title: "حاسبة السعرات الحرارية | MuscleHubEG",
    description: "احسب احتياجك اليومي من السعرات والماكروز مجاناً.",
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
