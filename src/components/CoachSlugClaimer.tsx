"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  getCoachSlugCookie,
  clearCoachSlugCookie,
} from "@/lib/coach-cookie";
import { toast } from "sonner";

/**
 * COACH ATTRIBUTION — Google OAuth path (0033).
 *
 * A client who signed up through a coach's landing page via GOOGLE has
 * no signup metadata (OAuth cannot carry it), so the 0033 trigger fell
 * back to the admin (site-client default). This component runs once per
 * session: if a coach slug cookie exists and the logged-in user is
 * still a client, it claims the assignment server-side
 * (POST /api/coach/claim — allowed only while the client is still with
 * the admin/general coach), then clears the cookie.
 *
 * Mounted in the root layout inside AuthProvider, next to
 * ReferralCookieChecker's pattern.
 */
export function CoachSlugClaimer() {
  const { profile, loading } = useAuth();
  const tried = useRef(false);

  useEffect(() => {
    if (loading || tried.current) return;
    if (!profile || profile.role !== "client") return;

    const slug = getCoachSlugCookie();
    if (!slug) return;

    tried.current = true;
    (async () => {
      try {
        const res = await fetch("/api/coach/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.coach_name) {
          toast.success(
            `تم ربطك بالمدرب ${json.coach_name} 🤝`,
            { duration: 6000 },
          );
        }
        // 409 (already owned by a real coach) / invalid slug → the
        // client stays where the DB put him. The cookie is consumed
        // either way so we never loop.
      } catch {
        // network error — cookie stays so a later session can retry
        tried.current = false;
        return;
      }
      clearCoachSlugCookie();
    })();
  }, [profile, loading]);

  return null;
}
