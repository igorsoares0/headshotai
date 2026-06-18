import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7's generated client must not be bundled by Turbopack (avoids the
  // ".prisma/client/default" resolution error).
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
