import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma driver adapter + connector MySQL dùng API Node.js — không bundle vào
  // Server Components / Route Handlers, để `require` native trên Vercel.
  serverExternalPackages: ["@prisma/adapter-mariadb", "mariadb"],
  // Output file tracing tối thiểu cho Docker image (xem Dockerfile ở root).
  // Chỉ bật khi KHÔNG build trên Vercel: Vercel tự làm output file tracing
  // riêng và không tương thích với "standalone" (gây lỗi ENOENT
  // next-server.js.nft.json ở bước onBuildComplete). Vercel tự set VERCEL=1.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
};

export default nextConfig;
