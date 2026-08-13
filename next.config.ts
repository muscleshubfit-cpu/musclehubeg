import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  // Copy .z-ai-config to the standalone output so the z-ai-web-dev-sdk
  // can find it on the Vercel server (it looks in process.cwd()).
  outputFileTracingIncludes: {
    "/api/ai/research-topic": ["./.z-ai-config"],
    "/api/ai/generate-image": ["./.z-ai-config"],
  },
};

export default nextConfig;
