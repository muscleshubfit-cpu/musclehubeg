/* eslint-disable @next/next/no-img-element -- local, fixed-dimension brand
   assets (QR-asset precedent): rendering a light+dark pair lets CSS pick the
   right one with ZERO hydration flicker (globals.css .theme-img-light/dark);
   next/image would double-preload both variants and cannot CSS-switch. */

import { cn } from "@/lib/utils";

/**
 * ThemeImg — Phase 126 «Marble & Chrome».
 * Renders the light + dark variants of a brand asset; CSS
 * ([data-theme="dark"]) shows the matching one. The dark <img> is
 * aria-hidden (the light one carries the alt text).
 */
export function ThemeImg({
  light,
  dark,
  alt,
  className,
  width,
  height,
  eager = false,
}: {
  light: string;
  dark: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
}) {
  const common = { width, height, decoding: "async" as const };
  return (
    <>
      <img
        src={light}
        alt={alt}
        className={cn("theme-img-light", className)}
        loading={eager ? "eager" : "lazy"}
        {...common}
      />
      <img
        src={dark}
        alt=""
        aria-hidden="true"
        className={cn("theme-img-dark", className)}
        loading="lazy"
        {...common}
      />
    </>
  );
}

/**
 * EngravedIcon — shorthand for the extracted engraved icon pair
 * (/images/brand/icons/<name>-light.webp / -dark.webp).
 */
export function EngravedIcon({
  name,
  alt,
  className,
  size = 48,
  eager = false,
}: {
  name: string;
  alt: string;
  className?: string;
  size?: number;
  eager?: boolean;
}) {
  return (
    <ThemeImg
      light={`/images/brand/icons/${name}-light.webp`}
      dark={`/images/brand/icons/${name}-dark.webp`}
      alt={alt}
      width={size}
      height={size}
      className={className}
      eager={eager}
    />
  );
}
