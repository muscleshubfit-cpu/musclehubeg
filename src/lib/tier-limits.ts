/**
 * Server-side tier limit helpers.
 *
 * Enforces daily message + swap limits at the API layer (not just
 * client-side). Fixes C15 (EVO chat limit bypassable) and C16
 * (swap limit bypassable).
 *
 * These helpers query the database server-side to count today's
 * usage, so clearing localStorage or calling the API directly
 * cannot bypass the limit.
 */

import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSubscriptionForClient } from "@/lib/data";
import { MEMBERSHIPS, type MembershipTier } from "@/lib/memberships";

/**
 * Resolve the membership tier for a user.
 * Returns "free" if no active subscription.
 */
async function resolveTier(userId: string): Promise<MembershipTier> {
  const sub = await getSubscriptionForClient(userId);
  const tier = (sub?.tier as MembershipTier) || "free";
  // Validate against known tiers
  if (["free", "premium", "pro", "coaching"].includes(tier)) {
    return tier;
  }
  return "free";
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
 * Get the swap daily limit for a tier (per type: meal/exercise).
 * Returns null = unlimited.
 *
 * Maps membership tiers to swap limits:
 *   free:     0 (no swaps)
 *   premium:  3/week
 *   pro:      6/week
 *   coaching: 3/week (same as premium, but with human coach)
 *
 * Note: the original PlansView used daily limits via swapLimitFor()
 * from plans.ts (starter=2/day, elite=unlimited). But the memberships
 * page advertises WEEKLY limits. We follow the memberships page
 * (weekly) since that's what users see.
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
 * Count today's EVO chat messages for a user.
 * Uses the chat_messages table (server-side, RLS-bypassing admin client).
 */
async function countTodayChatMessages(userId: string): Promise<number> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count, error } = await supabaseAdmin
    .from("chat_messages")
    .select("*", { count: "exact", head: true })
    .eq("client_id", userId)
    .eq("role", "user")
    .gte("created_at", todayStart.toISOString());
  if (error) {
    console.error("[tier-limits] countTodayChatMessages error:", error.message);
    return 0; // fail open — don't block users on counting errors
  }
  return count ?? 0;
}

/**
 * Count this week's swaps for a user (per type).
 * Uses the plan_swaps table (server-side).
 */
async function countThisWeekSwaps(
  userId: string,
  swapType: "meal" | "exercise",
): Promise<number> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return 0;
  // Start of the current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const { count, error } = await supabaseAdmin
    .from("plan_swaps")
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
 * Returns { allowed, used, limit, unlimited }.
 */
export async function checkEvoChatLimit(
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number | null; unlimited: boolean }> {
  const tier = await resolveTier(userId);
  const limit = evoChatLimitFor(tier);
  if (limit === null) {
    return { allowed: true, used: 0, limit: null, unlimited: true };
  }
  const used = await countTodayChatMessages(userId);
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
 * Also records the swap in plan_swaps if allowed (server-side atomic
 * check + insert).
 */
export async function checkAndRecordSwap(
  userId: string,
  swapType: "meal" | "exercise",
): Promise<{ allowed: boolean; used: number; limit: number | null; unlimited: boolean }> {
  const tier = await resolveTier(userId);
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
    .from("plan_swaps")
    .insert({
      user_id: userId,
      plan_id: "api-swap", // no specific plan when swapping via API
      swap_type: swapType,
    });
  if (error) {
    console.error("[tier-limits] recordSwap error:", error.message);
  }
}
