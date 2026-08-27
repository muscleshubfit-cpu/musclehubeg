/**
 * EVO intent classification — pure + unit-tested.
 *
 * Extracted from /api/ai/chat during T-AI-DEEP-AUDIT-V2 (2026-08-28).
 * The old route had ONE flat `subscriberOnlyPatterns` list, which could
 * only answer "is this a subscriber feature?" — it could NOT distinguish
 * PLAN CREATION (monthly quota, evoNutritionPlanLimit / evoWorkoutPlanLimit)
 * from SWAP REQUESTS (weekly quota, enforced server-side by /api/ai/jobs).
 * Result: the advertised "3/6 plans per month" quotas were never enforced.
 *
 * This module classifies a message into:
 *   - isPlanCreation  → counts against the MONTHLY plan quota (per domain)
 *   - isSwapRequest   → conversational advice in chat; the structured swap
 *                       action goes through /api/ai/jobs (weekly quota)
 *   - isSubscriberOnly→ plan creation OR swap (the subscriber gate — SAME
 *                       coverage as the old flat list, no regression)
 *   - planDomain      → "nutrition" | "workout" (nutrition when food-ish
 *                       keywords dominate; workout is the default for
 *                       generic "plan/program/جدول" requests)
 */

export type EvoPlanDomain = "nutrition" | "workout";

/** Plan-creation intents — these consume the monthly plan quota. */
const PLAN_CREATION_PATTERNS: RegExp[] = [
  /\bmake\s+me\s+(a|an)?\s*(meal|workout|plan|diet|menu)/i,
  /\bgenerate\s+(a|an)?\s*(meal|workout|plan|diet|menu)/i,
  /\bcreate\s+(a|an)?\s*(meal|workout|plan|diet|menu)/i,
  /\bplan\s+(for|with)\s+\d+\s*(calorie|kcal|cal)/i,
  /\bmeal\s+(plan|with|for)\s+\d+/i,
  /\d+\s*(calorie|kcal|cal)\s*(meal|plan|diet)/i,
  /\bworkout\s+(plan|program|routine)\s*(for|with)/i,
  /اعمل\s+(وجبة|خطة|برنامج|جدول|دايت|مينو)/i,
  /صمم\s+(وجبة|خطة|برنامج|جدول)/i,
  /انشئ\s+(وجبة|خطة|برنامج|جدول)/i,
  /خطة\s+(تغذية|تمارين|دايت)\s+/i,
  /وجبة\s+\d+\s*سعر/i,
  /\d+\s*سعرة\s*(وجبة|خطة|مينو)/i,
];

/** Swap/regenerate intents — subscriber-only, but NOT monthly-quota'd. */
const SWAP_REQUEST_PATTERNS: RegExp[] = [
  /\bswap\s+(this|my|the)\s*(meal|food|exercise)/i,
  /بدّل\s+(وجبة|أكلة|تمرين)/i,
  /بديل\s+(وجبة|أكلة|تمرين)/i,
  /\bregenerate\s+(meal|plan|workout)/i,
  /أعد\s+(توليد|صناعة)\s*(وجبة|خطة)/i,
];

/** Food/nutrition keywords — decide the plan domain for quota accounting. */
const NUTRITION_HINT_RE =
  /meal|food|diet|nutrition|calorie|kcal|macro|menu|وجبة|أكل|اكل|تغذية|دايت|سعر|سعرة|كالوري|مينو/i;

export type EvoIntent = {
  /** Message asks EVO to CREATE a meal/workout plan → monthly quota. */
  isPlanCreation: boolean;
  /** Message asks for a swap/regeneration → subscriber-only, weekly flow. */
  isSwapRequest: boolean;
  /** The subscriber gate (plan creation OR swap) — same as the old flat list. */
  isSubscriberOnly: boolean;
  /** Quota domain — only meaningful when isPlanCreation is true. */
  planDomain: EvoPlanDomain;
};

export function classifyEvoIntent(message: string): EvoIntent {
  const isPlanCreation = PLAN_CREATION_PATTERNS.some((p) => p.test(message));
  const isSwapRequest = SWAP_REQUEST_PATTERNS.some((p) => p.test(message));
  const planDomain: EvoPlanDomain = NUTRITION_HINT_RE.test(message)
    ? "nutrition"
    : "workout";
  return {
    isPlanCreation,
    isSwapRequest,
    isSubscriberOnly: isPlanCreation || isSwapRequest,
    planDomain,
  };
}
