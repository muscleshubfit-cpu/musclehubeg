/**
 * Safe redirect URL validation — prevents open-redirect attacks.
 *
 * Only allows same-origin relative paths (starting with "/" but not
 * "//" or "/\"). Rejects absolute URLs, protocol-relative URLs, and
 * backslash-based bypasses that browsers may normalize to external
 * domains.
 *
 * Usage:
 *   const target = safeNext(searchParams.get("next"));
 *   window.location.href = target;  // or NextResponse.redirect(origin + target)
 */

/**
 * Validates and sanitizes a `next` redirect parameter.
 * Returns a safe same-origin path, or "/" if the input is invalid.
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/";

  // Must start with "/" and not "//" or "/\" (protocol-relative or
  // backslash bypass that browsers may normalize to external URLs).
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/";
  }

  // Parse as URL relative to a dummy origin to extract pathname + search + hash.
  // This strips any attempt to embed an absolute URL after the "/".
  try {
    const u = new URL(raw, "https://placeholder.invalid");
    // If the origin changed, the input was an absolute URL — reject.
    if (u.origin !== "https://placeholder.invalid") return "/";
    return u.pathname + u.search + u.hash;
  } catch {
    return "/";
  }
}
