import type { Metadata } from "next";
import AppRoot from "@/components/AppRoot";

export const metadata: Metadata = {
  title: "الأسعار والباقات | Ahmed Zake Coaching",
  description:
    "اختار الباقة المناسبة لهدفك — خطط تغذية وتمرين شخصية، متابعة أسبوعية، وتواصل مباشر مع الكوتش أحمد زكي.",
  openGraph: {
    title: "الأسعار والباقات | Ahmed Zake Coaching",
    description: "اختار الباقة المناسبة لهدفك مع أحمد زكي.",
    type: "website",
  },
};

export default function PricingPage() {
  return <AppRoot initialView="pricing" />;
}
