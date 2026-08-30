import type { Metadata } from "next";
import { StaticPageView } from "@/components/views/StaticPageView";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * FULL-SITE AUDIT FIX (2026-08-30): this page previously had no metadata
 * and INHERITED the root canonical (= homepage), telling Google it was a
 * duplicate of "/". Now it owns its identity (title/description/canonical).
 * No hreflang: no /ar mirror exists for this page.
 */
export const metadata: Metadata = {
  title: "Terms & Conditions | Musclehubeg — Rules of Using the Platform",
  description:
    "The official terms for using Musclehubeg: accounts and eligibility, memberships and billing, payments and refunds, acceptable use, health disclaimer, and liability limits.",
  alternates: {
    canonical: "/terms",
  },
};

export default function Page() {
 return <StaticPageView page="terms" />;
}
