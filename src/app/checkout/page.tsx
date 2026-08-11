"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckoutView } from "@/components/views/CheckoutView";
import { LandingView } from "@/components/views/LandingView";
import { getTier } from "@/lib/plans";
import type { TierId, Duration } from "@/lib/plans";

function CheckoutPageInner() {
 const searchParams = useSearchParams();
 const tier = (searchParams.get("tier") as TierId) || "essential";
 const months = (Number(searchParams.get("months")) || 6) as Duration;
 if (!getTier(tier)) return <LandingView />;
 return <CheckoutView tier={tier} months={months} />;
}

export default function Page() {
 return (
 <Suspense fallback={null}>
 <CheckoutPageInner />
 </Suspense>
 );
}
