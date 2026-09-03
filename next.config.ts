import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma driver adapter + connector MySQL dùng API Node.js — không bundle vào
  // Server Components / Route Handlers, để `require` native trên Vercel.
  serverExternalPackages: ["@prisma/adapter-mariadb", "mariadb"],
};

export default nextConfig;
