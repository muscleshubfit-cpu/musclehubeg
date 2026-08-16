import { Suspense } from "react";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/hooks/use-auth";
import { ReferralCookieChecker } from "@/components/ReferralCookieChecker";
import { CookieConsent } from "@/components/CookieConsent";
import { EvoChatProvider } from "@/lib/evo-chat-context";
import { EvoFloatingWidget } from "@/components/EvoFloatingWidget";
import { getOrganizationSchema, getWebSiteSchema } from "@/lib/seo";
import { metadata, viewport } from "./metadata";

export { metadata, viewport };

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

// Site-wide structured data (JSON-LD) — injected on every page
const organizationSchema = getOrganizationSchema();
const websiteSchema = getWebSiteSchema();

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8658364692422583"
          crossOrigin="anonymous"
        />
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
        <a href="#main-content" className="sr-only-focusable">
          Skip to content
        </a>
        <ReferralCookieChecker />
        <CookieConsent />
        <I18nProvider>
          <AuthProvider>
            <EvoChatProvider>
              <Suspense fallback={null}>{children}</Suspense>
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
      </body>
    </html>
  );
}
