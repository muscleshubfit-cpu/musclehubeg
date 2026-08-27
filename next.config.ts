import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: Do NOT set output: "standalone" — Vercel handles the build
  // output natively and expects the standard .next/ structure. Setting
  // standalone mode breaks Vercel's onBuildComplete step which looks
  // for .next/next-server.js.nft.json at its standard location.
  // TypeScript strict checks enabled — all @ts-nocheck removed, 0 errors
  typescript: {
  },
  // Allow dev origins for cloud preview environment
  allowedDevOrigins: [
    "*.run.app",
    "*.googleusercontent.com",
    "ais-dev-ye7h33vm5ffgyr4lhgmnmh-108459420502.europe-west3.run.app",
    "ais-pre-ye7h33vm5ffgyr4lhgmnmh-108459420502.europe-west3.run.app",
    "localhost:3000",
  ],
  // (Next.js 16 dropped support for `eslint` config in next.config.ts —
  // we now run eslint via `bun run lint` instead.)
  reactStrictMode: true,
  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "randomuser.me" },
      { protocol: "https", hostname: "z-cdn.chatglm.cn" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "wger.de" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "musclehubeg.vercel.app" },
      // Blog image pipeline (2026-08-28): Pexels is the PRIMARY featured
      // image source (real photography, people OK / NSFW screened) and
      // Pixabay a fallback — next/image converts these to lightweight
      // WebP/responsive sizes at the edge (owner: «حجم خفيف بنظام الموقع»).
      // image.pollinations.ai stays allow-listed only so legacy DB rows
      // render until the migration runner rewrites them to Pexels URLs.
      { protocol: "https", hostname: "image.pollinations.ai" },
      { protocol: "https", hostname: "pixabay.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
      // Supabase Storage — hosts user-uploaded avatars, questionnaire photos,
      // and progress photos referenced via next/image in profile/admin views.
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
    minimumCacheTTL: 86400, // 24 hours
  },
  // Compression
  compress: true,
  // EVO CHAT SURFACE LAW (2026-08-27): the floating widget is the ONLY
  // chat surface. The old full-page /chat route was removed — legacy
  // links/bookmarks land on the EVO page whose CTAs open the widget.
  async redirects() {
    return [
      { source: "/chat", destination: "/evo", permanent: true },
    ];
  },
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  // Async headers — support dynamic routes via function form
  async headers() {
    return [
      {
        // Long-cache static assets (including ads.txt — served to Google's
        // AdSense crawler, same Cache-Control as robots.txt/sitemap.xml).
        source: "/(sitemap.xml|robots.txt|ads.txt|manifest.json|sw.js|favicon.ico|favicon.png|logo.png|logo.svg|icon-32.png|icon-192.png|icon-512.png|apple-touch-icon.png)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
