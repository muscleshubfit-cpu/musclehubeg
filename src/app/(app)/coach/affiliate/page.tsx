"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ReferralView } from "@/components/views/ReferralView";

/**
 * COACH AFFILIATE DASHBOARD — /coach/affiliate (Phase 67, owner-approved).
 *
 * Owner decree 2026-09-01: a referred COACH is part of the affiliate
 * system — he earns 20% of the site fee on every client activation he
 * pays for... and the person who INVITED him earns it too. Staff (coach +
 * admin) previously bounced off /referral (client-only surface), so this
 * staff mirror reuses the same ReferralView against the same tables.
 * Clients bounce to /dashboard.
 */
export default function Page() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const isStaff = !!profile && (profile.role === "coach" || profile.role === "admin");

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/auth");
      return;
    }
    if (!isStaff) {
      router.replace("/dashboard");
    }
  }, [loading, profile, isStaff, router]);

  if (loading || !isStaff) return null;
  return <ReferralView />;
}
