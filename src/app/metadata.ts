import type { Metadata, Viewport } from "next";

/**
 * Site-wide metadata for Alkemos.
 *
 * English is the PRIMARY language (targeting English-speaking audience).
 * Arabic is secondary (supported via language toggle).
 *
 * Strategy: Position Alkemos as a comprehensive sports & wellness platform
 * (not just a coaching site). Keywords cover all platform features:
 * exercises, programs, tools, food library, blog.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://alkemos.com'),
  title: "Alkemos — Comprehensive Sports Platform | Exercises, Programs, Calculators & Nutrition",
  // Phase 117 completion (owner directive 2026-09-04): meta description
  // shortened to 150-160 chars (157) with a clear CTA — the previous
  // 245-char version had no call to action and got truncated by search
  // engines. The OG/Twitter descriptions stay longer-by-design (they
  // target social-card surfaces, not SERP snippets).
  description:
    "Alkemos — the complete digital training platform: 868+ exercises, 8,830+ foods, ready programs, free calculators, and the EVO AI coach. Start free today!",
  keywords: [
    // Platform-level keywords (primary, English)
    "sports platform",
    "exercise library",
    "workout programs",
    "fitness calculators",
    "calorie calculator",
    "BMI calculator",
    "macro calculator",
    "body fat calculator",
    "food database",
    "nutrition database",
    "fitness blog",
    "free fitness tools",
    // Exercise-related
    "chest exercises",
    "back exercises",
    "leg exercises",
    "shoulder exercises",
    "bicep exercises",
    "tricep exercises",
    "core exercises",
    "cardio exercises",
    "gym programs",
    "home workouts",
    "bodyweight exercises",
    // Food-related
    "food calories",
    "food macros",
    "grams calculator",
    "protein foods",
    // Coaching (secondary — one feature among many)
    "online coaching",
    "nutrition coaching",
    "personalized meal plans",
    "custom workout programs",
    // EVO (AI coach)
    "EVO AI coach",
    "AI fitness coach",
    "smart fitness assistant",
    // Arabic keywords (secondary)
    "منصة رياضية",
    "مكتبة تمارين",
    "برامج تدريب",
    "حاسبات لياقة",
    "كوتشينج أونلاين",
    "تغذية رياضية",
    // Brand
    "Alkemos",
  ],
  authors: [{ name: "Alkemos" }],
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
    title: "Alkemos",
  },
  openGraph: {
    title: "Alkemos — Comprehensive Sports Platform",
    description:
      "868+ exercises, workout programs, free fitness calculators, food database, fitness blog, and online coaching. Everything you need for your fitness journey in one place.",
    type: "website",
    siteName: "Alkemos",
    locale: "en_US",
    url: "https://alkemos.com",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Alkemos — Comprehensive Sports Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alkemos — Comprehensive Sports Platform",
    description:
      "Exercises, workout programs, fitness calculators, food database, fitness blog, and online coaching.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "v9YnsQ7PMp5EsTOxG9ysrAvWWoWNn0sjzDEJh6Lb7fs",
  },
  // FULL-SITE AUDIT FIX (2026-08-30): the previous alternates block
  // (canonical: homepage + languages en-US/ar-EG) was inherited by EVERY
  // page without its own metadata — /about, /contact, /meal-planner,
  // /privacy, /terms all declared canonical = homepage, telling Google
  // they were duplicates of "/" (deindexing risk). The inherited
  // ar-EG→/ar hreflang also falsely claimed the AR HOMEPAGE was the AR
  // twin of every such page. And the en-US/ar-EG codes conflicted with
  // the en/ar codes every per-page layout declares (mixed codes make
  // Google distrust the whole hreflang cluster).
  //
  // Rule now enforced site-wide: the ROOT metadata declares NO
  // alternates. Each indexable page owns its canonical/hreflang:
  //   - Homepage pair: src/app/(home)/layout.tsx
  //   - Mirror pages:   per-page metadata (homepage AR mirror + Task 3)
  //   - Bilingual one-URL pages (faq, for-coaches): self-canonical in
  //     their own layouts/pages
  //   - Noindex pages (auth, checkout, profile, (app), admin): need no
  //     canonical at all
  category: "Health & Fitness",
};

export const viewport: Viewport = {
  themeColor: "#0071e3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
