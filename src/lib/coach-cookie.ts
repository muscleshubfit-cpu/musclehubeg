"use client";

/**
 * Coach-attribution cookie — mirrors the referral cookie pattern.
 *
 * When a visitor arrives at /auth?coach={slug} (the signup CTA on a
 * coach's landing page /coaches/{slug}), we store the slug in a 30-day
 * cookie so the attribution survives:
 *   - the email signup round (also passed as signup metadata directly,
 *     which is what the 0033 trigger reads — the cookie is the backup)
 *   - the Google OAuth round-trip (metadata is impossible there, so the
 *     CoachSlugClaimer component claims the assignment on first
 *     authenticated load via POST /api/coach/claim).
 */

export const COACH_SLUG_COOKIE_NAME = "mh_coach_slug";
const COOKIE_DAYS = 30;

export function setCoachSlugCookie(slug: string): void {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setDate(expires.getDate() + COOKIE_DAYS);
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? ";Secure"
      : "";
  document.cookie = `${COACH_SLUG_COOKIE_NAME}=${encodeURIComponent(slug)};expires=${expires.toUTCString()};path=/;SameSite=Lax;max-age=${COOKIE_DAYS * 86400}${secure}`;
}

export function getCoachSlugCookie(): string | null {
  if (typeof document === "undefined") return null;
  for (const cookie of document.cookie.split(";")) {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name === COACH_SLUG_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return null;
}

export function clearCoachSlugCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COACH_SLUG_COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;max-age=0`;
}
