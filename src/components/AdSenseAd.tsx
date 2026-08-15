"use client";

import { useEffect, useRef } from "react";

/**
 * AdSense Ad Component
 *
 * Displays a Google AdSense ad unit. Only renders on the client side
 * (AdSense requires JavaScript execution).
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
        data-ad-client="ca-pub-8658364692422583"
        data-ad-slot={slot || ""}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
