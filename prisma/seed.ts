import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/ptenis",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@ptenis.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "trocar123";
  await prisma.user.upsert({
    where: { email },
    update: { isAdmin: true },
    create: {
      name: "Marco",
      email,
      phone: "+550000000001",
      passwordHash: await hash(password),
      level: 4,
      isAdmin: true,
    },
  });
  console.log(`Seed ok: admin ${email}`);
}

main().finally(() => prisma.$disconnect());
