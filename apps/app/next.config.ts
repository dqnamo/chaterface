import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "9dc6-2a0a-ef40-12fa-601-491a-e577-653b-eec.ngrok-free.app",
  ],
  images: {
    remotePatterns: [
      {
        hostname: "api.dicebear.com",
        pathname: "/9.x/glass/svg",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
