import type { Metadata } from "next";

/**
 * Server-component layout for /auth/* (login, signup, callback).
 *
 * Auth pages are not for indexing — they are transactional entry points.
 * The page.tsx is a client component (uses useAuth/useEffect), so this
 * layout owns the noindex metadata.
 *
 * Routes covered:
 *   /auth, /auth/callback
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
