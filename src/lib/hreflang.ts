/**
 * Shared hreflang alternates for all pages.
 * Used in layout.tsx / page.tsx metadata to declare EN + AR versions.
 *
 * Usage:
 *   import { HREFLANG_ALTERNATES } from "@/lib/hreflang";
 *   export const metadata = {
 *     alternates: HREFLANG_ALTERNATES("/about"),
 *   };
 */

const SITE_URL = "https://musclehubeg.vercel.app";

export function hreflangAlternates(path: string = "") {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return {
    canonical: `${SITE_URL}${cleanPath}`,
    languages: {
      "en": `${SITE_URL}${cleanPath}`,
      "ar": `${SITE_URL}/ar${cleanPath}`,
    },
  };
}
