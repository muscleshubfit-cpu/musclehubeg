"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";

/**
 * Client-side auth gate for /admin/* routes (blog CMS, referrals, leads,
 * saved-results). ADMIN-EXCLUSIVE (owner directive 2026-08-29): these
 * surfaces belong to the platform admin only — future coach accounts are
 * bounced back to their coach dashboard. Redirects logged-out users to
 * /auth. Sits OUTSIDE the (app) group, so it needs its own gate.
 *
 * NOTE: This is a client component, so it CANNOT export `metadata`. The
 * parent `layout.tsx` (server component) exports the `metadata`
 * (including `noindex`) and renders this gate as its body.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/auth");
      return;
    }
    if (profile.role !== "admin") {
      // Staff-but-not-admin (coach) or plain client — bounce to the right
      // surface: coaches to their client list, clients to their dashboard.
      router.replace(profile.role === "coach" ? "/coach" : "/dashboard");
    }
  }, [loading, profile, router]);

  if (loading || !profile || profile.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
