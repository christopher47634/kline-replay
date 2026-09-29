import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The OG route reads its font subset from disk; make sure serverless bundles include it.
  outputFileTracingIncludes: { "/api/og": ["./src/app/api/og/*.ttf"] },
};

export default nextConfig;
