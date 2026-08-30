"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";

/**
 * Client-side auth gate for authenticated routes (dashboard, plans,
 * progress, chat, coach/*, ...). Centralizes the auth check so each
 * page.tsx only has to render its own view.
 *
 * ROLE SURFACE LAW (2026-08-29): the (app) group mixes CLIENT surfaces
 * (dashboard, plans, progress, questionnaires, referral, support) with
 * STAFF surfaces (/coach, /coach/*). Platform staff (coach | admin) are
 * redirected away from client surfaces — the same UI must NOT be served
 * to staff and consumers. /admin/* has its own gate (admin-gate.tsx,
 * admin-exclusive).
 *
 * 2026-08-30 STAFF CONSOLE IDENTITY: the admin bounces to HIS console
 * (/admin), the coach to his (/coach) — the admin is not a coach's
 * assistant; he lands in site management.
 *
 * NOTE: This is a client component (uses useAuth/useEffect), so it CANNOT
 * export `metadata`. The parent `layout.tsx` (server component) exports the
 * metadata (including `noindex`) and renders this gate as its body.
 */

/** Client-only surfaces inside the (app) group — staff never see these. */
const CLIENT_ONLY_PATHS = [
  "/dashboard",
  "/plans",
  "/progress",
  "/questionnaires",
  "/referral",
  "/support",
];

export function AuthGate({ children }: { children: React.ReactNode }) {
 const { profile, loading } = useAuth();
 const pathname = usePathname();
 const router = useRouter();

 useEffect(() => {
   if (loading) return;
   if (!profile) {
     router.replace("/auth");
     return;
   }
   // Staff (coach | admin): client-only surfaces are not theirs — bounce
   // each role to his own console. Exact-prefix match so /coach/* never
   // matches /coach pages themselves.
   const isStaff = profile.role === "coach" || profile.role === "admin";
   if (isStaff && CLIENT_ONLY_PATHS.includes(pathname)) {
     router.replace(profile.role === "admin" ? "/admin" : "/coach");
   }
 }, [loading, profile, pathname, router]);

 const isStaff =
   !loading &&
   !!profile &&
   (profile.role === "coach" || profile.role === "admin");
 if (
   loading ||
   !profile ||
   (isStaff && CLIENT_ONLY_PATHS.includes(pathname))
 ) {
   return (
     <div className="flex min-h-screen items-center justify-center">
       <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
     </div>
   );
 }

 return <AppLayout>{children}</AppLayout>;
}
