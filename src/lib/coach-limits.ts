/**
 * Coach-side B2B limits + offline payment methods (0034) + WALLET (0035).
 *
 * OWNER MODEL (2026-08-29):
 *  - The coach brings his OWN clients and collects their payment OUTSIDE
 *    the site (cash / Vodafone Cash / InstaPay / bank transfer), then
 *    activates the subscription himself from the client's page.
 *  - BUT the coach pays THE SITE a monthly fixed fee per client
 *    (coach_fees.fee_per_client × months) from his WALLET (0035): he
 *    tops up via InstaPay / Vodafone Cash / PayPal, uploads the receipt,
 *    the admin reviews it and manually credits the wallet. Activation
 *    DEBITS the wallet — no balance, no activation (admins exempt).
 *  - Coach AI plan generation is capped PER CLIENT PER CALENDAR MONTH:
 *    4 nutrition + 4 workout plans (completed ai_jobs counted
 *    server-side, window = current UTC month). EDITING plans
 *    (per-meal/per-exercise regenerate, content edits) and MANUAL plan
 *    uploads are UNLIMITED by owner decree.
 *  - Site clients keep the exact same tier limits as before — nothing
 *    changes on the client side.
 */

/** Completed AI plan generations allowed per client, per kind, per month. */
export const COACH_AI_PLAN_LIMIT = 4;

/** UTC calendar-month window for the coach AI quota (resets on the 1st). */
export function coachAiMonthStartISO(now: Date = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

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

/* ------------------------------------------------------------------ */
/* WALLET TOP-UPS (0035) — the coach pays THE SITE                     */
/* ------------------------------------------------------------------ */

/** Methods a coach may use to top up his wallet (receipt + admin review). */
export type CoachTopupMethod = "instapay" | "vodafone_cash" | "paypal";

export const COACH_TOPUP_METHODS: Array<{
  id: CoachTopupMethod;
  ar: string;
  en: string;
}> = [
  { id: "instapay", ar: "انستاباي", en: "InstaPay" },
  { id: "vodafone_cash", ar: "فودافون كاش", en: "Vodafone Cash" },
  { id: "paypal", ar: "PayPal", en: "PayPal" },
];

export function isCoachTopupMethod(v: unknown): v is CoachTopupMethod {
  return (
    typeof v === "string" &&
    COACH_TOPUP_METHODS.some((m) => m.id === (v as CoachTopupMethod))
  );
}

export function coachTopupMethodLabel(
  method: string,
  lang: "ar" | "en",
): string {
  const m = COACH_TOPUP_METHODS.find((x) => x.id === method);
  if (!m) return method;
  return lang === "ar" ? m.ar : m.en;
}

/**
 * The SITE's own payment contacts, shown on the coach wallet page.
 * InstaPay/Vodafone values mirror the client checkout (CheckoutView).
 *
 * ⚠️ OWNER ACTION: `paypal.link` is a PLACEHOLDER — the owner asked for
 * "a new PayPal payment link" for wallet top-ups (no fixed prices).
 * Swap the value below when the owner provides the real link.
 */
export const SITE_PAYMENT_CONTACTS: Record<
  CoachTopupMethod,
  { value: string; qr?: string; link?: string }
> = {
  instapay: { value: "musclehub@instapay", qr: "/qr-instapay.png" },
  vodafone_cash: { value: "01000000000", qr: "/qr-vodafone.png" },
  paypal: { value: "https://paypal.me/musclehub", link: "https://paypal.me/musclehub" },
};

/** Wallet ledger kinds (mirrors 0035 coach_wallet_transactions.kind). */
export type CoachWalletKind = "topup" | "activation" | "adjust";
