import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://pochoclo-club.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
