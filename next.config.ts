import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ═══════ PERFORMANCE ═══════

  // Enable React strict mode for better performance debugging
  reactStrictMode: true,

  // Compress responses (gzip/brotli)
  compress: true,

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },

  // Cache static assets aggressively
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
      ],
    },
    {
      // Cache static assets for 1 year
      source: "/_next/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      // Cache fonts for 1 year
      source: "/fonts/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],

  // Reduce bundle size — don't ship server-only modules to browser
  serverExternalPackages: ["@supabase/supabase-js"],
};

export default nextConfig;
