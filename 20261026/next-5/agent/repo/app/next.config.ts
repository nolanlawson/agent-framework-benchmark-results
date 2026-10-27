import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The reverse proxy in front of the app handles compression.
  compress: false,
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
