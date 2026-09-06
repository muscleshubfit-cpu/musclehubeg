import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * CRON_SECRET verification with a CONSTANT-TIME comparison (audit M6,
 * 2026-09-07). All 8 cron routes previously compared the bearer token
 * with `!==`, a short-circuit string compare that leaks prefix match
 * timing to a network observer. Vercel Cron sends:
 *   Authorization: Bearer <CRON_SECRET>
 * Fail-closed: unset secret or any mismatch → false.
 */
export function verifyCronAuth(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const auth = request.headers.get("authorization") || "";
  const got = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  const a = Buffer.from(got, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    // Burn a comparable comparison so the mismatch branch costs the same
    // as the equal-length branch (no length oracle either).
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}
