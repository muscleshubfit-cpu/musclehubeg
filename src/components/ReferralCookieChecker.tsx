"use client";

import { useEffect } from "react";
import { checkAndSetReferralCookie } from "@/lib/referral-cookie";

/** Checks URL for ?ref=CODE and sets a 30-day cookie */
export function ReferralCookieChecker() {
  useEffect(() => {
    checkAndSetReferralCookie();
  }, []);
  return null;
}
