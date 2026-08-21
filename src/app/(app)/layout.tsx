"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";

/**
 * Shared shell for every authenticated route (dashboard, plans, progress,
 * chat, coach/*, ...). Centralizes the auth gate so each page.tsx only has
 * to render its own view.
 */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
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
