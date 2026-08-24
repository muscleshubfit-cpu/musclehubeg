import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الأدوات المجانية | MuscleHubEG — حاسبات لياقة وتغذية",
  description:
    "أدوات مجانية لللياقة والتغذية: حاسبة السعرات الحرارية، حاسبة BMI، حاسبة الماكروز، حاسبة نسبة الدهون.",
  keywords: [
    "أدوات رياضية مجانية",
    "حاسبات لياقة",
    "free fitness tools",
    "حاسبة سعرات",
    "حاسبة BMI",
    "حاسبة ماكروز",
    "حاسبة دهون",
  ],
  openGraph: {
    title: "الأدوات المجانية | MuscleHubEG",
    description: "حاسبات لياقة وتغذية مجانية لرحلتك الرياضية.",
    type: "website",
    locale: "ar_EG",
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
