import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "حاسبة مؤشر كتلة الجسم BMI | MuscleHub — احسب وزنك المثالي",
  description:
    "احسب مؤشر كتلة الجسم (BMI) مجاناً. اعرف هل وزنك مثالي أم زائد أم ناقص. حاسبة BMI دقيقة وسهلة الاستخدام مع تفسير النتائج.",
  keywords: [
    "حاسبة BMI",
    "مؤشر كتلة الجسم",
    "حساب الوزن المثالي",
    "BMI calculator",
    "حاسبة وزن",
    "Body Mass Index",
    "حساب مؤشر الكتلة",
  ],
  openGraph: {
    title: "حاسبة مؤشر كتلة الجسم BMI | MuscleHub",
    description: "احسب مؤشر كتلة الجسم (BMI) مجاناً واعرف وزنك المثالي.",
    type: "website",
    locale: "ar_EG",
  },
};

export default function BMILayout({ children }: { children: React.ReactNode }) {
  return children;
}
