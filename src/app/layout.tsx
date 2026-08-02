import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Ahmed Zake — Online Nutrition & Fitness Coaching",
  description:
    "Custom meal plans, workout programs, weekly progress tracking and 1-on-1 coaching with Ahmed Zake.",
  keywords: [
    "Ahmed Zake",
    "nutrition coaching",
    "fitness coaching",
    "meal plans",
    "workout plans",
    "online coaching Egypt",
    "تغذية",
    "تمارين",
    "كوتش",
  ],
  authors: [{ name: "Ahmed Zake" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MuscleHubEG",
  },
  openGraph: {
    title: "Ahmed Zake — Online Nutrition & Fitness Coaching",
    description:
      "Build the body you deserve with personalized coaching by Ahmed Zake.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ahmed Zake — Online Coaching",
    description: "Build the body you deserve with personalized coaching.",
  },
};

export const viewport: Viewport = {
  themeColor: "#1F8FFF",
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
      <head>
        {GA_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors />
        {/* PWA Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('[PWA] Service Worker registered');
                  }).catch(function(e) {
                    console.warn('[PWA] SW registration failed:', e);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
