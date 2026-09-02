import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";

/**
 * Server-side auth helpers for API routes.
 *
 * Why this exists: previously, ~13 of 15 API routes had NO auth check,
 * and /api/ai/chat trusted a `userId` field from the request body
 * (IDOR — any caller could read any user's plans / progress / questionnaires
 * / subscriptions).
 *
 * These helpers read the Supabase session from the request cookies (the
 * matching middleware.ts already syncs the session to cookies), verify it,
 * and load the user's profile (with role) from the `profiles` table.
 *
 * Demo-mode behavior: when NEXT_PUBLIC_SUPABASE_URL is not set, the app
 * runs in client-only demo mode and there is no server-side session to
 * verify. In that case these helpers return `null` (no session) and the
 * caller decides whether to 401 or fall through. We intentionally do NOT
 * 401 in demo mode — demo mode has no AI keys configured anyway, so the
 * routes will gracefully degrade to their local fallbacks.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isAuthConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http"),
);

export type MembershipTier =
  | "free"
  | "premium"
  | "pro"
  | "coaching";

export type AuthUser = {
  id: string;
  email?: string;
  role: "client" | "coach" | "admin";
  full_name?: string | null;
  /**
   * Staff flag — true for role coach AND admin (platform staff).
   * Staff bypass ALL consumer usage limits (EVO chat, plan quotas,
   * swaps) — STAFF QUOTA SEMANTICS. Client gating stays tier-driven.
   */
  is_staff: boolean;
  /**
   * Active membership tier for the user, resolved from the
   * `subscriptions` table (status='active', most recent). Falls back
   * to "free" if no active subscription exists. Staff (coach/admin)
   * are treated as "coaching" tier automatically for display gates —
   * hard limits are bypassed via is_staff.
   */
  membership_tier: MembershipTier;
};

/**
 * Read the authenticated user (if any) from the request cookies.
 * Returns null when:
 *   - Supabase is not configured (demo mode)
 *   - No session is present
 *   - The session is present but the profile row is missing
 */
export async function getAuthUser(
  request: NextRequest,
): Promise<AuthUser | null> {
  if (!isAuthConfigured) return null;

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op: API routes don't need to refresh cookies. The middleware
          // already handles session refresh for full-page requests.
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  // Resolve membership tier from subscriptions table.
  // Coaching and memberships (Premium/Pro) are COMPLETELY SEPARATE.
  // A client can have BOTH (e.g. Coaching + Pro).
  //
  // We resolve TWO things:
  // 1. membership_tier: the best MEMBERSHIP tier (pro > premium > free)
  //    — used for premiumContent, adsEnabled, patternAnalysis, etc.
  // 2. hasCoaching: whether the client has an active Coaching subscription
  //    — used for human coach features
  //
  // EVO limits are resolved by merging: if client has Coaching, they get
  // Premium-level EVO limits (same as Premium). If they also have Pro,
  // they get Pro-level EVO limits (better).
  //
  // The membership_tier field picks the BEST membership (not coaching).
  // Coaching EVO limits are merged via getLimits() in the client.
  let membership_tier: MembershipTier = "free";
  if (profile.role !== "client") {
    // Staff (coach | admin) — "coaching" tier unlocks subscriber UI gates;
    // hard limits are bypassed server-side via is_staff.
    membership_tier = "coaching";
  } else {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("tier, status, end_date")
      .eq("client_id", user.id)
      .eq("status", "active")
      .gt("end_date", new Date().toISOString());
    if (subs && subs.length > 0) {
      // Separate coaching from memberships
      const hasCoaching = subs.some((s) => s.tier === "coaching");
      // 0045 legacy compat: starter/elite were the retired coaching-page
      // products; migration 0045 remapped all rows (starter → premium,
      // elite → pro). The mapping here is belt-and-suspenders so a stray
      // legacy row can never downgrade a paying client to "free" again.
      const membershipSubs = subs.filter((s) =>
        ["premium", "pro", "starter", "elite"].includes(s.tier),
      );

      if (membershipSubs.length > 0) {
        // Pick the best membership tier (pro/elite > premium/starter)
        const priority = (tier: string) => {
          if (tier === "pro" || tier === "elite") return 3;
          if (tier === "premium" || tier === "starter") return 2;
          return 0;
        };
        membershipSubs.sort((a, b) => priority(b.tier) - priority(a.tier));
        const best = membershipSubs[0].tier as string;
        membership_tier = (best === "elite" ? "pro" : best === "starter" ? "premium" : best) as MembershipTier;
      } else if (hasCoaching) {
        // Only coaching, no membership — tier is "coaching" for EVO access
        membership_tier = "coaching";
      }
    }
  }

  return {
    id: profile.id,
    email: user.email,
    role: profile.role,
    full_name: profile.full_name,
    is_staff: profile.role !== "client",
    membership_tier,
  };
}

