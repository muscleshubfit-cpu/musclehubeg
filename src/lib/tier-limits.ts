/**
 * Server-side tier limit helpers.
 *
 * Enforces daily message + swap limits at the API layer (not just
 * client-side). Fixes C15 (EVO chat limit bypassable) and C16
 * (swap limit bypassable).
 *
 * 2026-08-27 CRITICAL FIXES (audit findings G1–G4):
 *
 *   G3 — resolveTier() previously used getSubscriptionForClient(), which
 *        filtered NEITHER status NOR end_date: expired/pending/rejected
 *        subscriptions still granted unlimited Premium/Pro limits. It also
 *        imported a "use client" module (browser Supabase client without
 *        cookies) into server route context, so RLS could hide the rows and
 *        collapse paying users to "free". Now:
 *          1. The verified auth tier from getAuthUser()/requireUser()
 *             (already status='active' + end_date>now()-filtered) is passed
 *             in by every caller as `tierHint` and trusted first.
 *          2. Fallback re-resolution queries through the SERVICE-ROLE admin
 *             client with the same active+expiry filters.
 *
 *   G1/G2 — EVO chat daily counting moved to the tamper-proof
 *        `evo_chat_usage` ledger (migration 0022). Rows are inserted by the
 *        SERVER before each AI dispatch; users have no INSERT/DELETE policy,
 *        so neither skipping client inserts nor clearing chat history can
 *        reset/bypass the quota anymore.
 */

import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { MEMBERSHIPS, type MembershipTier } from "@/lib/memberships";

const VALID_TIERS: MembershipTier[] = ["free", "premium", "pro", "coaching"];

function sanitizeTier(tier: any): MembershipTier | null {
  return VALID_TIERS.includes(tier as MembershipTier)
    ? (tier as MembershipTier)
    : null;
}

/**
 * Fallback tier resolution when a route has no pre-computed auth tier.
 * Uses the service-role admin client (RLS-bypassing) with active + expiry
 * filtering — mirrors getAuthUser()'s logic in auth-server.ts.
 */
async function resolveTierFromDb(userId: string): Promise<MembershipTier> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return "free";
  try {
    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("tier")
      .eq("client_id", userId)
      .eq("status", "active")
      .gt("end_date", new Date().toISOString());

    if (!subs || subs.length === 0) return "free";

    const tiers = subs.map((s: any) => sanitizeTier(s.tier)).filter(Boolean);
    if (tiers.includes("pro")) return "pro";
    if (tiers.includes("premium")) return "premium";
    if (tiers.includes("coaching")) return "coaching";
    return "free";
  } catch (e: any) {
    console.error("[tier-limits] resolveTierFromDb error:", e?.message);
    // Fail CLOSED for limit purposes? No — fail OPEN would grant unlimited.
    // Fail SAFE: an unknown user counts as free (10 msgs/day), never premium.
    return "free";
  }
}

/**
 * Get the EVO chat daily limit for a tier.
 * Returns null = unlimited.
 */
export function evoChatLimitFor(tier: MembershipTier): number | null {
  const m = MEMBERSHIPS.find((x) => x.id === tier);
  const limit = m?.limits.evoChatDailyLimit;
  // null = unlimited; if tier not found, default to 10 (free tier limit)
  return limit === undefined ? 10 : limit;
}

/**
 * Get the swap weekly limit for a tier (per type: meal/exercise).
 * Returns null = unlimited.
 *
 * Maps membership tiers to swap limits:
 *   free:     0 (no swaps)
 *   premium:  3/week
 *   pro:      6/week
 *   coaching: 3/week (same as premium, but with human coach)
 */
export function swapLimitForTier(tier: MembershipTier): number | null {
  switch (tier) {
    case "free":
      return 0;
    case "premium":
      return 3;
    case "pro":
      return 6;
    case "coaching":
      return 3; // same as premium, but with human coach
    default:
      return 0;
  }
}

/**
 * Count today's EVO chat dispatches from the tamper-proof usage ledger.
 * (evo_chat_usage — server-written only; see migration 0022.)
 */
