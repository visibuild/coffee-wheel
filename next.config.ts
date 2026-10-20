import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // PGlite loads its WASM/data files via file URLs, which break when bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  partialPrefetching: true,
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
