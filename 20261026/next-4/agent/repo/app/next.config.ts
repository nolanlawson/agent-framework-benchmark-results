import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // A reverse proxy handles compression in production.
  compress: false,
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
