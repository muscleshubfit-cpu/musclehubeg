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
  title: "Privacy Policy | Musclehubeg — How We Protect Your Data",
  description:
    "How Musclehubeg collects, uses, and protects your personal data: account details, health metrics, cookies, third-party services, and your rights over your information.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function Page() {
 return <StaticPageView page="privacy" />;
}
