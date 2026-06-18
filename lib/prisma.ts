import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Prisma 7 is "Rust-free" and connects through a driver adapter. We use the Neon
 * serverless adapter against the POOLED connection string (DATABASE_URL).
 *
 * A singleton stashed on globalThis prevents Next's dev hot-reload from spawning
 * a new client (and connection pool) on every edit.
 */
function createPrisma(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
