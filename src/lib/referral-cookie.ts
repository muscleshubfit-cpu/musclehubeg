// @ts-nocheck
"use client";

import { REFERRAL_COOKIE_NAME, COOKIE_DURATION_DAYS } from "@/lib/referral";

/**
 * Referral cookie utilities — client-side.
 * Cookie duration: 30 days.
 *
 * When a visitor opens the site with ?ref=CODE in the URL,
 * we store the code in a cookie so it persists across sessions.
 * When they sign up, we read the cookie and track the referral.
 */

/**
 * Set the referral cookie when a visitor arrives with ?ref=CODE
 */
export function setReferralCookie(code: string): void {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setDate(expires.getDate() + COOKIE_DURATION_DAYS);
  document.cookie = `${REFERRAL_COOKIE_NAME}=${encodeURIComponent(code)};expires=${expires.toUTCString()};path=/;SameSite=Lax;max-age=${COOKIE_DURATION_DAYS * 86400}`;
}

/**
 * Get the referral code from the cookie (if present and not expired)
 */
export function getReferralCookie(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name === REFERRAL_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return null;
}

/**
 * Clear the referral cookie (after signup is complete)
 */
export function clearReferralCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${REFERRAL_COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;max-age=0`;
}

/**
 * Check URL for ?ref= param and set cookie if present.
 * Call this on every page load (in the layout or a provider).
 */
export function checkAndSetReferralCookie(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const ref = url.searchParams.get("ref");
  if (ref) {
    setReferralCookie(ref);
    // Clean the URL (remove ?ref= param)
    url.searchParams.delete("ref");
    window.history.replaceState({}, document.title, url.toString());
    return ref;
  }
  return null;
}
