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
    // VERCEL FREE-TIER QUOTA GUARD (Phase 97, owner directive 2026-09-02):
    // the blog pipeline adds 3-5 photos per article × 6 articles/day across
    // EN+AR plus tool/landing/admin imagery — thousands of source images.
    // Vercel's free-tier Image Optimization quota would be exhausted almost
    // immediately and then EVERY next/image on the site starts failing/
    // throttling. `unoptimized: true` makes next/image render plain <img>
    // and serve the SOURCE URL directly — no /_next/image hop, no quota.
    // The load is already carried by the origin CDNs (Pexels/Pixabay/
    // Unsplash URLs ship compressed+resized via their own query params;
    // Supabase Storage serves originals). remotePatterns/formats/minimumCacheTTL
    // are kept untouched — dead under this flag but re-activating paid
    // optimization later is a ONE-LINE revert.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "randomuser.me" },
      { protocol: "https", hostname: "z-cdn.chatglm.cn" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "wger.de" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "alkemos.com" },
      // Blog image pipeline (2026-08-28): Pexels is the PRIMARY featured
      // image source (real photography, people OK / NSFW screened) and
      // Pixabay a fallback. NOTE Phase 97: with images.unoptimized=true
      // these URLs are served as-is — their own CDN query params
      // (?auto=compress&cs=tinysrgb&w=…) are what keeps them lightweight.
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
  // COACH PUBLIC PHOTOS (Phase 56): CoachLandingEditor stores the
  // coach-public photo as a SAME-ORIGIN RELATIVE path
  // (/storage/v1/object/public/coach-public/<uid>/…) but nothing served
  // that path, so every coach-uploaded photo 404'd on the public page
  // (real-test finding, 2026-08-31). Proxy it to Supabase Storage —
  // guarded on the env being present at build time.
  async rewrites() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return [];
    return [
      {
        source: "/storage/v1/object/public/coach-public/:path*",
        destination: `${supabaseUrl}/storage/v1/object/public/coach-public/:path*`,
      },
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
        // Service worker — must ALWAYS revalidate: the browser's SW update
        // check consults the HTTP cache for /sw.js; a cached copy would keep
        // running the previous phase's worker for up to 24h. Phase 128 cache
        // fix (owner: «الكاش أصبح صعب التحديث») — sw.js left the 24h group
        // below and got its own always-revalidate rule (mirrored in
        // vercel.json).
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // Brand artwork pair changes between phases but KEEPS its filenames
        // (/images/brand/hero-light.webp etc.) — browsers must revalidate it
        // on every load. Phase 128 cache fix: the old blanket
        // "/images/* immutable max-age=1y" (vercel.json) is exactly why the
        // owner saw the previous phase's hero in a normal browser for days
        // while incognito always showed the new one. (Also in vercel.json.)
        source: "/images/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // Long-cache static assets (including ads.txt — served to Google's
        // AdSense crawler, same Cache-Control as robots.txt/sitemap.xml).
        // NOTE: sw.js is NOT here anymore (see its dedicated rule above).
        source: "/(sitemap.xml|robots.txt|ads.txt|manifest.json|favicon.ico|favicon.png|logo.png|logo.svg|icon-32.png|icon-192.png|icon-512.png|apple-touch-icon.png)",
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
