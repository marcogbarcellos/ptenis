import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function makeClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ??
    (() => {
      throw new Error("DATABASE_URL is not set");
    })();
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Re-export Prisma namespace so callers can do: import { db, Prisma } from "@/lib/db"
export { Prisma };

export type Db = PrismaClient | Prisma.TransactionClient;
