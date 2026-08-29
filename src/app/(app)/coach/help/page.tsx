"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { CoachHelpView } from "@/components/views/CoachHelpView";

/**
 * «دعم المدربين» (0037) — /coach/help
 *
 * Staff surface (coach + admin): the dedicated coach → site support
 * channel, separate from the site's client support. Gated like
 * /coach/wallet — staff only; clients bounce to /dashboard.
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
  return <CoachHelpView />;
}
