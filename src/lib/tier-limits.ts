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
import { MEMBERSHIPS, getLimits, type MembershipTier } from "@/lib/memberships";

/** Plan-quota domain (mirrors EvoPlanDomain in evo-intent.ts). */
export type EvoPlanKind = "nutrition" | "workout";

const VALID_TIERS: MembershipTier[] = ["free", "premium", "pro", "coaching"];

function sanitizeTier(tier: unknown): MembershipTier | null {
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

    const tiers = subs.map((s) => sanitizeTier(s.tier)).filter(Boolean);
    if (tiers.includes("pro")) return "pro";
    if (tiers.includes("premium")) return "premium";
    if (tiers.includes("coaching")) return "coaching";
    return "free";
  } catch (e) {
    console.error("[tier-limits] resolveTierFromDb error:", e instanceof Error ? e.message : e);
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
  // Single source of truth = memberships.ts (evoSwapLimit).
  // Previously a hardcoded switch duplicated these numbers — the two could
  // drift apart from the advertised comparison table. They still agree
  // today (0/3/6/3); now they CANNOT diverge.
  return getLimits(tier).evoSwapLimit;
}

/**
 * MONTHLY plan-generation quota for a tier (T-AI-DEEP-AUDIT-V2, D4 fix).
 * Reads evoNutritionPlanLimit / evoWorkoutPlanLimit straight from
 * memberships.ts so the advertised numbers ARE the enforced numbers.
 *   free: 0/0 · premium: 4/4 · pro: 8/8 · coaching: 4/4
 * (owner decree 2026-09-02: 1+1 weekly, total 4+4 monthly — pro 2×)
 * Returns null = unlimited.
 */
export function planQuotaFor(tier: MembershipTier, kind: EvoPlanKind): number | null {
  const limits = getLimits(tier);
  return kind === "nutrition"
    ? limits.evoNutritionPlanLimit
    : limits.evoWorkoutPlanLimit;
}

/**
 * WEEKLY plan-generation cap for a tier (owner decree 2026-09-02:
 * «١+١ أسبوعية اجمالى ٤+٤ شهريا») — the monthly total no longer burns
 * all at once: at most 1 nutrition + 1 workout plan per week (Pro 2+2,
 * preserving the advertised 2× Premium ladder).
 * Returns null = unlimited.
 */
export function planWeeklyQuotaFor(tier: MembershipTier, kind: EvoPlanKind): number | null {
  const limits = getLimits(tier);
  return kind === "nutrition"
    ? limits.evoNutritionPlanWeeklyLimit
    : limits.evoWorkoutPlanWeeklyLimit;
}

/** UTC month start — "resets monthly" = resets on the 1st, UTC. */
export function monthStartUtc(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

/**
 * UTC week start — Monday 00:00 UTC (owner decree 2026-09-02 weekly plan
 * cap). Same Monday-anchored convention as the weekly swaps reset
 * («الرصيد يتصفّر يوم الاثنين»), so both weekly windows agree.
 */
export function weekStartUtc(now: Date = new Date()): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dow = d.getUTCDay(); // 0=Sun … 6=Sat
  const mondayOffset = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - mondayOffset);
  return d.toISOString();
}

/**
 * Count this month's plan generations for a user, from the SAME tamper-proof
 * ledger as chat usage — plan requests are recorded with source
 * `plan_nutrition` / `plan_workout` BEFORE dispatch (burst-safe).
 *
 * 2026-09-01 (owner: «توليد الخطط بيتحسب من الرصيد سواء عن طريق المدرب
 * او عن طريق ايفو») — this counts ONLY the EVO-self surface; the COACH
 * surface is added by countThisMonthCoachPlanJobs() and the two are
 * combined in countClientPlanUsage()/checkEvoPlanQuota() so the member's
 * advertised monthly plan balance is ONE pool regardless of who triggered
 * the generation.
 */
