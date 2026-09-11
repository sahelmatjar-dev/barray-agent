import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@barray/shared", "@barray/database", "@barray/ai", "@barray/integrations"],
  output: "standalone",
};

export default nextConfig;
