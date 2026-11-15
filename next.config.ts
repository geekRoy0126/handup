import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The VPS deploy (scripts/deploy-vps.sh) runs a self-contained server.js without node_modules (#2).
  // Only for that build: `next start` in CI and local dev keep the normal output.
  output: process.env.HANDUP_STANDALONE === "1" ? "standalone" : undefined,
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
