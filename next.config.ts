import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone build — produces .next/standalone/server.js so
  // `bun .next/standalone/server.js` works in production without
  // depending on the full node_modules tree.
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  outputFileTracingIncludes: {
    "/api/ai/research-topic": ["./.z-ai-config"],
    "/api/ai/generate-image": ["./.z-ai-config"],
  },
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
    ],
    minimumCacheTTL: 86400, // 24 hours
  },
  // Compression
  compress: true,
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  // Async headers — support dynamic routes via function form
  async headers() {
    return [
      {
        // Long-cache static assets
        source: "/(sitemap.xml|robots.txt|manifest.json|sw.js|favicon.ico|favicon.png|logo.png|logo.svg|icon-32.png|icon-192.png|icon-512.png|apple-touch-icon.png)",
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
