/**
 * Password breach check via HaveIBeenPwned k-anonymity API.
 *
 * Only the first 5 hex chars of the SHA-1 hash leave the device — the raw
 * password never does. Free alternative to Supabase Pro's HIBP integration
 * (Phase 134: platform-level `password_hibp_enabled` is a paid feature).
 *
 * Fails OPEN on network/parse errors so signup availability is never gated
 * on a third-party API being up.
 */

async function sha1Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function passwordBreachCount(password: string): Promise<number> {
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const body = await res.text();
    for (const line of body.split("\n")) {
      const [suf, count] = line.trim().split(":");
      if (suf === suffix) return parseInt(count, 10) || 0;
    }
    return 0;
  } catch {
    return 0; // fail-open
  }
}
