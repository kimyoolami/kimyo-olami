import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_API_URL ?? "https://kimyo-olami-api.onrender.com";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
