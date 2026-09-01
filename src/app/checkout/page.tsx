"use client";
import { SiteHeader } from "@/components/SiteHeader";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { CheckoutView } from "@/components/views/CheckoutView";
import { type Duration, type TierId } from "@/lib/plans";
import type { MembershipTier } from "@/lib/memberships";

// Sellable tiers (0046 OWNER DECREE — price revert):
//   - premium / pro   → platform memberships (B2C, /memberships)
//   - coaching        → the $39.99 site-coaching product (B2C, /memberships —
//                       the 0045 dead-end fix stays)
//   - starter / elite → the ORIGINAL /coaching page products ($20 / $40) —
//                       the owner restored them («الأسعار اللي شيلتها هي
//                       الصحيحة والمربوطة مع باي بال»). PayPal charges the
//                       exact clicked price (plans.ts); activation writes the
//                       canonical tier (starter → premium, elite → pro).
const VALID_TIERS: string[] = ["premium", "pro", "coaching", "starter", "elite"];

function CheckoutPageInner() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tierParam = searchParams.get("tier") || "premium";
  const monthsParam = Number(searchParams.get("months")) || 1;
  const months = (monthsParam === 12 ? 12 : 1) as Duration;

  // Validate tier
  const isValid = VALID_TIERS.includes(tierParam);
  // Always redirect unauthenticated users to login with next=checkout URL preserved
  const nextPath = `/checkout?tier=${encodeURIComponent(tierParam)}&months=${months}`;
  const authHref = `/auth?mode=login&next=${encodeURIComponent(nextPath)}`;

  useEffect(() => {
    if (!loading && !profile) {
      router.replace(authHref);
    } else if (!loading && !isValid) {
      router.replace("/memberships");
    }
  }, [loading, profile, isValid, router, authHref]);

  if (loading || !profile || !isValid) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <CheckoutView tier={tierParam as TierId | MembershipTier} months={months} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner />
    </Suspense>
  );
}