export async function countThisMonthPlanUsage(
  userId: string,
  kind: EvoPlanKind,
): Promise<number> {
  return countEvoPlanRowsSince(userId, kind, monthStartUtc());
}

/** EVO-self ledger rows since an arbitrary instant (shared by month/week). */
async function countEvoPlanRowsSince(
  userId: string,
  kind: EvoPlanKind,
  sinceIso: string,
): Promise<number> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return 0;
  const { count, error } = await supabaseAdmin
    .from("evo_chat_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("source", `plan_${kind}`)
    .gte("created_at", sinceIso);
  if (error) {
    console.error("[tier-limits] countEvoPlanRowsSince error:", error.message);
    return 0; // fail open on counting errors — soft quota, same as chat
  }
  return count ?? 0;
}

/**
 * Count this month's COMPLETED coach-side AI plan generations for a client
 * (ai_jobs: job_type = plan_nutrition | plan_workout, status = 'done',
 * payload->>'clientId' = this client, any requester — coach or admin).
 *
 * Owner decree 2026-09-01: coach-triggered generation burns the CLIENT's
 * monthly plan balance exactly like EVO-self generation. Done-only keeps
 * the existing "failed generations never burn quota" convention for the
 * async job path (the EVO path records before dispatch — interactive).
 */
export async function countThisMonthCoachPlanJobs(
  clientId: string,
  kind: EvoPlanKind,
): Promise<number> {
  return countCoachPlanJobsSince(clientId, kind, monthStartUtc());
}

/** Coach/admin done ai_jobs for this client since an arbitrary instant. */
async function countCoachPlanJobsSince(
  clientId: string,
  kind: EvoPlanKind,
  sinceIso: string,
): Promise<number> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return 0;
  const { count, error } = await supabaseAdmin
    .from("ai_jobs")
    .select("*", { count: "exact", head: true })
    .eq("job_type", `plan_${kind}`)
    .eq("status", "done")
    .eq("payload->>clientId", clientId)
    .gte("created_at", sinceIso);
  if (error) {
    console.error("[tier-limits] countCoachPlanJobsSince error:", error.message);
    return 0; // fail open — same soft-quota convention as above
  }
  return count ?? 0;
}

/**
 * THE client's monthly plan balance for one kind — EVO-self generations
 * (evo_chat_usage) + coach/admin AI generations for this client (ai_jobs).
 * Single source of truth for the check (chat + coach enqueue) AND the
 * display (/api/ai/quota widget + /api/coach/ai-usage readout), so the
 * meter the member sees always matches what enforcement deducts from.
 */
export async function countClientPlanUsage(
  clientId: string,
  kind: EvoPlanKind,
): Promise<number> {
  return countClientPlanUsageSince(clientId, kind, monthStartUtc());
}

/** Combined pool since an arbitrary instant (month → monthly total, week → weekly cap). */
export async function countClientPlanUsageSince(
  clientId: string,
  kind: EvoPlanKind,
  sinceIso: string,
): Promise<number> {
  const [evoUsed, coachUsed] = await Promise.all([
    countEvoPlanRowsSince(clientId, kind, sinceIso),
    countCoachPlanJobsSince(clientId, kind, sinceIso),
  ]);
  return evoUsed + coachUsed;
}

/** This week's combined plan usage (owner decree 2026-09-02 weekly cap). */
export async function countClientWeeklyPlanUsage(
  clientId: string,
  kind: EvoPlanKind,
): Promise<number> {
  return countClientPlanUsageSince(clientId, kind, weekStartUtc());
}

