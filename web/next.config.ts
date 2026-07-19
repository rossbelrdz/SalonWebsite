import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fail the production build on ESLint / type issues (stricter than dev).
  eslint: {
    // Keep build green while debt is cleaned; set to false when lint is clean.
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // sharp is a direct dependency; next/image uses it for WebP/AVIF resize in prod.
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [56, 96, 128, 256, 384],
  },
  // Don't ship source maps to browsers in production by default.
  productionBrowserSourceMaps: false,
};

export default nextConfig;
