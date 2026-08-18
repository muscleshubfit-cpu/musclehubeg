import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "حاسبة نسبة الدهون | MuscleHub — احسب دهون جسمك",
  description:
    "احسب نسبة الدهون في جسمك باستخدام طريقة البحرية الأمريكية (Navy Method). حاسبة مجانية تعتمد على محيط الخصر والرقبة والورك.",
  keywords: [
    "حاسبة نسبة الدهون",
    "حساب دهون الجسم",
    "body fat calculator",
    "حاسبة دهون",
    "Navy method body fat",
    "نسبة الدهون في الجسم",
  ],
  openGraph: {
    title: "حاسبة نسبة الدهون | MuscleHub",
    description: "احسب نسبة الدهون في جسمك مجاناً.",
    type: "website",
    locale: "ar_EG",
  },
};

export default function BodyFatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
