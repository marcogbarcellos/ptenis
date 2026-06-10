import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/ptenis_test";

if (!new URL(url).pathname.includes("test"))
  throw new Error(`Recusando operação destrutiva em banco não-teste: ${url}`);

export const testDb = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

export async function resetDb() {
  const tables = await testDb.$queryRaw<
    { tablename: string }[]
  >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await testDb.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE`
  );
  await testDb.appSettings.create({ data: { id: 1 } });
}

let seq = 0;
export async function criarUsuario(
  extra: { name?: string; level?: number; isAdmin?: boolean } = {}
) {
  seq += 1;
  return testDb.user.create({
    data: {
      name: extra.name ?? `Jogador ${seq}`,
      email: `jogador${seq}-${Date.now()}@teste.com`,
      phone: `+5511${900000000 + seq}`,
      passwordHash: "hash-fake",
      level: extra.level ?? 3,
      isAdmin: extra.isAdmin ?? false,
    },
  });
}
