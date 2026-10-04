import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/capacity", destination: "/capacity/index.html" }];
  },
};

export default nextConfig;
