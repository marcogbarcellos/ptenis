import { execSync } from "child_process";
import { Client } from "pg";

const url =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/ptenis_test";

export default async function setup() {
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await client.end();
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}
