import type { Metadata, Viewport } from "next";

/**
 * Site-wide metadata for MuscleHub.
 *
 * English is the PRIMARY language (targeting English-speaking audience).
 * Arabic is secondary (supported via language toggle).
 *
 * Strategy: Position MuscleHub as a comprehensive sports & wellness platform
 * (not just a coaching site). Keywords cover all platform features:
 * exercises, programs, tools, food library, blog.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://musclehubeg.vercel.app'),
  title: "MuscleHub — Comprehensive Sports Platform | Exercises, Programs, Calculators & Nutrition",
  description:
    "MuscleHub is a comprehensive sports platform: 547+ exercise library, ready workout programs, free fitness calculators (calories, BMI, macros), food database with nutrition info, fitness blog, and online coaching with nutrition specialists.",
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
    "MuscleHub",
  ],
  authors: [{ name: "MuscleHub" }],
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
    title: "MuscleHub — Comprehensive Sports Platform",
    description:
      "547+ exercises, workout programs, free fitness calculators, food database, fitness blog, and online coaching. Everything you need for your fitness journey in one place.",
    type: "website",
    siteName: "MuscleHub",
    locale: "en_US",
    url: "https://musclehubeg.vercel.app",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "MuscleHub — Comprehensive Sports Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MuscleHub — Comprehensive Sports Platform",
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
  alternates: {
    canonical: "https://musclehubeg.vercel.app",
    languages: {
      "en-US": "https://musclehubeg.vercel.app",
      "ar-EG": "https://musclehubeg.vercel.app/ar",
    },
  },
  category: "Health & Fitness",
};

export const viewport: Viewport = {
  themeColor: "#0071e3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
