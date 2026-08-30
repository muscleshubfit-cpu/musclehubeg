import type { Metadata } from "next";
import { StaticPageView } from "@/components/views/StaticPageView";

/**
 * FULL-SITE AUDIT FIX (2026-08-30): this page previously had no metadata
 * and INHERITED the root canonical (= homepage), telling Google it was a
 * duplicate of "/". Now it owns its identity (title/description/canonical).
 * AR EXPANSION (same day): /ar/about mirror built → the hreflang pair now
 * declares the real Arabic twin instead of nothing.
 */
export const metadata: Metadata = {
  title: "About Musclehubeg — Our Mission, Story & Team",
  description:
    "Musclehubeg is an Egyptian sports platform with an 868+ exercise library, ready workout programs, free fitness calculators, a food database, the EVO AI coach, and online coaching — our mission is to make expert-level fitness accessible to everyone.",
  alternates: {
    canonical: "/about",
    languages: {
      en: "https://musclehubeg.vercel.app/about",
      ar: "https://musclehubeg.vercel.app/ar/about",
      "x-default": "https://musclehubeg.vercel.app/about",
    },
  },
};

export default function Page() {
  return <StaticPageView page="about" />;
}