/**
 * Require a logged-in user (any role). Returns the user, or a 401 response
 * the caller can return directly.
 *
 * Usage:
 *   const userOrResponse = await requireUser(request);
 *   if (userOrResponse instanceof NextResponse) return userOrResponse;
 *   const user = userOrResponse; // narrowed to AuthUser
 */
export async function requireUser(
  request: NextRequest,
): Promise<AuthUser | Response> {
  const user = await getAuthUser(request);
  if (!user) {
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

/**
 * Require platform staff (role coach OR admin). Returns the user, or a
 * 401/403 response. Kept the name `requireCoach` (callers are staff-gated
 * surfaces) — semantics are now STAFF: the admin account passes every
 * gate a coach passes.
 */
export async function requireCoach(
  request: NextRequest,
): Promise<AuthUser | Response> {
  const user = await getAuthUser(request);
  if (!user) {
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "client") {
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ error: "Forbidden — staff only" }, {
      status: 403,
    });
  }
  return user;
}

/**
 * Require platform ADMIN (role === 'admin' ONLY). Admin-exclusive
 * surfaces (tool leads, saved-results admin, blog CMS + helpers,
 * referrals admin, audit/queue health) reject plain coaches with 403 —
 * owner answer 6 of the multi-coach design (2026-08-29).
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<AuthUser | Response> {
  const user = await getAuthUser(request);
  if (!user) {
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ error: "Forbidden — admin only" }, {
      status: 403,
    });
  }
  return user;
}

/**
 * Convenience: read the auth user using next/headers cookies (for server
 * components / server actions where NextRequest isn't available).
 * Not used by API routes — they use getAuthUser(request) above.
 */
export async function getAuthUserFromHeaders(): Promise<AuthUser | null> {
  if (!isAuthConfigured) return null;
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  let membership_tier: MembershipTier = "free";
  if (profile.role !== "client") {
    // Staff (coach | admin) — "coaching" tier unlocks subscriber UI gates;
    // hard limits are bypassed server-side via is_staff.
    membership_tier = "coaching";
  } else {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("tier, status, end_date")
      .eq("client_id", user.id)
      .eq("status", "active")
      .gt("end_date", new Date().toISOString());
    if (subs && subs.length > 0) {
      // Separate coaching from memberships
      const hasCoaching = subs.some((s) => s.tier === "coaching");
      const membershipSubs = subs.filter((s) =>
        ["premium", "pro"].includes(s.tier),
      );

      if (membershipSubs.length > 0) {
        const priority = (tier: string) => {
          if (tier === "pro") return 3;
          if (tier === "premium") return 2;
          return 0;
        };
        membershipSubs.sort((a, b) => priority(b.tier) - priority(a.tier));
        membership_tier = membershipSubs[0].tier as MembershipTier;
      } else if (hasCoaching) {
        membership_tier = "coaching";
      }
    }
  }

  return {
    id: profile.id,
    email: user.email,
    role: profile.role,
    full_name: profile.full_name,
    is_staff: profile.role !== "client",
    membership_tier,
  };
}
