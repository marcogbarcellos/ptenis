import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/ptenis_test";

export const testDb = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

export async function resetDb() {
  await testDb.$executeRawUnsafe(
    `TRUNCATE "Match","DivisionPlayer","Division","SeasonEntry","Season","PasswordResetToken","Session","User","AppSettings" RESTART IDENTITY CASCADE`
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
      phone: `+55119${String(Date.now() % 100000000).padStart(8, "0")}${seq % 10}`,
      passwordHash: "hash-fake",
      level: extra.level ?? 3,
      isAdmin: extra.isAdmin ?? false,
    },
  });
}
