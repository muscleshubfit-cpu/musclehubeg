import MembershipsPage from "@/app/memberships/page";

/**
 * Arabic mirror of /memberships.
 *
 * Passes `lang="ar"` to force Arabic rendering, regardless of the user's
 * localStorage language preference. This matches the established pattern
 * used by `/ar/blog/page.tsx` → `<BlogListPage lang="ar" />`,
 * `/ar/exercises/page.tsx`, and `/ar/foods/page.tsx`.
 *
 * The page is wrapped by `src/app/ar/layout.tsx`'s `<div dir="rtl" lang="ar">`
 * for proper RTL rendering, and by `src/middleware.ts`'s `Content-Language:
 * ar-EG` header for crawler language attribution.
 */
export default function Page() {
  return <MembershipsPage lang="ar" />;
}
