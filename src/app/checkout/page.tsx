"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { CheckoutView } from "@/components/views/CheckoutView";
import { MEMBERSHIPS, type MembershipTier } from "@/lib/memberships";
import { getTier, type TierId, type Duration } from "@/lib/plans";

// Valid tiers across both systems:
//   - New membership system (premium, pro)
//   - Legacy coaching system (starter, elite) — kept for any old links
const VALID_MEMBERSHIP_TIERS: MembershipTier[] = ["premium", "pro"];
const VALID_LEGACY_TIERS: TierId[] = ["starter", "elite"];

function CheckoutPageInner() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tierParam = searchParams.get("tier") || "premium";
  const monthsParam = Number(searchParams.get("months")) || 1;
  const months = (monthsParam === 12 ? 12 : 1) as Duration;

  // Validate tier
  const isValidMembership = VALID_MEMBERSHIP_TIERS.includes(tierParam as MembershipTier);
  const isValidLegacy = VALID_LEGACY_TIERS.includes(tierParam as TierId);
  const isValid = isValidMembership || isValidLegacy;
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

  return <CheckoutView tier={tierParam as any} months={months} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner />
    </Suspense>
  );
}
