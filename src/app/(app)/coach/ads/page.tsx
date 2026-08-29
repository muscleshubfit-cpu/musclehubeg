"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { CoachAdsView } from "@/components/views/CoachAdsView";

/**
 * «أعلن معنا» — COACH ADS (0037) — /coach/ads
 *
 * Staff surface (coach + admin): fixed-duration ad packages paid from
 * the wallet; the ad runs as a featured card on the homepage. Gated
 * like /coach/wallet — staff only; clients bounce to /dashboard.
 */
export default function Page() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const isStaff =
    !!profile && (profile.role === "coach" || profile.role === "admin");

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
  return <CoachAdsView />;
}
