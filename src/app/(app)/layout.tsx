import type { Metadata } from "next";
import { AuthGate } from "./auth-gate";

/**
 * Server-component layout for all authenticated routes (dashboard, plans,
 * progress, chat, support, referral, coach/*, questionnaires).
 *
 * Exports `metadata` with `noindex, nofollow` so Google does not index any
 * page under this layout. The auth gate (client component) is rendered as
 * the body — keeping the auth logic intact while allowing this server
 * component to own the metadata.
 *
 * Routes covered (one metadata for all — minimal change):
 *   /dashboard, /plans, /progress, /chat, /support, /referral,
 *   /coach/*, /questionnaires
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate>{children}</AuthGate>;
}
