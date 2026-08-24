"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";

/**
 * Client-side auth gate for authenticated routes (dashboard, plans,
 * progress, chat, coach/*, ...). Centralizes the auth check so each
 * page.tsx only has to render its own view.
 *
 * NOTE: This is a client component (uses useAuth/useEffect), so it CANNOT
 * export `metadata`. The parent `layout.tsx` (server component) exports
 * the `metadata` (including `noindex`) and renders this gate as its body.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
 const { profile, loading } = useAuth();
 const router = useRouter();

 useEffect(() => {
 if (!loading && !profile) {
 router.replace("/auth");
 }
 }, [loading, profile, router]);

 if (loading || !profile) {
 return (
 <div className="flex min-h-screen items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
 </div>
 );
 }

 return <AppLayout>{children}</AppLayout>;
}
