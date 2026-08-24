import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "حاسبة الماكروز | MuscleHubEG — احسب البروتين والكارب والدهون",
  description:
    "احسب احتياجك اليومي من الماكروز (بروتين، كاربوهيدرات، دهون) بناءً على السعرات الحرارية وهدفك. حاسبة ماكروز مجانية ودقيقة.",
  keywords: [
    "حاسبة ماكروز",
    "حساب البروتين اليومي",
    "macro calculator",
    "حاسبة بروتين كارب دهون",
    "macros calculator",
    "حساب الكاربوهيدرات",
  ],
  openGraph: {
    title: "حاسبة الماكروز | MuscleHubEG",
    description: "احسب احتياجك اليومي من البروتين والكارب والدهون مجاناً.",
    type: "website",
    locale: "ar_EG",
  },
};

export default function MacroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
