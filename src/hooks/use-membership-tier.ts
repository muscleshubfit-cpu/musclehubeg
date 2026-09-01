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

    // Staff (coach | admin) auto-resolve to "coaching" for UI gates
    if (profile.role !== "client") {
      setTier("coaching");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getSubscriptionForClient(profile.id)
      .then((sub: { tier?: string | null } | null) => {
        if (cancelled) return;
        const t = sub?.tier;
        // 0045 legacy compat: retired starter/elite rows (remapped by
        // migration 0045) still resolve to their successor tiers here so a
        // paying client can never render as "free" through any code path.
        const mapped =
          t === "elite" ? "pro" : t === "starter" ? "premium" : t;
        if (mapped && VALID_TIERS.includes(mapped as MembershipTier)) {
          setTier(mapped as MembershipTier);
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
