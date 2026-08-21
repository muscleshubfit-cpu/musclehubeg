/**
 * Arabic nested layout.
 *
 * H1 fix (Option B): The root `<html lang dir>` attributes are now set
 * correctly on the server by `src/app/layout.tsx` (via `resolveLocale()`
 * reading the `x-pathname` header set by middleware). This means the
 * root `<html>` tag already has `lang="ar" dir="rtl"` for `/ar/*` routes
 * — making this `<div dir="rtl" lang="ar">` wrapper REDUNDANT for the
 * root HTML attributes.
 *
 * HOWEVER: the wrapper is intentionally RETAINED as a defensive
 * safety net for deeply-nested components that read `lang`/`dir` from
 * their immediate DOM ancestors (e.g. via `closest('[dir="rtl"]')`
 * or `parentElement.lang`). Removing it is safe in theory, but keeping
 * it costs nothing and protects against edge cases in third-party
 * libraries that may not correctly traverse up to `<html>`.
 *
 * If you want to remove this wrapper in the future, verify that:
 *   1. All Arabic CSS selectors that use `[dir="rtl"]` still work
 *      (they should — `[dir="rtl"]` matches `<html>` too).
 *   2. No third-party component reads `dir`/`lang` from a parent `<div>`
 *      instead of from `<html>`.
 *   3. Screen readers correctly announce the page language (they
 *      should — they read `<html lang>`).
 */
export default function ArLayout({ children }: { children: React.ReactNode }) {
  return <div dir="rtl" lang="ar">{children}</div>;
}
