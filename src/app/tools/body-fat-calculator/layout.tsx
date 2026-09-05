import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Body Fat Calculator | Alkemos — Calculate Your Body Fat %",
  description:
    "Calculate your body fat percentage using the U.S. Navy Method. Free calculator based on waist, neck, and hip circumference measurements.",
  keywords: [
    "body fat calculator",
    "body fat percentage",
    "Navy method body fat",
    "fat calculator",
    "body composition",
  ],
  alternates: {
    canonical: "https://alkemos.com/tools/body-fat-calculator",
  },
  openGraph: {
    title: "Body Fat Calculator | Alkemos",
    description: "Calculate your body fat percentage for free using the Navy Method.",
    type: "website",
    locale: "en_US",
    url: "https://alkemos.com/tools/body-fat-calculator",
  },
};

export default function BodyFatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
