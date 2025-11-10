import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Disable static optimization for all pages to avoid SSR issues with browser APIs
  experimental: {
    optimizePackageImports: ['recharts'],
  },
};

export default nextConfig;
