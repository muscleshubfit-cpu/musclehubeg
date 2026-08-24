import type { Metadata } from "next";

/**
 * Server-component layout for /checkout.
 *
 * /checkout is a payment flow (sensitive) — must not be indexed.
 * The page.tsx is a client component (uses useAuth/useSearchParams), so
 * this layout owns the noindex metadata.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
