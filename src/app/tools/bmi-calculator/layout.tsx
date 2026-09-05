import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BMI Calculator | Musclehubeg — Calculate Your Ideal Weight",
  description:
    "Calculate your Body Mass Index (BMI) for free. Find out if your weight is ideal, overweight, or underweight. Accurate and easy-to-use BMI calculator with result interpretation.",
  keywords: [
    "BMI calculator",
    "Body Mass Index",
    "ideal weight calculator",
    "BMI calculation",
    "weight calculator",
    "healthy weight",
  ],
  alternates: {
    canonical: "https://alkemos.com/tools/bmi-calculator",
  },
  openGraph: {
    title: "BMI Calculator | Musclehubeg",
    description: "Calculate your Body Mass Index (BMI) for free and find your ideal weight.",
    type: "website",
    locale: "en_US",
    url: "https://alkemos.com/tools/bmi-calculator",
  },
};

export default function BMILayout({ children }: { children: React.ReactNode }) {
  return children;
}
