import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
    minimumCacheTTL: 86400, // 24 hours
  },
  // Compression
  compress: true,
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
