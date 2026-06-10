// Prisma 7 requires a driver adapter — use @prisma/adapter-pg for standard PostgreSQL.
// The DATABASE_URL is no longer read from schema.prisma (moved to prisma.config.ts for CLI),
// so we pass it explicitly to the adapter here for runtime connections.
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function makeClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ??
    (() => {
      throw new Error("DATABASE_URL is not set");
    })();
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Re-export Prisma namespace so callers can do: import { db, Prisma } from "@/lib/db"
export { Prisma };

export type Db = PrismaClient | Prisma.TransactionClient;
