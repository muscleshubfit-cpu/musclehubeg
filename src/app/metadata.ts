import type { Metadata, Viewport } from "next";

/**
 * Site-wide metadata for MuscleHub.
 *
 * Strategy: Position MuscleHub as a comprehensive sports & wellness platform
 * (not just a coaching site). Keywords cover all platform features:
 * exercises, programs, tools, food library, blog.
 *
 * Coaching is mentioned as ONE feature (not the main one) to ensure
 * coaching-related searches still find us.
 */
export const metadata: Metadata = {
  title: "MuscleHub — منصة رياضية شاملة | تمارين، برامج تدريب، حاسبات لياقة، وتغذية",
  description:
    "MuscleHub منصة رياضية شاملة: مكتبة تمارين احترافية، برامج تدريب جاهزة، حاسبات لياقة مجانية (سعرات، BMI، ماكروز)، مكتبة أكلات بالسعرات والماكروز، مدونة رياضية علمية، وكوتشينج أونلاين مع مدربين متخصصين.",
  keywords: [
    // Platform-level keywords (primary)
    "منصة رياضية",
    "مكتبة تمارين",
    "برامج تدريب",
    "حاسبات لياقة",
    "حاسبة سعرات",
    "حاسبة BMI",
    "حاسبة ماكروز",
    "مكتبة أكلات",
    "سعرات حرارية",
    "تغذية رياضية",
    "مدونة رياضية",
    "تمارين رياضية",
    // Exercise-related
    "تمارين صدر",
    "تمارين ظهر",
    "تمارين أرجل",
    "تمارين كارديو",
    "برامج جيم",
    "تمارين منزلية",
    // Food-related
    "أطعمة بالسعرات",
    "ماكروز الأكلات",
    "حاسبة جرامات",
    // English keywords
    "exercise library",
    "workout programs",
    "fitness calculators",
    "calorie calculator",
    "BMI calculator",
    "macro calculator",
    "food database",
    "nutrition database",
    "fitness blog",
    "free fitness tools",
    // Coaching (secondary — one feature among many)
    "كوتشينج أونلاين",
    "مدربين تغذية",
    "خطط تغذية مخصصة",
    // EVO (AI coach)
    "EVO AI coach",
    "كوتش ذكاء اصطناعي",
    "مساعد رياضي ذكي",
    "AI fitness coach",
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
    title: "MuscleHub — منصة رياضية شاملة | تمارين، برامج، حاسبات، وتغذية",
    description:
      "مكتبة تمارين احترافية، برامج تدريب جاهزة، حاسبات لياقة مجانية، مكتبة أكلات بالسعرات، مدونة رياضية، وكوتشينج أونلاين. كل ما تحتاجه لرحلتك الرياضية في مكان واحد.",
    type: "website",
    siteName: "MuscleHub",
    locale: "ar_EG",
    url: "https://musclehubeg.vercel.app",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "MuscleHub — منصة رياضية شاملة",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MuscleHub — منصة رياضية شاملة",
    description:
      "تمارين، برامج تدريب، حاسبات لياقة، مكتبة أكلات، مدونة رياضية، وكوتشينج أونلاين.",
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
      "ar-EG": "https://musclehubeg.vercel.app",
      "en-US": "https://musclehubeg.vercel.app",
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
