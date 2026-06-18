import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js keeps secrets in .env.local; load that so the Prisma CLI reads the
// same DATABASE_URL/DIRECT_URL as the app (dotenv defaults to .env otherwise).
config({ path: ".env.local" });

// Prisma 7 config. `datasource.url` is used by `prisma migrate` — point it at the
// Neon UNPOOLED connection (DIRECT_URL). The app runtime connects via the Neon
// driver adapter in lib/prisma.ts using the POOLED DATABASE_URL instead.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
