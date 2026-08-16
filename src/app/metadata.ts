import type { Metadata, Viewport } from "next";

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
    description: "Build a stronger you with AI + human coaching.",
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
  themeColor: "#0071e3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
