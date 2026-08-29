/**
 * Coach-side B2B limits + offline payment methods (0034).
 *
 * OWNER MODEL (2026-08-29):
 *  - The coach brings his OWN clients and collects their payment OUTSIDE
 *    the site (cash / Vodafone Cash / InstaPay / bank transfer), then
 *    activates the subscription himself from the client's page.
 *  - Coach AI plan generation is capped PER CLIENT: 4 nutrition + 4
 *    workout plans (completed ai_jobs counted server-side). EDITING
 *    plans (per-meal/per-exercise regenerate, content edits) and MANUAL
 *    plan uploads are UNLIMITED by owner decree.
 *  - Site clients keep the exact same tier limits as before — nothing
 *    changes on the client side.
 */

/** Completed AI plan generations allowed per client, per kind. */
export const COACH_AI_PLAN_LIMIT = 4;

export type CoachPaymentMethod =
  | "cash"
  | "vodafone_cash"
  | "instapay"
  | "bank_transfer"
  | "other";

export const COACH_PAYMENT_METHODS: Array<{
  id: CoachPaymentMethod;
  ar: string;
  en: string;
}> = [
  { id: "cash", ar: "كاش", en: "Cash" },
  { id: "vodafone_cash", ar: "فودافون كاش", en: "Vodafone Cash" },
  { id: "instapay", ar: "انستاباي", en: "InstaPay" },
  { id: "bank_transfer", ar: "تحويل بنكي", en: "Bank transfer" },
  { id: "other", ar: "أخرى", en: "Other" },
];

export function isCoachPaymentMethod(v: unknown): v is CoachPaymentMethod {
  return (
    typeof v === "string" &&
    COACH_PAYMENT_METHODS.some((m) => m.id === (v as CoachPaymentMethod))
  );
}

export function coachPaymentMethodLabel(
  method: string,
  lang: "ar" | "en",
): string {
  const m = COACH_PAYMENT_METHODS.find((x) => x.id === method);
  if (!m) return method;
  return lang === "ar" ? m.ar : m.en;
}

/** Tiers a coach may activate for a client (never free, never legacy). */
export const COACH_ACTIVATABLE_TIERS = ["premium", "pro", "coaching"] as const;
