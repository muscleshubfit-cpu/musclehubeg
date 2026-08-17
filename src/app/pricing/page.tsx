import type { Metadata } from "next";
import { PricingView } from "@/components/views/PricingView";

export const metadata: Metadata = {
 title: "الأسعار والباقات | MuscleHub",
 description:
 "اختار الباقة المناسبة لهدفك — خطط تغذية وتمرين شخصية، متابعة أسبوعية، ومنصة MuscleHub الذكية.",
 openGraph: {
 title: "الأسعار والباقات | MuscleHub",
 description: "اختار الباقة المناسبة لهدفك مع MuscleHub.",
 type: "website",
 },
};

export default function Page() {
 return <PricingView />;
}
