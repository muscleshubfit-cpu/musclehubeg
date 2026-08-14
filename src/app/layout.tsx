import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/hooks/use-auth";
import { ReferralCookieChecker } from "@/components/ReferralCookieChecker";

export const metadata: Metadata = {
 title: "MuscleHub — AI-Powered Human Optimization Platform | Ahmed Zake",
 description:
 "MuscleHub combines real human coaching with AI intelligence (EVO) to optimize your nutrition, fitness, and performance. Personalized meal plans, adaptive workout programs, smart progress tracking, and 24/7 AI coaching. Start your transformation today.",
 keywords: [
 "MuscleHub",
 "Ahmed Zake",
 "AI fitness coach",
 "AI nutrition coach",
 "personalized meal plans",
 "custom workout programs",
 "online coaching Egypt",
 "AI human optimization",
 "EVO AI coach",
 "fitness transformation",
 "nutrition coaching platform",
 "progress tracking",
 "smart food swaps",
 "adaptive fitness plans",
 "كوتش أونلاين",
 "تغذية رياضية",
 "تمارين مخصصة",
 "ذكاء اصطناعي لياقة",
 ],
 authors: [{ name: "Ahmed Zake" }],
 manifest: "/manifest.json",
 icons: {
 icon: [
 { url: "/favicon.ico", sizes: "any" },
 { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
 { url: "/favicon.png", type: "image/png", sizes: "64x64" },
 ],
 apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
 },
 appleWebApp: {
 capable: true,
 statusBarStyle: "black-translucent",
 title: "MuscleHub",
 },
 openGraph: {
 title: "MuscleHub — Build a Stronger You with AI + Human Coaching",
 description:
 "Not just a fitness app. MuscleHub combines Coach Ahmed Zake's expertise with the EVO AI engine for personalized nutrition, adaptive workouts, and 24/7 intelligent monitoring.",
 type: "website",
 siteName: "MuscleHub",
 locale: "ar_EG",
 },
 twitter: {
 card: "summary_large_image",
 title: "MuscleHub — AI-Powered Human Optimization",
 description: "Build a stronger you with AI + human coaching. Personalized plans, smart tracking, 24/7 monitoring.",
 },
 robots: {
 index: true,
 follow: true,
 googleBot: {
 index: true,
 follow: true,
 "max-image-preview": "large",
 "max-snippet": -1,
 },
 },
 verification: {
 google: "v9YnsQ7PMp5EsTOxG9ysrAvWWoWNn0sjzDEJh6Lb7fs",
 },
};

export const viewport: Viewport = {
 themeColor: "#6366f1",
 width: "device-width",
 initialScale: 1,
 viewportFit: "cover",
};

// Google Analytics
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

export default function RootLayout({
 children,
}: Readonly<{ children: React.ReactNode }>) {
 return (
 <html lang="ar" dir="rtl" suppressHydrationWarning>
 <body className="antialiased bg-background text-foreground">
 {/* Skip-to-content link for keyboard/screen-reader users (WCAG 2.1) */}
 <a href="#main-content" className="sr-only-focusable">
 Skip to content
 </a>
 {/* Referral cookie checker — sets 30-day cookie when ?ref=CODE is in URL */}
 <ReferralCookieChecker />
 <I18nProvider>
 <AuthProvider>
 <Suspense fallback={null}>{children}</Suspense>
 </AuthProvider>
 </I18nProvider>
 <Toaster position="top-center" richColors />
 {/* PWA Service Worker Registration */}
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
 {/* Google Analytics */}
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
