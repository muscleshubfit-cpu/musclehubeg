import type { Metadata } from "next";
import { ContactView } from "@/components/views/ContactView";

/**
 * FULL-SITE AUDIT FIX (2026-08-30): this page previously had no metadata
 * and INHERITED the root canonical (= homepage), telling Google it was a
 * duplicate of "/". Now it owns its identity (title/description/canonical).
 * No hreflang: no /ar mirror exists for this page.
 */
export const metadata: Metadata = {
  title: "Contact Us | Musclehubeg — Support, Feedback & Partnerships",
  description:
    "Reach the Musclehubeg team: technical support, account and payment questions, feedback, or partnership requests. Send us a message and we usually reply within 24 hours.",
  alternates: {
    canonical: "/contact",
  },
};

export default function Page() {
 return <ContactView />;
}
