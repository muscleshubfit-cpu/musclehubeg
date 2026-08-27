import type { Metadata } from "next";
import { AdminGate } from "./admin-gate";

/**
 * Server-component layout for /admin/* routes (blog CMS, referrals,
 * leads, saved-results).
 *
 * Exports `metadata` with `noindex, nofollow` so Google does not index any
 * page under /admin. The coach-only auth gate (client component) is rendered
 * as the body — keeping the auth logic intact while allowing this server
 * component to own the metadata.
 *
 * Routes covered:
 *   /admin/blog, /admin/referrals, /admin/leads, /admin/saved-results
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGate>{children}</AdminGate>;
}
