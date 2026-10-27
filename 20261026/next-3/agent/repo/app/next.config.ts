import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The reverse proxy in front of the app handles compression.
  compress: false,
  // The repo root has its own lockfile; this app is self-contained.
  turbopack: { root: __dirname },
};

export default nextConfig;
