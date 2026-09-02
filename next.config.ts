import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img-cdn.heureka.group",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
