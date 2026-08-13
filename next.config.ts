import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: removed `output: "standalone"` — it caused
  // "ENOENT: .next/next-server.js.nft.json" on Vercel. Vercel handles
  // the standalone build itself; we only need `output: standalone` for
  // self-hosted Docker/Node deployments, which this project doesn't use.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  // Copy .z-ai-config to the standalone output so the z-ai-web-dev-sdk
  // can find it on the Vercel server (it looks in process.cwd()).
  outputFileTracingIncludes: {
    "/api/ai/research-topic": ["./.z-ai-config"],
    "/api/ai/generate-image": ["./.z-ai-config"],
  },
};

export default nextConfig;
