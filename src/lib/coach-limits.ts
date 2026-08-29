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
 * PAYPAL (0035 phase 2): top-ups via PayPal are now AUTOMATED through
 * the existing PayPal API integration (create-order → capture-order →
 * coach_adjust_wallet) — see CoachWalletView's instant top-up rail.
 * `paypal.value/link` below is kept only as a display fallback; swap it
 * if the owner ever wants a manual paypal.me rail back.
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

/* ------------------------------------------------------------------ */
/* PAYPAL AUTOMATED TOP-UP (0035 phase 2 — owner directive:            */
/* «PayPal معمول ربط بـ API وويب هوك — نضيف دفع المدربين ويفعل بعد     */
/*  الدفع الناجح ويضاف الرصيد لمحفظة المدرب»)                          */
/* ------------------------------------------------------------------ */

/**
 * USD → EGP conversion used ONLY for PayPal wallet top-ups.
 * PayPal charges USD; the wallet ledger is EGP. SINGLE SOURCE OF TRUTH
 * for BOTH the server credit math (/api/paypal/capture-order) and the
 * client display (CoachWalletView) — keep both on this one constant.
 *
 * ⚠️ OWNER TUNABLE: update this number when the rate drifts. No fixed
 * prices by owner decree — the coach types his own top-up amount; this
 * is only the conversion rate for the USD charge.
 */
export const PAYPAL_USD_TO_EGP_RATE = 50;

/** Minimum PayPal charge in USD (protects against dust top-ups). */
export const PAYPAL_TOPUP_MIN_USD = 0.5;

/** Convert an EGP top-up amount into the USD PayPal charge (2 decimals). */
export function paypalUsdFromEgp(egpAmount: number): number {
  return Math.round((egpAmount / PAYPAL_USD_TO_EGP_RATE) * 100) / 100;
}
