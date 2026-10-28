import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/contracts", "@repo/env"],
};

export default nextConfig;