/**
 * Check the WEEKLY + MONTHLY plan-generation quota (D4 fix + owner
 * decree 2026-09-02: «١+١ أسبوعية اجمالى ٤+٤ شهريا بدلا من ٣+٣ شهريا»).
 *
 * 2026-09-01 (owner: «توليد الخطط بيتحسب من الرصيد سواء عن طريق المدرب
 * او عن طريق ايفو»): the advertised per-month numbers are ONE pool
 * per client — `used` combines EVO-self dispatches (evo_chat_usage) with
 * coach/admin AI generations for this client (done ai_jobs). The chat
 * passes the member's own id; the coach enqueue path uses
 * checkClientPlanQuota() below with the SAME combined counter.
 *
 * 2026-09-02: the monthly total alone no longer governs — a WEEKLY cap
 * (1+1, Pro 2+2, Monday-anchored UTC) must ALSO pass. `used`/`limit`
 * stay the MONTHLY pair (display compatibility); when the weekly cap is
 * the one that blocks, `blockedBy: "week"` + `weekly` carry the details.
 *
 * STAFF QUOTA SEMANTICS (2026-08-29): staffHint=true (role coach|admin)
 * bypasses the quota entirely — platform staff are never limited by
 * consumer tiers. Usage is still recorded for analytics.
 */
export async function checkEvoPlanQuota(
  userId: string,
  kind: EvoPlanKind,
  tierHint?: string | null,
  staffHint?: boolean,
): Promise<PlanQuotaVerdict> {
  if (staffHint) {
    return {
      allowed: true, used: 0, limit: null, unlimited: true,
      blockedBy: null, weekly: { used: 0, limit: null },
    };
  }
  const tier = sanitizeTier(tierHint) ?? (await resolveTierFromDb(userId));
  return enforcePlanQuota(userId, kind, tier);
}

/** Verdict shape shared by the chat path and the coach-enqueue path. */
export type PlanQuotaVerdict = {
  allowed: boolean;
  used: number; // monthly combined usage
  limit: number | null; // monthly total
  unlimited: boolean;
  blockedBy: "week" | "month" | null;
  weekly: { used: number; limit: number | null };
  tier?: MembershipTier;
};

/**
 * Core two-window enforcement: the MONTHLY total and the WEEKLY cap must
 * BOTH pass. Monthly is checked first so a fully-exhausted month reports
 * "month" even when the weekly numbers are also over.
 */
async function enforcePlanQuota(
  clientId: string,
  kind: EvoPlanKind,
  tier: MembershipTier,
): Promise<PlanQuotaVerdict> {
  const limit = planQuotaFor(tier, kind);
  const weeklyLimit = planWeeklyQuotaFor(tier, kind);
  if (limit === null && weeklyLimit === null) {
    return {
      allowed: true, used: 0, limit: null, unlimited: true,
      blockedBy: null, weekly: { used: 0, limit: null }, tier,
    };
  }
  if (limit === 0 || weeklyLimit === 0) {
    // free tier — no plan generation at all
    return {
      allowed: false, used: 0, limit: limit ?? 0, unlimited: false,
      blockedBy: "month", weekly: { used: 0, limit: weeklyLimit ?? 0 }, tier,
    };
  }
  const [used, weeklyUsed] = await Promise.all([
    limit === null ? Promise.resolve(0) : countClientPlanUsage(clientId, kind),
    weeklyLimit === null ? Promise.resolve(0) : countClientWeeklyPlanUsage(clientId, kind),
  ]);
  const blockedBy: "week" | "month" | null =
    limit !== null && used >= limit
      ? "month"
      : weeklyLimit !== null && weeklyUsed >= weeklyLimit
        ? "week"
        : null;
  return {
    allowed: blockedBy === null,
    used,
    limit,
    unlimited: false,
    blockedBy,
    weekly: { used: weeklyUsed, limit: weeklyLimit },
    tier,
  };
}

/**
 * Coach-enqueue-side check of the CLIENT's plan balance (owner decree
 * 2026-09-01). Mirrors checkEvoPlanQuota but ALWAYS resolves the tier
 * from the DB for the CLIENT (never the requesting coach) and never
 * staff-bypasses — the caller (api/ai/jobs) already scopes this block to
 * authRole === "coach", so admins keep their staff semantics upstream.
 * `used` is the SAME combined pool the member's widget displays.
 * 2026-09-02: the weekly cap (1+1 / Pro 2+2) is enforced here too.
 */
