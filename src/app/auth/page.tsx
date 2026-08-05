"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AuthView } from "@/components/views/AuthView";

function AuthPageInner() {
  const { profile, loading, isCoach } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") as "login" | "signup") || "login";

  useEffect(() => {
    if (!loading && profile) {
      router.replace(isCoach ? "/coach" : "/dashboard");
    }
  }, [loading, profile, isCoach, router]);

  if (loading || profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <AuthView mode={mode} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  );
}
