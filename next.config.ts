import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three"],
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
