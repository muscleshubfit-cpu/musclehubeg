import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "برامج التدريب | MuscleHub",
  description:
    "برامج تدريبية جاهزة لكل المستويات والأهداف. برامج منزلية بدون معدات، برامج بدمبل في المنزل، وبرامج جيم كاملة. ابدأ رحلتك الرياضية اليوم.",
  keywords: [
    "برامج تدريب",
    "برنامج تمارين",
    "workout programs",
    "training programs",
    "برنامج منزلي",
    "برنامج جيم",
    "تمارين بدون معدات",
  ],
  openGraph: {
    title: "برامج التدريب | MuscleHub",
    description: "برامج تدريبية جاهزة لكل المستويات والأهداف.",
    type: "website",
    locale: "ar_EG",
  },
};

export default function ProgramsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
