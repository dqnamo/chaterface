import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import type { NextConfig } from "next";

if (existsSync("../.env.local")) {
  loadEnvFile("../.env.local");
}

if (existsSync(".env.local")) {
  loadEnvFile(".env.local");
}

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
