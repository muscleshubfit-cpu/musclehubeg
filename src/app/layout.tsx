import { Suspense } from "react";
import Script from "next/script";
import { cookies, headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/hooks/use-auth";
import { ReferralCookieChecker } from "@/components/ReferralCookieChecker";
import { CoachSlugClaimer } from "@/components/CoachSlugClaimer";
import { CookieConsent } from "@/components/CookieConsent";
import { EvoChatProvider } from "@/lib/evo-chat-context";
import { EvoFloatingWidget } from "@/components/EvoFloatingWidget";
import { getOrganizationSchema, getWebSiteSchema } from "@/lib/seo";
import { metadata, viewport } from "./metadata";

export { metadata, viewport };

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";

// Site-wide structured data (JSON-LD) — injected on every page
const organizationSchema = getOrganizationSchema();
const websiteSchema = getWebSiteSchema();

/**
 * SEO locale law (2026-09-01): a URL is Arabic ONLY when it is exactly
 * `/ar` or inside the `/ar/` route subtree. A loose `startsWith("/ar")`
 * would misclassify any future route whose path merely BEGINS with the
 * letters "ar" (e.g. /archive, /articles) as Arabic — rendering
 * `lang="ar" dir="rtl"` markup on an English page. Both the middleware
 * (`src/middleware.ts`) and this resolver share the same predicate so
 * the `<html lang dir>` attributes, the `Content-Language` header and
 * the `mhe:locale` cookie can never disagree about the current route.
 */
function isArabicPath(pathname: string): boolean {
  return pathname === "/ar" || pathname.startsWith("/ar/");
}

/**
 * Resolve the locale for the root <html lang dir> attributes.
 *
 * DYNAMIC — derived from the CURRENT route's locale (the `/ar/*` URL
 * prefix), never hardcoded: Googlebot always sees `lang="ar" dir="rtl"
 * on Arabic routes and `lang="en" dir="ltr"` on English ones.
 *
 * Precedence (enforced here, NOT in middleware):
 *   1. URL pathname — `/ar/...` → `ar` (cookie can NOT override this)
 *   2. `mhe:locale` cookie — ONLY when the `x-pathname` header is
 *      missing (middleware didn't run — edge case). Previously the
 *      cookie was trusted on every English path, but the cookie always
 *      lags one request behind (it is written by the PREVIOUS
 *      response): navigating /ar → / served `lang="ar"` markup for the
 *      ENGLISH url. Demoting the fallback to missing-pathname-only
 *      kills that stale-cookie cross-contamination (homepage AR mirror
 *      fix, 2026-08-30).
 *   3. Default `en`
 *
 * The middleware writes `mhe:locale` on every request to match the
 * pathname, so for `/ar/*` the cookie is always `ar` too. We still
 * check pathname FIRST so a stale cookie can never override an Arabic
 * URL (defensive belt-and-suspenders).
 *
 * The pathname is read from the `x-pathname` header set by middleware
 * (see `src/middleware.ts`). The root layout cannot receive `params`
 * because it's the parent of all routes, not a dynamic segment — so
 * `headers().get('x-pathname')` is the cleanest server-side way to
 * know which URL the user requested.
 *
 * IMPORTANT: calling `cookies()` and `headers()` opts the root layout
 * into dynamic rendering. This is acceptable — see PROGRESS.md H1 fix
 * notes for the trade-off analysis.
 */
async function resolveLocale(): Promise<{ lang: "en" | "ar"; dir: "ltr" | "rtl" }> {
  // 1. Pathname — read from the `x-pathname` header set by middleware.
  //    This is the most reliable signal: the route's own locale ALWAYS
  //    wins (`/ar/*` → ar, everything else → en).
  const h = await headers();
  const pathname = h.get("x-pathname") || "";
  if (isArabicPath(pathname)) {
    return { lang: "ar", dir: "rtl" };
  }

  // 2. Cookie fallback — ONLY when middleware didn't run (no
  //    `x-pathname` header). Never trust it on a known English path:
  //    the cookie belongs to the PREVIOUS request and may still say
  //    `ar` right after navigating away from an /ar url.
  if (!pathname) {
    const c = await cookies();
    const cookieLocale = c.get("mhe:locale")?.value;
    if (cookieLocale === "ar") {
      return { lang: "ar", dir: "rtl" };
    }
  }
  // (cookie fallback only runs when middleware didn't execute — for every
  //  normal request the route pathname above decides the language)

  // 3. Default
  return { lang: "en", dir: "ltr" };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { lang, dir } = await resolveLocale();

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        {/* Google AdSense — only loaded when NEXT_PUBLIC_ADSENSE_CLIENT env
            var is set. Avoids loading AdSense on local dev or when the
            publisher hasn't been approved yet. */}
        {ADSENSE_CLIENT && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://randomuser.me" />
        <link rel="dns-prefetch" href="https://randomuser.me" />
        <link rel="preconnect" href="https://api.qrserver.com" />
        <link rel="dns-prefetch" href="https://api.qrserver.com" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://wger.de" />
        <link rel="dns-prefetch" href="https://wger.de" />
        {/* Structured data — Organization + WebSite (site-wide) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        <a href="#main-content-skip" className="sr-only-focusable">
          Skip to content
        </a>
        <ReferralCookieChecker />
        <CookieConsent />
        <I18nProvider urlLocale={lang}>
          <AuthProvider>
            {/* COACH ATTRIBUTION (0033) — claims a coach-signup cookie for
                Google OAuth clients (needs useAuth → inside AuthProvider). */}
            <CoachSlugClaimer />
            <EvoChatProvider>
              {/* C23 fix: wrap children in a div with id="main-content-skip"
                  so the skip-to-content link always has a target, on both
                  public pages (no <main id="main-content">) and app pages
                  (AppLayout has its own <main id="main-content">). */}
              <div id="main-content-skip">
                <Suspense fallback={null}>{children}</Suspense>
              </div>
              {/* EVO Floating Widget — appears on all pages */}
              <EvoFloatingWidget />
            </EvoChatProvider>
          </AuthProvider>
        </I18nProvider>
        <Toaster position="top-center" richColors />
        <Script id="pwa-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(reg) {
                  console.log('[PWA] Service Worker registered');
                }).catch(function(e) {
                  console.warn('[PWA] SW registration failed:', e);
                });
              });
            }
          `}
        </Script>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}

        {/* Vercel Analytics — pageview + custom event tracking.
            No-op in dev or when not deployed on Vercel. */}
        <Analytics />

        {/* Vercel Speed Insights — Core Web Vitals + LCP/CLS/INP tracking. */}
        <SpeedInsights />
      </body>
    </html>
  );
}
