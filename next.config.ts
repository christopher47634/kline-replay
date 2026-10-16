import type { NextConfig } from "next";

// Files in public/ are not content-hashed, so Vercel serves them with max-age=0: every visit re-checks every font,
// texture and illustration with the server, a round-trip each (slow from mainland China). Let browsers keep them;
// stale-while-revalidate still picks up a changed file on the following visit.
const DAY = 86400;
const longCache = (maxAge: number) => [{ key: "Cache-Control", value: `public, max-age=${maxAge}, stale-while-revalidate=${30 * DAY}` }];

const nextConfig: NextConfig = {
  // The OG route reads its font subset from disk; make sure serverless bundles include it.
  outputFileTracingIncludes: { "/api/og": ["./src/app/api/og/*.ttf"] },
  async headers() {
    return [
      { source: "/fonts/:path*", headers: longCache(30 * DAY) },
      { source: "/tex/:path*", headers: longCache(30 * DAY) },
      { source: "/art/:path*", headers: longCache(DAY) },
    ];
  },
};

export default nextConfig;