export async function checkClientPlanQuota(
  clientId: string,
  kind: EvoPlanKind,
): Promise<PlanQuotaVerdict & { tier: MembershipTier }> {
  const tier = await resolveTierFromDb(clientId);
  const verdict = await enforcePlanQuota(clientId, kind, tier);
  return { ...verdict, tier };
}

/* ------------------- Anonymous traffic ledger (D3 fix) -------------------
 * evo_chat_usage.user_id is a uuid FK to auth.users, so anonymous visitors
 * (no identity) could previously dispatch UNLIMITED chat calls and bleed
 * OpenRouter/Groq credits. Migration 0028 adds evo_anon_usage — same
 * tamper-proof design (server-writes only, no browser policies) keyed by
 * a SALTED SHA-256 of the client IP (no raw IPs stored). The free-tier
 * daily limit applies per anonymous client.
 * ---------------------------------------------------------------------- */

/** Count today's anonymous dispatches for one hashed client key. */
export async function countTodayAnonChatUsage(anonKey: string): Promise<number> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count, error } = await supabaseAdmin
    .from("evo_anon_usage")
    .select("*", { count: "exact", head: true })
    .eq("anon_key", anonKey)
    .gte("created_at", todayStart.toISOString());
  if (error) {
    console.error("[tier-limits] countTodayAnonChatUsage error:", error.message);
    return 0;
  }
  return count ?? 0;
}

/** Insert one anon ledger row BEFORE dispatching (record-before-dispatch). */
export async function recordAnonChatUsage(
  anonKey: string,
  source = "chat",
): Promise<void> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return;
  const { error } = await supabaseAdmin
    .from("evo_anon_usage")
    .insert({ anon_key: anonKey, source });
  if (error) {
    console.error("[tier-limits] recordAnonChatUsage error:", error.message);
  }
}

/** Anonymous visitors get the FREE tier daily limit (10/day). */
export async function checkAnonChatLimit(anonKey: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number | null;
  unlimited: boolean;
}> {
  const limit = evoChatLimitFor("free");
  const used = await countTodayAnonChatUsage(anonKey);
  return { allowed: used < (limit ?? 10), used, limit, unlimited: false };
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
    .from("evo_chat_usage")
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
    .from("evo_chat_usage")
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
 *
 * @param userId    Verified profile id (never trust body-supplied ids).
 * @param tierHint  Pre-computed membership tier from getAuthUser()
 *                  (active + expiry filtered). When omitted, falls back to
 *                  an admin-client DB lookup.
 * @param staffHint True when getAuthUser() resolved the caller as platform
 *                  staff (role coach|admin) — bypasses the limit entirely
 *                  (STAFF QUOTA SEMANTICS). Usage stays recorded.
 */
export async function checkEvoChatLimit(
  userId: string,
  tierHint?: string | null,
  staffHint?: boolean,
): Promise<{
  allowed: boolean;
  used: number;
  limit: number | null;
  unlimited: boolean;
}> {
  if (staffHint) {
    return { allowed: true, used: 0, limit: null, unlimited: true };
  }
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
 * @param staffHint True for platform staff (coach|admin) — bypasses the
 *                  weekly limit (STAFF QUOTA SEMANTICS); still recorded.
 */
export async function checkAndRecordSwap(
  userId: string,
  swapType: "meal" | "exercise",
  tierHint?: string | null,
  staffHint?: boolean,
): Promise<{
  allowed: boolean;
  used: number;
  limit: number | null;
  unlimited: boolean;
}> {
  if (staffHint) {
    await recordSwap(userId, swapType);
    return { allowed: true, used: 0, limit: null, unlimited: true };
  }
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
