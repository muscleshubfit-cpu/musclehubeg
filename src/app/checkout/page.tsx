"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { CheckoutView } from "@/components/views/CheckoutView";
import { LandingView } from "@/components/views/LandingView";
import { getTier } from "@/lib/plans";
import type { TierId, Duration } from "@/lib/plans";

function CheckoutPageInner() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tier = (searchParams.get("tier") as TierId) || "essential";
  const months = (Number(searchParams.get("months")) || 6) as Duration;

  // Invalid tier → bounce to landing
  if (!getTier(tier)) return <LandingView />;

  // Build the "next" URL so we can return here after successful login.
  // We preserve tier + months so the user lands on the exact checkout
  // they were trying to access.
  const nextPath = `/checkout?tier=${encodeURIComponent(tier)}&months=${months}`;
  const authHref = `/auth?mode=login&next=${encodeURIComponent(nextPath)}`;

  // Auth gate: redirect unauthenticated visitors to /auth?next=...
  useEffect(() => {
    if (!loading && !profile) {
      router.replace(authHref);
    }
  }, [loading, profile, router, authHref]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <CheckoutView tier={tier} months={months} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner />
    </Suspense>
  );
}
