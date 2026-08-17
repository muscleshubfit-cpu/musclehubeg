"use client";

import { useEffect, useState } from "react";
import { getSubscriptionForClient } from "@/lib/data";
import type { MembershipTier } from "@/lib/memberships";
import type { Profile } from "@/lib/supabase/types";

/**
 * useMembershipTier — client-side hook that resolves the current user's
 * membership tier by querying the `subscriptions` table via Supabase.
 *
 * Why this exists: the `Profile` type does NOT include a `membership_tier`
 * field — that info lives server-side only, resolved in `requireUser()`
 * via the subscriptions table. Several client components (SaveResultButton,
 * water-tracker, etc.) need to gate features by tier, and previously they
 * read `profile.membership_tier` which is always `undefined`, making
 * every user effectively "free" even when they had a Premium/Pro/Coaching
 * subscription.
 *
 * Resolution rules (mirror `src/lib/auth-server.ts:96-109`):
 *   - profile.role === "coach" → "coaching"
 *   - active subscription with valid tier → that tier
 *   - otherwise → "free"
 *
 * Usage:
 *   const { tier, loading } = useMembershipTier(profile);
 *   if (loading) return null;
 *   if (tier === "free") { /* show upgrade CTA *\/ }
 *
 * Returns:
 *   { tier: MembershipTier, loading: boolean }
 *   - On first render: tier = "free", loading = true
 *   - After fetch completes: tier = resolved value, loading = false
 *   - If no profile: tier = "free", loading = false immediately
 */

const VALID_TIERS: MembershipTier[] = ["free", "premium", "pro", "coaching"];

export function useMembershipTier(
  profile: Profile | null,
): { tier: MembershipTier; loading: boolean } {
  const [tier, setTier] = useState<MembershipTier>("free");
  const [loading, setLoading] = useState<boolean>(Boolean(profile));

  useEffect(() => {
    if (!profile) {
      setTier("free");
      setLoading(false);
      return;
    }

    // Coaches auto-resolve to "coaching"
    if (profile.role === "coach") {
      setTier("coaching");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getSubscriptionForClient(profile.id)
      .then((sub: any) => {
        if (cancelled) return;
        const t = sub?.tier;
        if (t && VALID_TIERS.includes(t as MembershipTier)) {
          setTier(t as MembershipTier);
        } else {
          setTier("free");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setTier("free");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.role]);

  return { tier, loading };
}