export async function countTodayChatUsage(userId: string): Promise<number> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count, error } = await supabaseAdmin
    .from("evo_chat_usage" as any)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", todayStart.toISOString());
  if (error) {
    console.error("[tier-limits] countTodayChatUsage error:", error.message);
    return 0; // fail open on counting errors — don't block users on infra issues
  }
  return count ?? 0;
}

/**
 * Insert one ledger row BEFORE dispatching an AI chat request.
 * Record-before-dispatch means concurrent burst requests all see the
 * incremented count, so N parallel calls can't slip past the limit.
 * Errors are logged but not thrown — a failed insert must not break chat;
 * the weekly/other soft limits behave the same way.
 */
export async function recordEvoChatUsage(
  userId: string,
  source = "chat",
): Promise<void> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return;
  const { error } = await supabaseAdmin
    .from("evo_chat_usage" as any)
    .insert({ user_id: userId, source });
  if (error) {
    console.error("[tier-limits] recordEvoChatUsage error:", error.message);
  }
}

/**
 * Count this week's swaps for a user (per type).
 * Uses the plan_swaps table (server-side, Monday-anchored week).
 */
async function countThisWeekSwaps(
  userId: string,
  swapType: "meal" | "exercise",
): Promise<number> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return 0;
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const { count, error } = await supabaseAdmin
    .from("plan_swaps" as any)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("swap_type", swapType)
    .gte("created_at", weekStart.toISOString());
  if (error) {
    console.error("[tier-limits] countThisWeekSwaps error:", error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Check if a user can send another EVO chat message.
 *
 * @param userId   Verified profile id (never trust body-supplied ids).
 * @param tierHint Pre-computed membership tier from getAuthUser()
 *                 (active + expiry filtered). When omitted, falls back to
 *                 an admin-client DB lookup.
 */
export async function checkEvoChatLimit(
  userId: string,
  tierHint?: string | null,
): Promise<{
  allowed: boolean;
  used: number;
  limit: number | null;
  unlimited: boolean;
}> {
  const tier =
    sanitizeTier(tierHint) ?? (await resolveTierFromDb(userId));
  const limit = evoChatLimitFor(tier);
  if (limit === null) {
    return { allowed: true, used: 0, limit: null, unlimited: true };
  }
  const used = await countTodayChatUsage(userId);
  return {
    allowed: used < limit,
    used,
    limit,
    unlimited: false,
  };
}

/**
 * Check if a user can perform another swap.
 * Returns { allowed, used, limit, unlimited }.
 *
 * Also records the swap in plan_swaps if allowed (server-side check +
 * insert).
 *
 * @param tierHint Same contract as checkEvoChatLimit.
 */
export async function checkAndRecordSwap(
  userId: string,
  swapType: "meal" | "exercise",
  tierHint?: string | null,
): Promise<{
  allowed: boolean;
  used: number;
  limit: number | null;
  unlimited: boolean;
}> {
  const tier = sanitizeTier(tierHint) ?? (await resolveTierFromDb(userId));
  const limit = swapLimitForTier(tier);

  if (limit === null) {
    // Unlimited — still record the swap for analytics
    await recordSwap(userId, swapType);
    return { allowed: true, used: 0, limit: null, unlimited: true };
  }

  if (limit === 0) {
    return { allowed: false, used: 0, limit: 0, unlimited: false };
  }

  const used = await countThisWeekSwaps(userId, swapType);
  if (used >= limit) {
    return { allowed: false, used, limit, unlimited: false };
  }

  // Record the swap (atomic — the count above + this insert could race,
  // but the weekly limit is soft; a 1-off overage is acceptable)
  await recordSwap(userId, swapType);
  return { allowed: true, used: used + 1, limit, unlimited: false };
}

/**
 * Record a swap in the plan_swaps table.
 */
async function recordSwap(
  userId: string,
  swapType: "meal" | "exercise",
): Promise<void> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return;
  const { error } = await supabaseAdmin
    .from("plan_swaps" as any)
    .insert({
      user_id: userId,
      plan_id: "api-swap", // no specific plan when swapping via API
      swap_type: swapType,
    });
  if (error) {
    console.error("[tier-limits] recordSwap error:", error.message);
  }
}
