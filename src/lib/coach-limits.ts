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
 *  - Coach AI plan generation draws from the CLIENT's ONE plan balance
 *    (owner decrees 2026-09-01 + 2026-09-02): weekly cap 1+1 (Pro 2+2,
 *    Monday-anchored UTC) + monthly total 4+4 (Pro 8+8, resets on the
 *    1st) — the same pool the member's EVO chat spends from. The old
 *    separate coach-side 4/4 cap (COACH_AI_PLAN_LIMIT, 0034) was REMOVED
 *    — it double-capped the same pool and contradicted the one-balance
 *    law for Pro clients. EDITING plans (per-meal/per-exercise
 *    regenerate, content edits) and MANUAL plan uploads are UNLIMITED by
 *    owner decree.
 *  - Site clients keep the exact same tier limits as before — nothing
 *    changes on the client side.
 *  - CURRENCY (owner decree 2026-08-30: «التسعير يكون كله بالدولار
 *    لكامل الموقع لأن الموقع عالمى وغير محدد لمصر — مثلا ٣٠٠ جنيه
 *    تصبح ٦ دولار»): EVERY platform-side money figure is USD at the
 *    owner's fixed rate 50 EGP = $1. The wallet ledger, the per-client
 *    packages, the ad packages and every UI label are USD-only.
 *    (Migration 0038 renames coach_ads.price_egp → price_usd, flips all
 *    stored currency values to 'USD' and converts existing EGP amounts
 *    at ÷50 once.)
 */

/* ------------------------------------------------------------------ */
/* OWNER PRICING (2026-08-30 decrees:                                  */
/* «اسعار المدربين لكل عميل ٣٠٠ الشهر / ٨٠٠ ٣ شهور» + «التسعير كله     */
/* بالدولار — ٣٠٠ جنيه تصبح ٦ دولار»)                                  */
/* The per-client fee the coach pays THE SITE is PACKAGE-based, in USD */
/* (rate 50 EGP = $1): 1 client-month = $6, 3 client-months = $16.     */
/* Single source of truth for BOTH the server debit math               */
/* (/api/coach/subscriptions/activate) and the coach-facing UI.        */
/* ------------------------------------------------------------------ */

export const COACH_CLIENT_PACKAGES: ReadonlyArray<{
  months: number;
  priceUsd: number;
}> = [
  { months: 1, priceUsd: 6 },
  { months: 3, priceUsd: 16 },
];

/**
 * Activation cost for a given duration (USD). Package prices ALWAYS win
 * for 1 and 3 months (owner decree — coach_fees.fee_per_client can no
 * longer undercut them). Any other duration (e.g. legacy 12-month
 * activations) stays linear on the coach's monthly base: his admin-set
 * fee_per_client if one exists, otherwise the $6 monthly rate.
 */
export function coachActivationCostUsd(
  months: number,
  feePerClient = 0,
): number {
  const pkg = COACH_CLIENT_PACKAGES.find((p) => p.months === months);
  if (pkg) return pkg.priceUsd;
  const monthly = feePerClient > 0 ? feePerClient : COACH_CLIENT_PACKAGES[0].priceUsd;
  return Math.round(monthly * months * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* «أعلن معنا» — COACH AD PACKAGES (fixed-duration, fixed-price,       */
/* paid from the wallet — same fixed-price law, never percentage).     */
/* ⚠️ OWNER TUNABLE: adjust prices here only — server debit + UI +     */
/* homepage featured strip all read these constants.                   */
/* ------------------------------------------------------------------ */

export const COACH_AD_PACKAGES: ReadonlyArray<{
  id: string;
  days: number;
  priceUsd: number;
  ar: string;
  en: string;
}> = [
  { id: "week", days: 7, priceUsd: 2, ar: "أسبوع", en: "1 week" },
  { id: "month", days: 30, priceUsd: 7, ar: "شهر", en: "1 month" },
  { id: "quarter", days: 90, priceUsd: 18, ar: "٣ شهور", en: "3 months" },
];

export type CoachAdPackage = (typeof COACH_AD_PACKAGES)[number];

export function coachAdPackageById(id: unknown): CoachAdPackage | null {
  return COACH_AD_PACKAGES.find((p) => p.id === id) ?? null;
}

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
  instapay: { value: "alkemos@instapay", qr: "/qr-instapay.png" },
  vodafone_cash: { value: "01000000000", qr: "/qr-vodafone.png" },
  paypal: { value: "https://paypal.me/alkemos", link: "https://paypal.me/alkemos" },
};

/** Wallet ledger kinds (mirrors 0035 coach_wallet_transactions.kind). */
export type CoachWalletKind = "topup" | "activation" | "adjust";

/* ------------------------------------------------------------------ */
/* PAYPAL AUTOMATED TOP-UP (0035 phase 2 — owner directive:            */
/* «PayPal معمول ربط بـ API وويب هوك — نضيف دفع المدربين ويفعل بعد     */
/*  الدفع الناجح ويضاف الرصيد لمحفظة المدرب»)                          */
/* ------------------------------------------------------------------ */

/**
 * Minimum PayPal charge in USD (protects against dust top-ups).
 * The wallet ledger is USD (owner global-currency decree), so PayPal
 * charges are 1:1 — the coach types a USD amount and pays exactly it.
 */
export const PAYPAL_TOPUP_MIN_USD = 0.5;
