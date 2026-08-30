"use client";
import { SiteHeader } from "@/components/SiteHeader";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { CheckoutView } from "@/components/views/CheckoutView";
import { type MembershipTier } from "@/lib/memberships";
import { type Duration } from "@/lib/plans";

// 0045 MODEL DECREE: only the three model tiers are sellable.
//   - premium / pro  → platform memberships (B2C, admin-reviewed manual
//     payments + PayPal instant)
//   - coaching       → the $39.99 site-coaching product (B2C, admin)
// The legacy Starter/Elite products were RETIRED (their subscriptions
// resolved as "free" — paying clients got nothing; 0045 migrated the
// existing rows: starter → premium, elite → pro). Old /checkout links
// with those tiers now redirect to /memberships.
const VALID_TIERS: MembershipTier[] = ["premium", "pro", "coaching"];

function CheckoutPageInner() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tierParam = searchParams.get("tier") || "premium";
  const monthsParam = Number(searchParams.get("months")) || 1;
  const months = (monthsParam === 12 ? 12 : 1) as Duration;

  // Validate tier
  const isValid = VALID_TIERS.includes(tierParam as MembershipTier);
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
