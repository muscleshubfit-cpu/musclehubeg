"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AuthView } from "@/components/views/AuthView";
import { safeNext } from "@/lib/safe-redirect";

function AuthPageInner() {
  const { profile, loading, isCoach } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") as "login" | "signup") || "login";
  // `next` is the path the user wanted to reach before being bounced to /auth
  // (e.g. /checkout?tier=essential&months=6). After login we send them back there.
  const next = searchParams.get("next") || undefined;
  // COACH ATTRIBUTION (0033): ?coach={slug} comes from the signup CTA on
  // a coach's landing page /coaches/{slug}. The slug is validated in
  // AuthView (SLUG_RE) and persisted to a 30-day cookie there.
  const coach = searchParams.get("coach") || undefined;

  useEffect(() => {
    if (!loading && profile) {
      // Already logged in — skip the form and go to the destination.
      // Coaches usually go to /coach, but if `next` is present it wins
      // (e.g. a coach hitting /checkout should land on /checkout, not /coach).
      if (next) {
        // Validate `next` to prevent open-redirect attacks (C17 fix).
        window.location.href = safeNext(next);
      } else {
        router.replace(isCoach ? "/coach" : "/dashboard");
      }
    }
  }, [loading, profile, isCoach, router, next]);

  if (loading || profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <AuthView mode={mode} next={next} coach={coach} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  );
}
