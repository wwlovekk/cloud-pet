import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.PET_BUILD_DIR || ".next",
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
