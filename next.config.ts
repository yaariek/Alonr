import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Redirect before any page renders (a redirect-only page trips the dev "instant" check).
  async redirects() {
    return [
      { source: "/", destination: "/listings", permanent: false },
      { source: "/search", destination: "/listings?view=halls", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
