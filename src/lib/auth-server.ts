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
  role: "client" | "coach";
  full_name?: string | null;
  /**
   * Active membership tier for the user, resolved from the
   * `subscriptions` table (status='active', most recent). Falls back
   * to "free" if no active subscription exists. Coaches are treated
   * as "coaching" tier automatically.
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
  // Coaches get "coaching" automatically.
  // Multiple subs per client are allowed (e.g. Coaching + Premium).
  // We pick the highest-priority active sub: coaching > pro > premium > free.
  let membership_tier: MembershipTier = "free";
  if (profile.role === "coach") {
    membership_tier = "coaching";
  } else {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("tier, status")
      .eq("client_id", user.id)
      .eq("status", "active");
    if (subs && subs.length > 0) {
      const priority = (tier: string) => {
        if (tier === "coaching") return 4;
        if (tier === "pro") return 3;
        if (tier === "premium") return 2;
        if (tier === "elite") return 1;
        return 0;
      };
      const activeSubs = subs.filter((s: any) =>
        ["free", "premium", "pro", "coaching"].includes(s.tier),
      );
      if (activeSubs.length > 0) {
        activeSubs.sort((a: any, b: any) => priority(b.tier) - priority(a.tier));
        membership_tier = activeSubs[0].tier as MembershipTier;
      }
    }
  }

  return {
    id: profile.id,
    email: user.email,
    role: profile.role,
    full_name: profile.full_name,
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
 * Require a coach (role === "coach"). Returns the user, or a 401/403 response.
 */
export async function requireCoach(
  request: NextRequest,
): Promise<AuthUser | Response> {
  const user = await getAuthUser(request);
  if (!user) {
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "coach") {
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ error: "Forbidden — coach only" }, {
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
  if (profile.role === "coach") {
    membership_tier = "coaching";
  } else {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("tier, status")
      .eq("client_id", user.id)
      .eq("status", "active");
    if (subs && subs.length > 0) {
      const priority = (tier: string) => {
        if (tier === "coaching") return 4;
        if (tier === "pro") return 3;
        if (tier === "premium") return 2;
        if (tier === "elite") return 1;
        return 0;
      };
      const activeSubs = subs.filter((s: any) =>
        ["free", "premium", "pro", "coaching"].includes(s.tier),
      );
      if (activeSubs.length > 0) {
        activeSubs.sort((a: any, b: any) => priority(b.tier) - priority(a.tier));
        membership_tier = activeSubs[0].tier as MembershipTier;
      }
    }
  }

  return {
    id: profile.id,
    email: user.email,
    role: profile.role,
    full_name: profile.full_name,
    membership_tier,
  };
}
