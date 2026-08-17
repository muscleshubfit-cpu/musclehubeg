"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * AdSense Ad Component
 *
 * Displays a Google AdSense ad unit. Only renders on the client side
 * (AdSense requires JavaScript execution).
 *
 * Ads are AUTOMATICALLY suppressed on authenticated routes (dashboard,
 * admin, profile, checkout, etc.) — both to comply with AdSense program
 * policies (no ads on pages behind login walls) and to keep the
 * authenticated UX clean.
 *
 * Usage:
 *   <AdSenseAd slot="1234567890" format="auto" />
 *
 * Props:
 *   slot: The ad slot ID from your AdSense dashboard
 *   format: "auto" (default), "horizontal", "vertical", "rectangle"
 *   className: Additional CSS classes
 *   responsive: true (default) — makes the ad responsive
 */

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

// Routes where ads should NOT be shown:
//   - Authenticated member routes (AdSense policy: no ads behind login)
//   - Admin routes
//   - Checkout + auth flows
const AD_FREE_ROUTE_PREFIXES = [
  "/dashboard",
  "/admin",
  "/profile",
  "/checkout",
  "/auth",
  "/coach",
  "/plans",
  "/progress",
  "/questionnaires",
  "/referral",
  "/support",
  "/chat",
];

export function AdSenseAd({
  slot,
  format = "auto",
  className = "",
  responsive = true,
}: {
  slot?: string;
  format?: string;
  className?: string;
  responsive?: boolean;
}) {
  const adRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "";

  // Publisher ID from env var — falls back to hardcoded value if env
  // isn't set (so the component keeps working during the migration
  // window before env vars are configured in Vercel).
  const adClient =
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-8658364692422583";

  // Suppress ads on authenticated routes
  const isAdFreeRoute = AD_FREE_ROUTE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  if (isAdFreeRoute) {
    return null;
  }

  // Suppress if env var explicitly not set
  if (!process.env.NEXT_PUBLIC_ADSENSE_CLIENT) {
    return null;
  }

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      // AdSense not loaded yet — silently fail
    }
  }, []);

  return (
    <div ref={adRef} className={`my-8 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adClient}
        data-ad-slot={slot || ""}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
