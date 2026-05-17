import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tüm /api/v1/* isteklerini Next.js üzerinden API Gateway'e proxy'le
  // Bu sayede CORS sorunu olmaz, env var parse sorunu olmaz
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
