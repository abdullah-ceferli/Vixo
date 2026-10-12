import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Avoid spawning one page-build worker per CPU on a personal computer.
  experimental: { cpus: 2 },
};

export default nextConfig;
