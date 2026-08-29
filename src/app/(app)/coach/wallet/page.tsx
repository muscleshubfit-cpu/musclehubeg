"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { CoachWalletView } from "@/components/views/CoachWalletView";

/**
 * COACH WALLET (0035) — /coach/wallet
 *
 * Staff surface (coach + admin): wallet balance, top-up rails
 * (InstaPay / Vodafone Cash / PayPal link), receipt upload, request
 * history and the wallet ledger. Gated like /coach/payments — staff
 * only; clients bounce to /dashboard.
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
  return <CoachWalletView />;
}
