# PTenis MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web app mobile-first (pt-BR) para a comunidade de tênis do professor Pablo: amistosos via mural de convites + temporadas competitivas por divisão (liga → playoffs), com auth própria e admin — spec completo em `docs/superpowers/specs/2026-06-10-ptenis-mvp-design.md` (LEIA O SPEC ANTES DE QUALQUER TASK).

**Architecture:** Um único serviço Next.js (App Router) + Postgres no Railway. Leituras em Server Components, escritas em Server Actions finas (zod) que delegam a módulos de serviço em `src/lib/services/` (DI do Prisma client p/ testabilidade e reuso futuro pelo bot do WhatsApp). Lógica competitiva (round-robin, classificação, playoffs, placar) é pura e testada com Vitest; fluxos com corrida usam transações. Sem cron: pendências (auto-confirmação 48h, criação de final) resolvidas preguiçosamente na leitura.

**Tech Stack:** Next.js (App Router, TS) · Tailwind v4 + shadcn/ui (tema verde-quadra/amarelo-bola) · Prisma + Postgres · @node-rs/argon2 · zod · Resend · date-fns + date-fns-tz · Vitest · Railway.

**Convenções para TODAS as tasks:**
- Idioma da UI e das mensagens de erro: **pt-BR**. Datas exibidas no fuso de `AppSettings.timezone`.
- Serviços recebem `db: Db` como 1º parâmetro (`type Db = PrismaClient | Prisma.TransactionClient`), nunca importam o singleton.
- Erros de negócio: lançar `AppError` (Task 3) com mensagem pt-BR; Server Actions capturam e retornam `{ ok: false, error }`.
- Commits frequentes, mensagens `feat:`/`test:`/`chore:` em pt-BR, com `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Rodar `npm run test` e `npx tsc --noEmit` antes de cada commit de código.
- Testes de integração (`tests/int/`) exigem o Postgres do `docker compose up -d` (Task 1). Se o Docker não estiver disponível, PARE e avise o usuário — não marque a task como completa.

## Estrutura de arquivos (mapa do projeto)

```
prisma/schema.prisma, prisma/seed.ts
docker-compose.yml, .env.example, vitest.config.ts
src/lib/db.ts                  # singleton PrismaClient + type Db
src/lib/errors.ts              # AppError
src/lib/auth/password.ts       # hash/verify (@node-rs/argon2)
src/lib/auth/session.ts        # criar/validar/destruir sessão + cookie
src/lib/auth/current-user.ts   # getCurrentUser/requireUser/requireAdmin
src/lib/nivel.ts               # questionário → nível 1-7 (puro)
src/lib/format.ts              # datas pt-BR no fuso, iniciais/cor avatar, placar→texto
src/lib/placar-rules.ts        # validarPlacar(format, sets) → vencedor (puro)
src/lib/round-robin.ts         # gerarConfrontos(ids) (puro)
src/lib/classificacao.ts       # computeStandings (puro, desempates)
src/lib/playoffs.ts            # seedPlayoffs/needsFinal (puro)
src/lib/divisoes.ts            # sugerirDivisoes (puro)
src/lib/services/{usuarios,convites,jogos,placar,liga,temporada,notificacoes}.ts
src/lib/validation/schemas.ts  # zod compartilhado
src/app/(auth)/{entrar,cadastro,esqueci-senha,redefinir-senha}/page.tsx (+actions)
src/app/(app)/layout.tsx       # requireUser + BottomNav + resolverPendencias
src/app/(app)/page.tsx         # Início (mural + próximos jogos + pendências)
src/app/(app)/{temporada,jogar,jogadores,perfil}/..., src/app/(app)/jogo/[id]/...
src/app/(app)/admin/...        # requireAdmin
src/components/{bottom-nav,avatar-iniciais,nivel-badge,empty-state,jogo-card,
                tabela-classificacao,bracket,placar-form,confirm-button}.tsx
src/components/ui/*            # shadcn (gerado)
src/app/manifest.ts, public/icon.svg, public/icons/*.png
tests/unit/*.test.ts           # lógica pura
tests/int/*.test.ts            # serviços contra Postgres real
tests/helpers/db.ts            # testDb + resetDb
```

---

## Fase A — Fundação

### Task 1: Scaffold do projeto (Next + Tailwind v4 + shadcn + Vitest + Docker)

**Files:** Create: projeto inteiro na raiz `/Users/barsmike/workspace/personal/ptenis`, `docker-compose.yml`, `docker/init-test-db.sql`, `.env.example`, `vitest.config.ts`, `src/app/globals.css` (tema)

- [ ] **Step 1: create-next-app na raiz (o diretório já tem docs/ e .git — usar `.` e responder não a conflitos de git)**

```bash
cd /Users/barsmike/workspace/personal/ptenis
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm --yes
```
Esperado: projeto criado sem apagar `docs/` nem `.git/`. (Se o CLI reclamar de diretório não vazio, rode em `/tmp/ptenis-scaffold` e mova tudo exceto `.git` e `docs` para a raiz.)

- [ ] **Step 2: dependências**

```bash
npm i @prisma/client @node-rs/argon2 zod resend date-fns date-fns-tz
npm i -D prisma vitest tsx sharp
```

- [ ] **Step 3: shadcn init + componentes** — `init` é interativo: responder base color **neutral** e CSS variables **yes** (demais perguntas: default)

```bash
npx shadcn@latest init
npx shadcn@latest add button card input label select tabs badge dialog alert-dialog table textarea separator sonner
```
Esperado: `components.json` criado, componentes em `src/components/ui/`.

- [ ] **Step 4: tema verde-quadra/amarelo-bola** — em `src/app/globals.css`, SUBSTITUIR os valores das variáveis geradas pelo init dentro de `:root` (manter as demais variáveis que o shadcn gerou; não há bloco `.dark` a manter — apagar se existir, MVP é tema claro único):

```css
:root {
  --radius: 1rem;
  --background: oklch(0.985 0.002 120);
  --foreground: oklch(0.2 0.02 150);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.2 0.02 150);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.2 0.02 150);
  --primary: oklch(0.52 0.13 155);          /* verde-quadra */
  --primary-foreground: oklch(0.99 0.01 120);
  --secondary: oklch(0.95 0.02 130);
  --secondary-foreground: oklch(0.3 0.05 150);
  --muted: oklch(0.955 0.005 120);
  --muted-foreground: oklch(0.5 0.02 150);
  --accent: oklch(0.92 0.08 110);           /* amarelo-bola suave */
  --accent-foreground: oklch(0.3 0.06 120);
  --destructive: oklch(0.55 0.19 25);
  --border: oklch(0.91 0.01 130);
  --input: oklch(0.91 0.01 130);
  --ring: oklch(0.52 0.13 155);
  --chart-1: oklch(0.52 0.13 155);
  --chart-2: oklch(0.8 0.16 95);            /* amarelo-bola forte (troféus/destaques) */
  --chart-3: oklch(0.6 0.1 200);
  --chart-4: oklch(0.65 0.12 60);
  --chart-5: oklch(0.45 0.1 280);
}
```

- [ ] **Step 5: docker-compose + init do banco de teste**

`docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ptenis
    volumes:
      - ./docker/init-test-db.sql:/docker-entrypoint-initdb.d/init-test-db.sql
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

`docker/init-test-db.sql`:
```sql
CREATE DATABASE ptenis_test;
```

`.env.example` (copiar para `.env` local):
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ptenis"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ptenis_test"
SESSION_SECRET="troque-em-producao"
RESEND_API_KEY=""
EMAIL_FROM="PTenis <onboarding@resend.dev>"
APP_URL="http://localhost:3000"
SEED_ADMIN_EMAIL="marco.barcellos@juridico.ai"
SEED_ADMIN_PASSWORD="trocar123"
```

```bash
cp .env.example .env && docker compose up -d
```

- [ ] **Step 6: vitest.config.ts + scripts**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    passWithNoTests: true,
  },
});
```

`vitest.int.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    include: ["tests/int/**/*.test.ts"],
    globalSetup: "tests/helpers/global-setup.ts",
    fileParallelism: false,
    passWithNoTests: true,
  },
});
```

Em `package.json`, adicionar em `"scripts"`:
```json
"test": "vitest run",
"test:int": "vitest run -c vitest.int.config.ts",
"db:migrate": "prisma migrate dev",
"db:seed": "tsx prisma/seed.ts"
```

- [ ] **Step 7: verificar que tudo roda**

```bash
npm run test && npm run build
```
Esperado: vitest "no tests" OK; build Next OK.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js + Tailwind v4 + shadcn + Vitest + Docker

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 2: Schema Prisma completo + migration + seed + singleton

**Files:** Create: `prisma/schema.prisma` (substituir o gerado), `prisma/seed.ts`, `src/lib/db.ts`, `src/lib/errors.ts` · Modify: `package.json`

- [ ] **Step 1: schema completo** — `npx prisma init --datasource-provider postgresql` (se ainda não existir `prisma/`), depois substituir `prisma/schema.prisma` por:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum SeasonStatus {
  rascunho
  inscricoes
  liga
  playoffs
  encerrada
}

enum MatchType {
  amistoso
  liga
  playoff
}

enum MatchStatus {
  pendente
  aberto
  proposto
  marcado
  aguardando_confirmacao
  confirmado
  cancelado
  wo
}

enum MatchFormat {
  bo3_mtb
  set_unico
  proset8
}

enum PlayoffRound {
  semi1
  semi2
  final
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  phone        String   @unique // E.164, chave de vinculação do bot (fase 2)
  passwordHash String
  level        Int      @default(3) // 1-7
  availability Json?    // ex.: ["seg-noite","sab-manha"]
  isAdmin      Boolean  @default(false)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  sessions      Session[]
  resetTokens   PasswordResetToken[]
  seasonEntries SeasonEntry[]
  divisions     DivisionPlayer[]
  matchesA      Match[]              @relation("playerA")
  matchesB      Match[]              @relation("playerB")
  createdMatches Match[]             @relation("createdBy")
  proposedMatches Match[]            @relation("proposedBy")
  wonMatches    Match[]              @relation("winner")
  reportedMatches Match[]            @relation("reportedBy")
}

model Session {
  id        String   @id // sha256(token) em hex
  userId    String
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AppSettings {
  id            Int    @id @default(1)
  communityName String @default("PTenis")
  inviteCode    String @default("PTENIS2026")
  timezone      String @default("America/Sao_Paulo")
}

model Season {
  id            String       @id @default(cuid())
  name          String
  status        SeasonStatus @default(rascunho)
  inscricoesAte DateTime?
  ligaAte       DateTime?
  createdAt     DateTime     @default(now())

  entries   SeasonEntry[]
  divisions Division[]
  matches   Match[]
}

model SeasonEntry {
  seasonId  String
  userId    String
  createdAt DateTime @default(now())
  season    Season   @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([seasonId, userId])
}

model Division {
  id       String @id @default(cuid())
  seasonId String
  name     String // "Divisão A"
  order    Int
  season   Season @relation(fields: [seasonId], references: [id], onDelete: Cascade)

  players DivisionPlayer[]
  matches Match[]
}

model DivisionPlayer {
  divisionId    String
  userId        String
  ordemInscricao Int     // desempate determinístico final
  finalPosition Int?
  division      Division @relation(fields: [divisionId], references: [id], onDelete: Cascade)
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([divisionId, userId])
}

model Match {
  id           String       @id @default(cuid())
  type         MatchType
  status       MatchStatus
  seasonId     String?
  divisionId   String?
  round        PlayoffRound?
  playerAId    String
  playerBId    String? // null apenas em amistoso aberto
  createdById  String
  scheduledAt  DateTime?
  location     String?
  note         String?
  format       MatchFormat  @default(bo3_mtb)
  proposedById String?
  score        Json? // ex.: [[6,4],[3,6],[10,7]]
  winnerId     String?
  reportedById String?
  reportedAt   DateTime?
  confirmedAt  DateTime?
  createdAt    DateTime     @default(now())

  season     Season?   @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  division   Division? @relation(fields: [divisionId], references: [id], onDelete: Cascade)
  playerA    User      @relation("playerA", fields: [playerAId], references: [id])
  playerB    User?     @relation("playerB", fields: [playerBId], references: [id])
  createdBy  User      @relation("createdBy", fields: [createdById], references: [id])
  proposedBy User?     @relation("proposedBy", fields: [proposedById], references: [id])
  winner     User?     @relation("winner", fields: [winnerId], references: [id])
  reportedBy User?     @relation("reportedBy", fields: [reportedById], references: [id])

  @@unique([divisionId, round]) // 1 semi1, 1 semi2, 1 final por divisão
  @@index([status, type])
  @@index([divisionId])
  @@index([playerAId])
  @@index([playerBId])
}
```

- [ ] **Step 2: rodar a migration**

```bash
npx prisma migrate dev --name init
```
Esperado: migration criada e aplicada, client gerado.

- [ ] **Step 3: `src/lib/db.ts` e `src/lib/errors.ts`**

```ts
// src/lib/db.ts
import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Db = PrismaClient | Prisma.TransactionClient;
```

```ts
// src/lib/errors.ts
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}
```

- [ ] **Step 4: seed** — `prisma/seed.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

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
```

```bash
npm run db:seed
```
Esperado: `Seed ok: admin marco.barcellos@juridico.ai`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: schema Prisma completo, seed de admin e singleton do banco

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 3: Senha, sessão e helpers de teste de integração

**Files:** Create: `src/lib/auth/password.ts`, `src/lib/auth/session.ts`, `src/lib/auth/current-user.ts`, `src/lib/action-state.ts`, `tests/helpers/global-setup.ts`, `tests/helpers/db.ts`, `tests/unit/session-token.test.ts`, `tests/int/sessao.test.ts`

- [ ] **Step 1: teste unitário do token (falhando)** — `tests/unit/session-token.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { gerarToken, hashToken } from "@/lib/auth/session";

describe("token de sessão", () => {
  it("gera tokens únicos e longos", () => {
    const a = gerarToken();
    expect(a).not.toBe(gerarToken());
    expect(a.length).toBeGreaterThanOrEqual(40);
  });
  it("hash é determinístico e diferente do token", () => {
    const t = gerarToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
    expect(hashToken(t)).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

Rodar: `npm run test` → Esperado: FAIL (módulo não existe).

- [ ] **Step 2: implementar** `src/lib/auth/password.ts` e `src/lib/auth/session.ts`:

```ts
// src/lib/auth/password.ts
import { hash, verify } from "@node-rs/argon2";

export const hashSenha = (senha: string) => hash(senha);
export const verificarSenha = (hashArmazenado: string, senha: string) =>
  verify(hashArmazenado, senha).catch(() => false);
```

```ts
// src/lib/auth/session.ts
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { Db } from "@/lib/db";

const COOKIE = "ptenis_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export const gerarToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function criarSessao(db: Db, userId: string) {
  const token = gerarToken();
  await db.session.create({
    data: { id: hashToken(token), userId, expiresAt: new Date(Date.now() + TTL_MS) },
  });
  return token;
}

export async function validarSessao(db: Db, token: string) {
  const s = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (!s || s.expiresAt < new Date() || !s.user.isActive) return null;
  if (s.expiresAt.getTime() - Date.now() < TTL_MS / 2) {
    await db.session.update({
      where: { id: s.id },
      data: { expiresAt: new Date(Date.now() + TTL_MS) },
    });
  }
  return s.user;
}

export async function destruirSessao(db: Db, token: string) {
  await db.session.deleteMany({ where: { id: hashToken(token) } });
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_MS / 1000,
    path: "/",
  });
}
export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}
export async function getSessionToken() {
  return (await cookies()).get(COOKIE)?.value ?? null;
}
```

Rodar: `npm run test` → Esperado: PASS.

- [ ] **Step 3: helpers de usuário atual e estado de action**

```ts
// src/lib/auth/current-user.ts
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken, validarSessao } from "@/lib/auth/session";

export const getCurrentUser = cache(async () => {
  const token = await getSessionToken();
  if (!token) return null;
  return validarSessao(db, token);
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}
```

```ts
// src/lib/action-state.ts
import { AppError } from "@/lib/errors";

export type ActionState = { ok: boolean; error?: string };
export const idle: ActionState = { ok: false };

// Envolve a lógica de uma Server Action: AppError vira mensagem amigável.
export async function runAction(fn: () => Promise<void>): Promise<ActionState> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Algo deu errado. Tente de novo." };
  }
}
```

(Nota: actions que chamam `redirect()` deixam o redirect propagar — chamar `redirect` FORA do `runAction`.)

- [ ] **Step 4: helpers de teste de integração**

```ts
// tests/helpers/global-setup.ts
import { execSync } from "child_process";

export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/ptenis_test";
  execSync("npx prisma db push --force-reset --skip-generate", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}
```

```ts
// tests/helpers/db.ts
import { PrismaClient } from "@prisma/client";

const url =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/ptenis_test";

export const testDb = new PrismaClient({ datasources: { db: { url } } });

export async function resetDb() {
  await testDb.$executeRawUnsafe(
    `TRUNCATE "Match","DivisionPlayer","Division","SeasonEntry","Season","PasswordResetToken","Session","User","AppSettings" RESTART IDENTITY CASCADE`
  );
  await testDb.appSettings.create({ data: { id: 1 } });
}

let seq = 0;
export async function criarUsuario(extra: { name?: string; level?: number; isAdmin?: boolean } = {}) {
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
```

- [ ] **Step 5: teste de integração da sessão** — `tests/int/sessao.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { criarSessao, destruirSessao, validarSessao } from "@/lib/auth/session";
import { criarUsuario, resetDb, testDb } from "../helpers/db";

beforeEach(resetDb);

describe("sessão", () => {
  it("cria, valida e destrói", async () => {
    const u = await criarUsuario();
    const token = await criarSessao(testDb, u.id);
    const user = await validarSessao(testDb, token);
    expect(user?.id).toBe(u.id);
    await destruirSessao(testDb, token);
    expect(await validarSessao(testDb, token)).toBeNull();
  });
  it("rejeita sessão expirada e usuário desativado", async () => {
    const u = await criarUsuario();
    const token = await criarSessao(testDb, u.id);
    await testDb.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validarSessao(testDb, token)).toBeNull();

    const token2 = await criarSessao(testDb, u.id);
    await testDb.user.update({ where: { id: u.id }, data: { isActive: false } });
    expect(await validarSessao(testDb, token2)).toBeNull();
  });
});
```

Rodar: `npm run test:int` → Esperado: PASS (exige `docker compose up -d`).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: senha argon2, sessões com cookie httpOnly e helpers de teste

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 4: Questionário de nível (puro)

**Files:** Create: `src/lib/nivel.ts`, `tests/unit/nivel.test.ts`

- [ ] **Step 1: teste falhando** — `tests/unit/nivel.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calcularNivel, nivelLabel, QUESTIONARIO_NIVEL } from "@/lib/nivel";

describe("questionário de nível", () => {
  it("tem 4 perguntas com 4 opções cada", () => {
    expect(QUESTIONARIO_NIVEL).toHaveLength(4);
    for (const p of QUESTIONARIO_NIVEL) expect(p.opcoes).toHaveLength(4);
  });
  it("mapeia extremos e meio", () => {
    expect(calcularNivel([1, 1, 1, 1])).toBe(1);
    expect(calcularNivel([4, 4, 4, 4])).toBe(7);
    expect(calcularNivel([2, 2, 3, 3])).toBe(4);
  });
  it("clampa entradas inválidas", () => {
    expect(calcularNivel([0, 0, 0, 0])).toBe(1);
    expect(calcularNivel([9, 9, 9, 9])).toBe(7);
  });
  it("rótulos", () => {
    expect(nivelLabel(1)).toBe("Iniciante");
    expect(nivelLabel(4)).toBe("Intermediário");
    expect(nivelLabel(7)).toBe("Avançado");
  });
});
```

Rodar: `npm run test` → FAIL.

- [ ] **Step 2: implementar** `src/lib/nivel.ts`:

```ts
export const QUESTIONARIO_NIVEL = [
  {
    id: "frequencia",
    pergunta: "Há quanto tempo você joga tênis?",
    opcoes: [
      "Estou começando agora",
      "Menos de 1 ano",
      "De 1 a 3 anos",
      "Mais de 3 anos",
    ],
  },
  {
    id: "troca",
    pergunta: "Como é sua troca de bolas?",
    opcoes: [
      "Ainda erro bastante",
      "Sustento trocas curtas em ritmo leve",
      "Sustento trocas em ritmo médio com direção",
      "Troco em ritmo forte, com efeito e profundidade",
    ],
  },
  {
    id: "saque",
    pergunta: "E o seu saque?",
    opcoes: [
      "Só coloco a bola em jogo",
      "Primeiro saque entra com alguma força",
      "Tenho 1º e 2º saque confiáveis",
      "Saque é uma arma (variação e potência)",
    ],
  },
  {
    id: "jogos",
    pergunta: "Experiência em jogos valendo?",
    opcoes: [
      "Nunca joguei valendo",
      "Já joguei alguns sets",
      "Jogo partidas com frequência",
      "Já disputei torneios/campeonatos",
    ],
  },
] as const;

// respostas: 4 valores de 1 a 4 → nível 1-7 (linear: soma 4→1, 16→7)
export function calcularNivel(respostas: number[]): number {
  const soma = respostas
    .map((r) => Math.min(4, Math.max(1, r)))
    .reduce((a, b) => a + b, 0);
  return Math.min(7, Math.max(1, Math.round(1 + (soma - 4) * 0.5)));
}

export function nivelLabel(nivel: number): string {
  if (nivel <= 2) return "Iniciante";
  if (nivel <= 4) return "Intermediário";
  return "Avançado";
}
```

Rodar: `npm run test` → PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: questionário de auto-avaliação de nível 1-7

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 5: Contas — serviço de usuários, e-mails e páginas de auth

**Files:** Create: `src/lib/validation/schemas.ts`, `src/lib/services/notificacoes.ts`, `src/lib/services/usuarios.ts`, `tests/unit/telefone.test.ts`, `tests/unit/emails.test.ts`, `tests/int/usuarios.test.ts`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/actions.ts`, `src/app/(auth)/entrar/page.tsx`, `src/app/(auth)/cadastro/page.tsx`, `src/app/(auth)/esqueci-senha/page.tsx`, `src/app/(auth)/redefinir-senha/page.tsx` (todas as pages com seu `form.tsx` client)

- [ ] **Step 1: testes unitários falhando** — `tests/unit/telefone.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizarTelefone } from "@/lib/validation/schemas";

describe("normalizarTelefone", () => {
  it("aceita E.164 e limpa formatação", () => {
    expect(normalizarTelefone("+55 (11) 91234-5678")).toBe("+5511912345678");
    expect(normalizarTelefone("+351 912 345 678")).toBe("+351912345678");
  });
  it("assume +55 para números locais de 10-11 dígitos", () => {
    expect(normalizarTelefone("11912345678")).toBe("+5511912345678");
    expect(normalizarTelefone("(11) 3123-4567")).toBe("+551131234567");
  });
  it("rejeita inválidos", () => {
    expect(normalizarTelefone("123")).toBeNull();
    expect(normalizarTelefone("abc")).toBeNull();
  });
});
```

`tests/unit/emails.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  emailAmistosoCombinado,
  emailPlacarParaConfirmar,
  emailPropostaRecebida,
  emailResetSenha,
} from "@/lib/services/notificacoes";

describe("templates de e-mail", () => {
  it("reset de senha contém o link", () => {
    const t = emailResetSenha("https://x/redefinir-senha?token=abc");
    expect(t.html).toContain("token=abc");
    expect(t.subject).toMatch(/senha/i);
  });
  it("eventos de jogo contêm nome e link do jogo", () => {
    for (const t of [
      emailPropostaRecebida("João", "https://x/jogo/1"),
      emailAmistosoCombinado("João", "https://x/jogo/1"),
      emailPlacarParaConfirmar("João", "https://x/jogo/1"),
    ]) {
      expect(t.html).toContain("João");
      expect(t.html).toContain("/jogo/1");
    }
  });
});
```

Rodar: `npm run test` → FAIL.

- [ ] **Step 2: implementar schemas + notificações**

```ts
// src/lib/validation/schemas.ts
import { z } from "zod";

export function normalizarTelefone(raw: string): string | null {
  const limpo = raw.replace(/[\s().-]/g, "");
  if (/^\+\d{8,15}$/.test(limpo)) return limpo;
  if (/^\d{10,11}$/.test(limpo)) return `+55${limpo}`;
  return null;
}

export const telefoneSchema = z
  .string()
  .transform((v, ctx) => {
    const t = normalizarTelefone(v);
    if (!t) {
      ctx.addIssue({ code: "custom", message: "Telefone inválido. Use DDD + número (ex.: 11 91234-5678)." });
      return z.NEVER;
    }
    return t;
  });

export const senhaSchema = z.string().min(6, "A senha precisa de pelo menos 6 caracteres.");

export const cadastroSchema = z.object({
  codigo: z.string().trim().min(1, "Informe o código de convite."),
  nome: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  telefone: telefoneSchema,
  senha: senhaSchema,
  respostas: z.array(z.coerce.number().min(1).max(4)).length(4, "Responda as 4 perguntas."),
});

export const entrarSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(1, "Informe a senha."),
});

export const perfilSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  telefone: telefoneSchema,
  availability: z.array(z.string()).optional(),
});
```

```ts
// src/lib/services/notificacoes.ts
import { Resend } from "resend";

type Template = { subject: string; html: string };

const wrap = (corpo: string) =>
  `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
     <h2 style="color:#15803d">🎾 PTenis</h2>${corpo}
     <p style="color:#888;font-size:12px;margin-top:32px">Comunidade de tênis — este e-mail é automático.</p>
   </div>`;

const botao = (url: string, texto: string) =>
  `<p><a href="${url}" style="background:#15803d;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;display:inline-block">${texto}</a></p>`;

export const emailResetSenha = (link: string): Template => ({
  subject: "Redefinir sua senha — PTenis",
  html: wrap(`<p>Recebemos um pedido para redefinir sua senha. O link vale por 1 hora.</p>${botao(link, "Redefinir senha")}<p>Se não foi você, ignore este e-mail.</p>`),
});

export const emailPropostaRecebida = (deQuem: string, linkJogo: string): Template => ({
  subject: `${deQuem} propôs uma data de jogo — PTenis`,
  html: wrap(`<p><strong>${deQuem}</strong> propôs data para um jogo com você.</p>${botao(linkJogo, "Ver proposta")}`),
});

export const emailAmistosoCombinado = (deQuem: string, linkJogo: string): Template => ({
  subject: `${deQuem} marcou um amistoso com você — PTenis`,
  html: wrap(`<p><strong>${deQuem}</strong> marcou um amistoso com você no app.</p>${botao(linkJogo, "Ver jogo")}`),
});

export const emailPlacarParaConfirmar = (deQuem: string, linkJogo: string): Template => ({
  subject: `Placar para você confirmar — PTenis`,
  html: wrap(`<p><strong>${deQuem}</strong> lançou o placar de um jogo com você. Sem resposta em 48h, confirma sozinho.</p>${botao(linkJogo, "Confirmar placar")}`),
});

export async function sendEmail(to: string, template: Template) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email desativado] para=${to} assunto=${template.subject}`);
    return;
  }
  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "PTenis <onboarding@resend.dev>",
      to,
      subject: template.subject,
      html: template.html,
    });
  } catch (e) {
    console.error("Falha ao enviar e-mail (seguindo sem ele):", e);
  }
}

export const linkJogo = (id: string) => `${process.env.APP_URL ?? ""}/jogo/${id}`;
```

Rodar: `npm run test` → PASS.

- [ ] **Step 3: teste de integração falhando do serviço de usuários** — `tests/int/usuarios.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { redefinirSenha, registrar, solicitarResetSenha } from "@/lib/services/usuarios";
import { verificarSenha } from "@/lib/auth/password";
import { criarUsuario, resetDb, testDb } from "../helpers/db";

beforeEach(resetDb);

const dados = {
  codigo: "PTENIS2026",
  nome: "Ana",
  email: "ana@teste.com",
  telefone: "+5511912345678",
  senha: "segredo1",
  respostas: [2, 2, 3, 3],
};

describe("registrar", () => {
  it("cria usuário com nível calculado e senha verificável", async () => {
    const u = await registrar(testDb, dados);
    expect(u.level).toBe(4);
    expect(await verificarSenha(u.passwordHash, "segredo1")).toBe(true);
  });
  it("rejeita código de convite errado", async () => {
    await expect(registrar(testDb, { ...dados, codigo: "ERRADO" })).rejects.toThrow(/convite/i);
  });
  it("rejeita e-mail e telefone duplicados", async () => {
    await registrar(testDb, dados);
    await expect(
      registrar(testDb, { ...dados, telefone: "+5511999999999" })
    ).rejects.toThrow(/e-mail/i);
    await expect(
      registrar(testDb, { ...dados, email: "outra@teste.com" })
    ).rejects.toThrow(/telefone/i);
  });
});

describe("reset de senha", () => {
  it("fluxo completo: solicitar → redefinir → token não reutilizável", async () => {
    const u = await criarUsuario();
    const r = await solicitarResetSenha(testDb, u.email);
    expect(r).not.toBeNull();
    await redefinirSenha(testDb, r!.token, "novaSenha1");
    const atualizado = await testDb.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await verificarSenha(atualizado.passwordHash, "novaSenha1")).toBe(true);
    await expect(redefinirSenha(testDb, r!.token, "outra123")).rejects.toThrow();
  });
  it("e-mail desconhecido retorna null (não vaza existência)", async () => {
    expect(await solicitarResetSenha(testDb, "nao@existe.com")).toBeNull();
  });
});
```

Rodar: `npm run test:int` → FAIL.

- [ ] **Step 4: implementar** `src/lib/services/usuarios.ts`:

```ts
import { createHash, randomBytes } from "crypto";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hashSenha, verificarSenha } from "@/lib/auth/password";
import { calcularNivel } from "@/lib/nivel";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function registrar(
  db: Db,
  input: { codigo: string; nome: string; email: string; telefone: string; senha: string; respostas: number[] }
) {
  const settings = await db.appSettings.findUniqueOrThrow({ where: { id: 1 } });
  if (input.codigo.trim().toUpperCase() !== settings.inviteCode.toUpperCase())
    throw new AppError("Código de convite inválido. Peça o código no grupo.");
  if (await db.user.findUnique({ where: { email: input.email } }))
    throw new AppError("Já existe uma conta com esse e-mail.");
  if (await db.user.findUnique({ where: { phone: input.telefone } }))
    throw new AppError("Já existe uma conta com esse telefone.");
  return db.user.create({
    data: {
      name: input.nome,
      email: input.email,
      phone: input.telefone,
      passwordHash: await hashSenha(input.senha),
      level: calcularNivel(input.respostas),
    },
  });
}

export async function autenticar(db: Db, email: string, senha: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive || !(await verificarSenha(user.passwordHash, senha)))
    throw new AppError("E-mail ou senha incorretos.");
  return user;
}

export async function solicitarResetSenha(db: Db, email: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;
  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  return { user, token };
}

export async function redefinirSenha(db: Db, token: string, novaSenha: string) {
  const t = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!t || t.usedAt || t.expiresAt < new Date())
    throw new AppError("Link inválido ou expirado. Peça um novo.");
  await db.passwordResetToken.update({ where: { id: t.id }, data: { usedAt: new Date() } });
  return db.user.update({
    where: { id: t.userId },
    data: { passwordHash: await hashSenha(novaSenha) },
  });
}

export async function atualizarPerfil(
  db: Db,
  userId: string,
  input: { nome: string; telefone: string; availability?: string[] }
) {
  const existente = await db.user.findUnique({ where: { phone: input.telefone } });
  if (existente && existente.id !== userId)
    throw new AppError("Já existe uma conta com esse telefone.");
  return db.user.update({
    where: { id: userId },
    data: { name: input.nome, phone: input.telefone, availability: input.availability ?? [] },
  });
}

export async function alterarSenha(db: Db, userId: string, atual: string, nova: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verificarSenha(user.passwordHash, atual)))
    throw new AppError("Senha atual incorreta.");
  return db.user.update({ where: { id: userId }, data: { passwordHash: await hashSenha(nova) } });
}
```

Rodar: `npm run test:int` → PASS.

- [ ] **Step 5: actions de auth** — `src/app/(auth)/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ActionState, runAction } from "@/lib/action-state";
import { cadastroSchema, entrarSchema, senhaSchema } from "@/lib/validation/schemas";
import { autenticar, redefinirSenha, registrar, solicitarResetSenha } from "@/lib/services/usuarios";
import { criarSessao, clearSessionCookie, destruirSessao, getSessionToken, setSessionCookie } from "@/lib/auth/session";
import { emailResetSenha, sendEmail } from "@/lib/services/notificacoes";
import { AppError } from "@/lib/errors";

function primeiraMensagem(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

export async function cadastroAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let userId: string | null = null;
  const result = await runAction(async () => {
    const parsed = cadastroSchema.safeParse({
      codigo: formData.get("codigo"),
      nome: formData.get("nome"),
      email: formData.get("email"),
      telefone: formData.get("telefone"),
      senha: formData.get("senha"),
      respostas: [1, 2, 3, 4].map((i) => formData.get(`q${i}`)),
    });
    if (!parsed.success) throw new AppError(primeiraMensagem(parsed.error));
    const user = await registrar(db, parsed.data);
    userId = user.id;
  });
  if (!result.ok) return result;
  await setSessionCookie(await criarSessao(db, userId!));
  redirect("/");
}

export async function entrarAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let userId: string | null = null;
  const result = await runAction(async () => {
    const parsed = entrarSchema.safeParse({ email: formData.get("email"), senha: formData.get("senha") });
    if (!parsed.success) throw new AppError(primeiraMensagem(parsed.error));
    const user = await autenticar(db, parsed.data.email, parsed.data.senha);
    userId = user.id;
  });
  if (!result.ok) return result;
  await setSessionCookie(await criarSessao(db, userId!));
  redirect("/");
}

export async function sairAction() {
  const token = await getSessionToken();
  if (token) await destruirSessao(db, token);
  await clearSessionCookie();
  redirect("/entrar");
}

export async function esqueciSenhaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const r = await solicitarResetSenha(db, email);
    if (r) {
      const link = `${process.env.APP_URL}/redefinir-senha?token=${r.token}`;
      await sendEmail(r.user.email, emailResetSenha(link));
    }
    // sempre ok — não vaza se o e-mail existe
  });
}

export async function redefinirSenhaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const senha = senhaSchema.safeParse(formData.get("senha"));
    if (!senha.success) throw new AppError(primeiraMensagem(senha.error));
    await redefinirSenha(db, String(formData.get("token") ?? ""), senha.data);
  });
  if (!result.ok) return result;
  redirect("/entrar?redefinida=1");
}
```

- [ ] **Step 6: páginas de auth** — layout + 4 páginas. `src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
      <div className="mb-6 text-center">
        <div className="text-4xl">🎾</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary">PTenis</h1>
        <p className="text-sm text-muted-foreground">Jogos da nossa comunidade</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
```

`src/app/(auth)/entrar/page.tsx` (server) + `form.tsx` (client):

```tsx
// page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntrarForm } from "./form";

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ redefinida?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { redefinida } = await searchParams;
  return (
    <Card>
      <CardHeader><CardTitle>Entrar</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {redefinida && <p className="text-sm text-primary">Senha redefinida! Entre com a nova senha.</p>}
        <EntrarForm />
        <div className="flex justify-between text-sm">
          <Link className="text-muted-foreground underline" href="/esqueci-senha">Esqueci a senha</Link>
          <Link className="font-medium text-primary underline" href="/cadastro">Criar conta</Link>
        </div>
      </CardContent>
    </Card>
  );
}
```

```tsx
// form.tsx
"use client";
import { useActionState } from "react";
import { entrarAction } from "../actions";
import { idle } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EntrarForm() {
  const [state, action, pending] = useActionState(entrarAction, idle);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</Button>
    </form>
  );
}
```

`src/app/(auth)/cadastro/page.tsx` + `form.tsx` — mesmo padrão. O form de cadastro tem: código, nome, e-mail, telefone (com `placeholder="11 91234-5678"`), senha, e as 4 perguntas do questionário renderizadas como `<select name="q1..4">` com as opções de `QUESTIONARIO_NIVEL` (value = índice+1):

```tsx
// cadastro/form.tsx
"use client";
import { useActionState } from "react";
import { cadastroAction } from "../actions";
import { idle } from "@/lib/action-state";
import { QUESTIONARIO_NIVEL } from "@/lib/nivel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const campos = [
  { id: "codigo", label: "Código de convite", type: "text", auto: "off", placeholder: "Pegue no grupo do WhatsApp" },
  { id: "nome", label: "Nome", type: "text", auto: "name", placeholder: "" },
  { id: "email", label: "E-mail", type: "email", auto: "email", placeholder: "" },
  { id: "telefone", label: "WhatsApp (com DDD)", type: "tel", auto: "tel", placeholder: "11 91234-5678" },
  { id: "senha", label: "Senha", type: "password", auto: "new-password", placeholder: "Mínimo 6 caracteres" },
] as const;

export function CadastroForm() {
  const [state, action, pending] = useActionState(cadastroAction, idle);
  return (
    <form action={action} className="space-y-3">
      {campos.map((c) => (
        <div key={c.id} className="space-y-1">
          <Label htmlFor={c.id}>{c.label}</Label>
          <Input id={c.id} name={c.id} type={c.type} autoComplete={c.auto} placeholder={c.placeholder} required />
        </div>
      ))}
      <Separator className="my-4" />
      <p className="text-sm font-medium">Seu nível de jogo (4 perguntas rápidas)</p>
      {QUESTIONARIO_NIVEL.map((p, i) => (
        <div key={p.id} className="space-y-1">
          <Label htmlFor={`q${i + 1}`}>{p.pergunta}</Label>
          <select id={`q${i + 1}`} name={`q${i + 1}`} required defaultValue=""
            className="w-full rounded-lg border border-input bg-background p-2 text-sm">
            <option value="" disabled>Escolha…</option>
            {p.opcoes.map((o, j) => <option key={j} value={j + 1}>{o}</option>)}
          </select>
        </div>
      ))}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Criando…" : "Criar conta"}</Button>
    </form>
  );
}
```

`src/app/(auth)/cadastro/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CadastroForm } from "./form";

export default async function CadastroPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <Card>
      <CardHeader><CardTitle>Criar conta</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <CadastroForm />
        <p className="text-center text-sm">
          Já tem conta? <Link className="font-medium text-primary underline" href="/entrar">Entrar</Link>
        </p>
      </CardContent>
    </Card>
  );
}
```

`src/app/(auth)/esqueci-senha/page.tsx` + `form.tsx`:

```tsx
// page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EsqueciForm } from "./form";

export default function EsqueciSenhaPage() {
  return (
    <Card>
      <CardHeader><CardTitle>Esqueci minha senha</CardTitle></CardHeader>
      <CardContent><EsqueciForm /></CardContent>
    </Card>
  );
}
```

```tsx
// form.tsx
"use client";
import { useActionState } from "react";
import { esqueciSenhaAction } from "../actions";
import { idle } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EsqueciForm() {
  const [state, action, pending] = useActionState(esqueciSenhaAction, idle);
  if (state.ok)
    return <p className="text-sm text-primary">Se o e-mail existir, mandamos o link — vale 1 hora. Confira a caixa de entrada.</p>;
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="email">E-mail da conta</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Enviando…" : "Enviar link"}</Button>
    </form>
  );
}
```

`src/app/(auth)/redefinir-senha/page.tsx` + `form.tsx`:

```tsx
// page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RedefinirForm } from "./form";

export default async function RedefinirSenhaPage({ searchParams }: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <Card>
      <CardHeader><CardTitle>Nova senha</CardTitle></CardHeader>
      <CardContent>
        {token ? <RedefinirForm token={token} /> : <p className="text-sm text-destructive">Link inválido — peça um novo em “Esqueci a senha”.</p>}
      </CardContent>
    </Card>
  );
}
```

```tsx
// form.tsx
"use client";
import { useActionState } from "react";
import { redefinirSenhaAction } from "../actions";
import { idle } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RedefinirForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(redefinirSenhaAction, idle);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1">
        <Label htmlFor="senha">Nova senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="new-password" required />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Salvando…" : "Salvar nova senha"}</Button>
    </form>
  );
}
```

- [ ] **Step 7: verificar manualmente**

```bash
npx tsc --noEmit && npm run dev
```
Abrir http://localhost:3000/cadastro → criar conta com código `PTENIS2026` → deve redirecionar para `/` (página default do Next por enquanto). Conferir log `[email desativado]` ao usar /esqueci-senha.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: cadastro com convite e questionário, login, sessão e reset de senha

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 6: Casca do app — formatação, componentes base, navegação e PWA

**Files:** Create: `src/lib/format.ts`, `tests/unit/format.test.ts`, `src/components/{bottom-nav,avatar-iniciais,nivel-badge,empty-state,confirm-button}.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx` (placeholder), `src/app/manifest.ts`, `public/icon.svg`, `scripts/gen-icons.mjs` · Modify: `src/app/layout.tsx`

- [ ] **Step 1: teste falhando** — `tests/unit/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { corAvatar, formatarDataHora, iniciais, placarTexto } from "@/lib/format";

describe("format", () => {
  it("iniciais e cor estável por nome", () => {
    expect(iniciais("Ana Clara Souza")).toBe("AS");
    expect(iniciais("João")).toBe("J");
    expect(corAvatar("João")).toBe(corAvatar("João"));
  });
  it("data/hora em pt-BR no fuso", () => {
    const s = formatarDataHora(new Date("2026-06-13T13:00:00Z"), "America/Sao_Paulo");
    expect(s).toMatch(/s[áa]b/i);
    expect(s).toContain("10:00");
  });
  it("placar em texto", () => {
    expect(placarTexto([[6, 4], [3, 6], [10, 7]])).toBe("6/4 3/6 [10-7]");
    expect(placarTexto([[8, 6]])).toBe("8/6");
  });
});
```

Rodar: `npm run test` → FAIL.

- [ ] **Step 2: implementar** `src/lib/format.ts`:

```ts
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "?";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

const CORES_AVATAR = [
  "bg-emerald-600", "bg-teal-600", "bg-sky-600", "bg-indigo-600",
  "bg-violet-600", "bg-rose-600", "bg-amber-600", "bg-lime-600",
];
export function corAvatar(nome: string) {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) % 997;
  return CORES_AVATAR[h % CORES_AVATAR.length];
}

export function formatarDataHora(data: Date, tz: string) {
  return formatInTimeZone(data, tz, "EEE, d MMM, HH:mm", { locale: ptBR });
}
export function formatarData(data: Date, tz: string) {
  return formatInTimeZone(data, tz, "d 'de' MMMM", { locale: ptBR });
}

// [[6,4],[3,6],[10,7]] → "6/4 3/6 [10-7]" (match tiebreak entre colchetes)
export function placarTexto(sets: number[][]) {
  return sets
    .map(([a, b]) => (Math.max(a, b) >= 10 ? `[${a}-${b}]` : `${a}/${b}`))
    .join(" ");
}
```

Rodar: `npm run test` → PASS.

- [ ] **Step 3: componentes base**

```tsx
// src/components/avatar-iniciais.tsx
import { cn } from "@/lib/utils";
import { corAvatar, iniciais } from "@/lib/format";

export function AvatarIniciais({ nome, className }: { nome: string; className?: string }) {
  return (
    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white", corAvatar(nome), className)}>
      {iniciais(nome)}
    </div>
  );
}
```

```tsx
// src/components/nivel-badge.tsx
import { Badge } from "@/components/ui/badge";
import { nivelLabel } from "@/lib/nivel";

export function NivelBadge({ nivel }: { nivel: number }) {
  return (
    <Badge variant="secondary" className="gap-1 font-medium">
      <span className="text-primary">N{nivel}</span>
      <span className="text-muted-foreground">{nivelLabel(nivel)}</span>
    </Badge>
  );
}
```

```tsx
// src/components/empty-state.tsx
export function EmptyState({ emoji, titulo, descricao, children }: {
  emoji: string; titulo: string; descricao?: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center">
      <div className="text-4xl">{emoji}</div>
      <p className="font-semibold">{titulo}</p>
      {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      {children}
    </div>
  );
}
```

```tsx
// src/components/confirm-button.tsx — botão que dispara uma Server Action com AlertDialog
"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ActionState } from "@/lib/action-state";

export function ConfirmButton({ titulo, descricao, acao, children, variant = "outline" }: {
  titulo: string; descricao: string;
  acao: () => Promise<ActionState>;
  children: React.ReactNode;
  variant?: "outline" | "destructive" | "default" | "secondary";
}) {
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} disabled={pending} className="w-full">{children}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction onClick={() => start(async () => {
            const r = await acao();
            if (!r.ok && r.error) toast.error(r.error);
          })}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

```tsx
// src/components/bottom-nav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Plus, Trophy, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const itens = [
  { href: "/", icone: Home, rotulo: "Início" },
  { href: "/temporada", icone: Trophy, rotulo: "Temporada" },
  { href: "/jogar", icone: Plus, rotulo: "Jogar", destaque: true },
  { href: "/jogadores", icone: Users, rotulo: "Jogadores" },
  { href: "/perfil", icone: User, rotulo: "Perfil" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-md items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {itens.map(({ href, icone: Icone, rotulo, ...i }) => {
          const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
          if ("destaque" in i && i.destaque) {
            return (
              <Link key={href} href={href} aria-label={rotulo}
                className="-mt-5 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Icone className="size-7" />
              </Link>
            );
          }
          return (
            <Link key={href} href={href}
              className={cn("flex flex-col items-center gap-0.5 px-3 py-2 text-[11px]",
                ativo ? "text-primary" : "text-muted-foreground")}>
              <Icone className="size-5" />
              {rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

(`CalendarDays` fica importado para uso nos cards depois — remova se o lint reclamar.)

- [ ] **Step 4: layouts** — substituir `src/app/layout.tsx` e criar o do grupo (app):

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "PTenis — jogos da comunidade",
  description: "Marque amistosos e dispute a temporada da nossa comunidade de tênis.",
  appleWebApp: { capable: true, title: "PTenis", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#15803d", width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
```

```tsx
// src/app/(app)/layout.tsx
import { requireUser } from "@/lib/auth/current-user";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <main className="p-4">{children}</main>
      <BottomNav />
    </div>
  );
}
```

`src/app/(app)/page.tsx` placeholder (substituída na Task 12):

```tsx
import { EmptyState } from "@/components/empty-state";

export default function InicioPage() {
  return <EmptyState emoji="🎾" titulo="Em construção" descricao="O mural chega já já." />;
}
```

(Apagar a `src/app/page.tsx` original do create-next-app para não conflitar com a rota `(app)/page.tsx`.)

- [ ] **Step 5: PWA** — `public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#15803d"/>
  <circle cx="256" cy="256" r="150" fill="#d9f24f"/>
  <path d="M139 156a150 150 0 0 1 0 200M373 156a150 150 0 0 0 0 200" fill="none" stroke="#15803d" stroke-width="22" stroke-linecap="round"/>
</svg>
```

`scripts/gen-icons.mjs`:

```js
import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });
for (const tamanho of [180, 192, 512]) {
  await sharp("public/icon.svg").resize(tamanho, tamanho).png()
    .toFile(`public/icons/icon-${tamanho}.png`);
}
console.log("Ícones gerados.");
```

```bash
node scripts/gen-icons.mjs
```

`src/app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PTenis",
    short_name: "PTenis",
    description: "Jogos da comunidade de tênis",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf7",
    theme_color: "#15803d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

Em `src/app/layout.tsx`, adicionar ao `metadata`: `icons: { apple: "/icons/icon-180.png" }`.

- [ ] **Step 6: verificar**

```bash
npx tsc --noEmit && npm run build
```
`npm run dev` → logado: barra inferior aparece, aba ativa verde; deslogado: redirect para /entrar.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: navegação inferior, componentes base, tema e PWA

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Fase B — Amistosos (app já útil ao final desta fase)

### Task 7: Regras de placar (puro)

**Files:** Create: `src/lib/placar-rules.ts`, `tests/unit/placar-rules.test.ts`

- [ ] **Step 1: teste falhando** — `tests/unit/placar-rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validarPlacar } from "@/lib/placar-rules";

describe("validarPlacar", () => {
  it("melhor de 3 com match tiebreak", () => {
    expect(validarPlacar("bo3_mtb", [[6, 4], [3, 6], [10, 7]]).vencedor).toBe("A");
    expect(validarPlacar("bo3_mtb", [[4, 6], [6, 7]]).vencedor).toBe("B");
  });
  it("set único e pro-set", () => {
    expect(validarPlacar("set_unico", [[7, 5]]).vencedor).toBe("A");
    expect(validarPlacar("proset8", [[6, 8]]).vencedor).toBe("B");
  });
  it("rejeita placares impossíveis", () => {
    expect(() => validarPlacar("bo3_mtb", [])).toThrow();
    expect(() => validarPlacar("bo3_mtb", [[6, 6]])).toThrow(); // set empatado
    expect(() => validarPlacar("bo3_mtb", [[6, 4], [4, 6]])).toThrow(); // 1-1 sem 3º
    expect(() => validarPlacar("bo3_mtb", [[6, 4], [6, 4], [6, 4], [6, 4]])).toThrow();
    expect(() => validarPlacar("set_unico", [[6, 4], [6, 4]])).toThrow();
    expect(() => validarPlacar("set_unico", [[40, 2]])).toThrow(); // fora da faixa
    expect(() => validarPlacar("bo3_mtb", [[6, 4], [-1, 6], [10, 8]])).toThrow();
  });
});
```

Rodar: `npm run test` → FAIL.

- [ ] **Step 2: implementar** `src/lib/placar-rules.ts` (validação deliberadamente PERMISSIVA — amadores jogam placares tortos; só barramos o impossível):

```ts
import { AppError } from "@/lib/errors";
import type { MatchFormat } from "@prisma/client";

export type Vencedor = "A" | "B";

export function validarPlacar(format: MatchFormat, sets: number[][]): { vencedor: Vencedor } {
  if (!Array.isArray(sets) || sets.length === 0)
    throw new AppError("Informe pelo menos um set.");
  for (const s of sets) {
    if (!Array.isArray(s) || s.length !== 2) throw new AppError("Placar inválido.");
    const [a, b] = s;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 30 || b > 30)
      throw new AppError("Games de 0 a 30 em cada set.");
    if (a === b) throw new AppError("Set não pode terminar empatado.");
  }
  const setsA = sets.filter(([a, b]) => a > b).length;
  const setsB = sets.length - setsA;

  if (format === "set_unico" || format === "proset8") {
    if (sets.length !== 1)
      throw new AppError("Esse formato tem um set só.");
  } else {
    // bo3_mtb
    if (sets.length < 2 || sets.length > 3)
      throw new AppError("Melhor de 3 tem 2 ou 3 sets.");
    if (Math.max(setsA, setsB) < 2)
      throw new AppError("Em melhor de 3, alguém precisa vencer 2 sets.");
  }
  return { vencedor: setsA > setsB ? "A" : "B" };
}
```

Rodar: `npm run test` → PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: validação de placar por formato (bo3+MTB, set único, pro-set)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 8: Serviço de convites (amistoso aberto + combinado)

**Files:** Create: `src/lib/services/convites.ts`, `tests/int/convites.test.ts`

- [ ] **Step 1: teste de integração falhando** — `tests/int/convites.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { aceitarConvite, criarAmistosoCombinado, criarConviteAberto } from "@/lib/services/convites";
import { criarUsuario, resetDb, testDb } from "../helpers/db";

beforeEach(resetDb);
const amanha = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

describe("convite aberto", () => {
  it("cria no mural e outro jogador aceita", async () => {
    const ana = await criarUsuario();
    const beto = await criarUsuario();
    const m = await criarConviteAberto(testDb, {
      criadorId: ana.id, scheduledAt: amanha(), location: "Academia", note: null,
    });
    expect(m.status).toBe("aberto");
    expect(m.type).toBe("amistoso");
    const aceito = await aceitarConvite(testDb, m.id, beto.id);
    expect(aceito.status).toBe("marcado");
    expect(aceito.playerBId).toBe(beto.id);
  });
  it("segundo aceite falha (corrida)", async () => {
    const [a, b, c] = await Promise.all([criarUsuario(), criarUsuario(), criarUsuario()]);
    const m = await criarConviteAberto(testDb, { criadorId: a.id, scheduledAt: amanha(), location: null, note: null });
    await aceitarConvite(testDb, m.id, b.id);
    await expect(aceitarConvite(testDb, m.id, c.id)).rejects.toThrow(/aceito|disponível/i);
  });
  it("criador não aceita o próprio convite; data passada não cria", async () => {
    const a = await criarUsuario();
    const m = await criarConviteAberto(testDb, { criadorId: a.id, scheduledAt: amanha(), location: null, note: null });
    await expect(aceitarConvite(testDb, m.id, a.id)).rejects.toThrow(/próprio/i);
    await expect(
      criarConviteAberto(testDb, { criadorId: a.id, scheduledAt: new Date(Date.now() - 1000), location: null, note: null })
    ).rejects.toThrow(/futuro/i);
  });
});

describe("amistoso combinado", () => {
  it("nasce marcado com os dois jogadores", async () => {
    const a = await criarUsuario();
    const b = await criarUsuario();
    const m = await criarAmistosoCombinado(testDb, {
      criadorId: a.id, parceiroId: b.id, scheduledAt: amanha(), location: "Quadra 2", note: null,
    });
    expect(m.status).toBe("marcado");
    expect([m.playerAId, m.playerBId]).toEqual([a.id, b.id]);
  });
  it("não combina consigo mesmo", async () => {
    const a = await criarUsuario();
    await expect(
      criarAmistosoCombinado(testDb, { criadorId: a.id, parceiroId: a.id, scheduledAt: amanha(), location: null, note: null })
    ).rejects.toThrow();
  });
});
```

Rodar: `npm run test:int` → FAIL.

- [ ] **Step 2: implementar** `src/lib/services/convites.ts`:

```ts
import type { MatchFormat } from "@prisma/client";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { emailAmistosoCombinado, linkJogo, sendEmail } from "@/lib/services/notificacoes";

type NovoJogo = {
  criadorId: string;
  scheduledAt: Date;
  location: string | null;
  note: string | null;
  format?: MatchFormat;
};

function validarData(scheduledAt: Date) {
  if (scheduledAt.getTime() <= Date.now())
    throw new AppError("Escolha uma data no futuro.");
}

export async function criarConviteAberto(db: Db, input: NovoJogo) {
  validarData(input.scheduledAt);
  return db.match.create({
    data: {
      type: "amistoso",
      status: "aberto",
      playerAId: input.criadorId,
      createdById: input.criadorId,
      scheduledAt: input.scheduledAt,
      location: input.location,
      note: input.note,
      format: input.format ?? "bo3_mtb",
    },
  });
}

export async function criarAmistosoCombinado(db: Db, input: NovoJogo & { parceiroId: string }) {
  validarData(input.scheduledAt);
  if (input.parceiroId === input.criadorId)
    throw new AppError("Escolha outra pessoa para jogar.");
  const parceiro = await db.user.findUnique({ where: { id: input.parceiroId } });
  if (!parceiro || !parceiro.isActive) throw new AppError("Jogador não encontrado.");
  const criador = await db.user.findUniqueOrThrow({ where: { id: input.criadorId } });

  const match = await db.match.create({
    data: {
      type: "amistoso",
      status: "marcado",
      playerAId: input.criadorId,
      playerBId: input.parceiroId,
      createdById: input.criadorId,
      scheduledAt: input.scheduledAt,
      location: input.location,
      note: input.note,
      format: input.format ?? "bo3_mtb",
    },
  });
  await sendEmail(parceiro.email, emailAmistosoCombinado(criador.name, linkJogo(match.id)));
  return match;
}

export async function aceitarConvite(db: Db, matchId: string, userId: string) {
  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match || match.type !== "amistoso")
    throw new AppError("Convite não encontrado.");
  if (match.playerAId === userId)
    throw new AppError("Você não pode aceitar o próprio convite.");
  // guard atômico: só vence quem flipar aberto→marcado primeiro
  const { count } = await db.match.updateMany({
    where: { id: matchId, status: "aberto", playerBId: null },
    data: { status: "marcado", playerBId: userId },
  });
  if (count === 0)
    throw new AppError("Esse convite acabou de ser aceito por outra pessoa.");
  return db.match.findUniqueOrThrow({ where: { id: matchId } });
}
```

Rodar: `npm run test:int` → PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: convites de amistoso (aberto no mural e já combinado)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 9: Serviços de jogo e placar (cancelar, lançar, confirmar, contestar, W.O., pendências)

**Files:** Create: `src/lib/services/jogos.ts`, `src/lib/services/placar.ts`, `tests/int/placar.test.ts`

- [ ] **Step 1: teste de integração falhando** — `tests/int/placar.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { criarAmistosoCombinado } from "@/lib/services/convites";
import { cancelarJogo, resolverPendencias } from "@/lib/services/jogos";
import { adminMarcarWO, confirmarPlacar, contestarPlacar, lancarPlacar } from "@/lib/services/placar";
import { criarUsuario, resetDb, testDb } from "../helpers/db";

beforeEach(resetDb);
const amanha = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

async function jogoMarcado() {
  const a = await criarUsuario();
  const b = await criarUsuario();
  const m = await criarAmistosoCombinado(testDb, {
    criadorId: a.id, parceiroId: b.id, scheduledAt: amanha(), location: null, note: null,
  });
  return { a, b, m };
}

describe("placar", () => {
  it("lançar → confirmar atualiza vencedor", async () => {
    const { a, b, m } = await jogoMarcado();
    const lancado = await lancarPlacar(testDb, m.id, a.id, [[6, 4], [6, 2]]);
    expect(lancado.status).toBe("aguardando_confirmacao");
    expect(lancado.winnerId).toBe(a.id);
    const conf = await confirmarPlacar(testDb, m.id, b.id);
    expect(conf.status).toBe("confirmado");
  });
  it("vencedor B quando playerB ganha; quem lançou não confirma", async () => {
    const { a, b, m } = await jogoMarcado();
    const lancado = await lancarPlacar(testDb, m.id, b.id, [[4, 6], [2, 6]]);
    expect(lancado.winnerId).toBe(b.id);
    await expect(confirmarPlacar(testDb, m.id, b.id)).rejects.toThrow(/adversário/i);
  });
  it("contestar limpa o placar e volta a marcado", async () => {
    const { a, b, m } = await jogoMarcado();
    await lancarPlacar(testDb, m.id, a.id, [[6, 0], [6, 0]]);
    const c = await contestarPlacar(testDb, m.id, b.id);
    expect(c.status).toBe("marcado");
    expect(c.score).toBeNull();
    expect(c.winnerId).toBeNull();
  });
  it("não-participante não lança", async () => {
    const { m } = await jogoMarcado();
    const x = await criarUsuario();
    await expect(lancarPlacar(testDb, m.id, x.id, [[6, 0], [6, 0]])).rejects.toThrow();
  });
  it("auto-confirma após 48h via resolverPendencias", async () => {
    const { a, m } = await jogoMarcado();
    await lancarPlacar(testDb, m.id, a.id, [[6, 4], [6, 4]]);
    await testDb.match.update({
      where: { id: m.id },
      data: { reportedAt: new Date(Date.now() - 49 * 60 * 60 * 1000) },
    });
    await resolverPendencias(testDb);
    const depois = await testDb.match.findUniqueOrThrow({ where: { id: m.id } });
    expect(depois.status).toBe("confirmado");
  });
});

describe("cancelar e W.O.", () => {
  it("participante cancela amistoso marcado (terminal)", async () => {
    const { b, m } = await jogoMarcado();
    const c = await cancelarJogo(testDb, m.id, b.id);
    expect(c.status).toBe("cancelado");
  });
  it("cancelar jogo de liga volta a pendente e limpa a proposta", async () => {
    const { a, b } = await jogoMarcado();
    const liga = await testDb.match.create({
      data: {
        type: "liga", status: "marcado", playerAId: a.id, playerBId: b.id,
        createdById: a.id, scheduledAt: amanha(), proposedById: a.id, location: "X",
      },
    });
    const c = await cancelarJogo(testDb, liga.id, a.id);
    expect(c.status).toBe("pendente");
    expect(c.scheduledAt).toBeNull();
    expect(c.proposedById).toBeNull();
  });
  it("W.O. dá vitória sem sets", async () => {
    const { a, b } = await jogoMarcado();
    const liga = await testDb.match.create({
      data: { type: "liga", status: "pendente", playerAId: a.id, playerBId: b.id, createdById: a.id },
    });
    const wo = await adminMarcarWO(testDb, liga.id, a.id);
    expect(wo.status).toBe("wo");
    expect(wo.winnerId).toBe(a.id);
    expect(wo.score).toBeNull();
  });
});
```

Rodar: `npm run test:int` → FAIL.

- [ ] **Step 2: implementar** `src/lib/services/jogos.ts`:

```ts
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function getJogo(db: Db, matchId: string) {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { playerA: true, playerB: true, division: true, season: true },
  });
  if (!match) throw new AppError("Jogo não encontrado.");
  return match;
}

export function ehParticipante(match: { playerAId: string; playerBId: string | null }, userId: string) {
  return match.playerAId === userId || match.playerBId === userId;
}

export async function cancelarJogo(db: Db, matchId: string, userId: string) {
  const match = await getJogo(db, matchId);
  if (!ehParticipante(match, userId))
    throw new AppError("Só quem joga pode cancelar.");
  if (!["aberto", "proposto", "marcado"].includes(match.status))
    throw new AppError("Esse jogo não pode mais ser cancelado.");
  if (match.scheduledAt && match.scheduledAt.getTime() < Date.now() && match.status === "marcado")
    throw new AppError("O jogo já aconteceu — lance o placar ou fale com o admin.");

  if (match.type === "amistoso") {
    return db.match.update({ where: { id: matchId }, data: { status: "cancelado" } });
  }
  // liga/playoff: confronto continua existindo, volta a pendente para remarcar
  return db.match.update({
    where: { id: matchId },
    data: { status: "pendente", scheduledAt: null, location: null, proposedById: null },
  });
}

// Chamada preguiçosa nas páginas principais (sem cron no MVP).
// A Task 17 estende isto para criar finais de playoff prontas.
export async function resolverPendencias(db: Db) {
  const limite = new Date(Date.now() - 48 * 60 * 60 * 1000);
  await db.match.updateMany({
    where: { status: "aguardando_confirmacao", reportedAt: { lt: limite } },
    data: { status: "confirmado", confirmedAt: new Date() },
  });
}
```

- [ ] **Step 3: implementar** `src/lib/services/placar.ts`:

```ts
import { Prisma } from "@prisma/client";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { validarPlacar } from "@/lib/placar-rules";
import { ehParticipante, getJogo } from "@/lib/services/jogos";
import { emailPlacarParaConfirmar, linkJogo, sendEmail } from "@/lib/services/notificacoes";

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

export async function lancarPlacar(db: Db, matchId: string, userId: string, sets: number[][]) {
  const match = await getJogo(db, matchId);
  if (!ehParticipante(match, userId) || !match.playerBId)
    throw new AppError("Só quem jogou pode lançar o placar.");
  if (match.status !== "marcado")
    throw new AppError("Esse jogo não está aguardando placar.");
  if (
    match.type === "amistoso" &&
    match.scheduledAt &&
    Date.now() > match.scheduledAt.getTime() + SETE_DIAS_MS
  )
    throw new AppError("O prazo de 7 dias para lançar o placar passou.");

  const { vencedor } = validarPlacar(match.format, sets);
  const winnerId = vencedor === "A" ? match.playerAId : match.playerBId;
  const atualizado = await db.match.update({
    where: { id: matchId },
    data: {
      status: "aguardando_confirmacao",
      score: sets,
      winnerId,
      reportedById: userId,
      reportedAt: new Date(),
    },
  });
  const oponente = match.playerAId === userId ? match.playerB! : match.playerA;
  const autor = match.playerAId === userId ? match.playerA : match.playerB!;
  await sendEmail(oponente.email, emailPlacarParaConfirmar(autor.name, linkJogo(matchId)));
  return atualizado;
}

function exigirOponenteDoLancamento(match: { reportedById: string | null; playerAId: string; playerBId: string | null }, userId: string) {
  if (!ehParticipante(match, userId) || match.reportedById === userId)
    throw new AppError("Só o adversário pode responder ao placar lançado.");
}

export async function confirmarPlacar(db: Db, matchId: string, userId: string) {
  const match = await getJogo(db, matchId);
  if (match.status !== "aguardando_confirmacao")
    throw new AppError("Não há placar aguardando confirmação.");
  exigirOponenteDoLancamento(match, userId);
  const { count } = await db.match.updateMany({
    where: { id: matchId, status: "aguardando_confirmacao" },
    data: { status: "confirmado", confirmedAt: new Date() },
  });
  if (count === 0) throw new AppError("Esse placar já foi resolvido.");
  return db.match.findUniqueOrThrow({ where: { id: matchId } });
}

export async function contestarPlacar(db: Db, matchId: string, userId: string) {
  const match = await getJogo(db, matchId);
  if (match.status !== "aguardando_confirmacao")
    throw new AppError("Não há placar aguardando confirmação.");
  exigirOponenteDoLancamento(match, userId);
  return db.match.update({
    where: { id: matchId },
    data: { status: "marcado", score: Prisma.DbNull, winnerId: null, reportedById: null, reportedAt: null },
  });
}

// Ações de admin — o gate de permissão é feito na Server Action (requireAdmin).
export async function adminDefinirPlacar(db: Db, matchId: string, sets: number[][]) {
  const match = await getJogo(db, matchId);
  if (!match.playerBId) throw new AppError("Jogo sem os dois jogadores definidos.");
  if (["cancelado"].includes(match.status)) throw new AppError("Jogo cancelado não recebe placar.");
  const { vencedor } = validarPlacar(match.format, sets);
  return db.match.update({
    where: { id: matchId },
    data: {
      status: "confirmado",
      score: sets,
      winnerId: vencedor === "A" ? match.playerAId : match.playerBId,
      confirmedAt: new Date(),
    },
  });
}

export async function adminMarcarWO(db: Db, matchId: string, vencedorId: string) {
  const match = await getJogo(db, matchId);
  if (match.type === "amistoso") throw new AppError("W.O. é só para jogos de liga/playoff.");
  if (!match.playerBId || !ehParticipante(match, vencedorId))
    throw new AppError("Vencedor do W.O. precisa ser um dos dois jogadores.");
  if (["confirmado", "cancelado", "wo"].includes(match.status))
    throw new AppError("Esse jogo já foi resolvido.");
  return db.match.update({
    where: { id: matchId },
    data: { status: "wo", winnerId: vencedorId, score: Prisma.DbNull, confirmedAt: new Date() },
  });
}
```

Rodar: `npm run test:int` → PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: lançar/confirmar/contestar placar, cancelamento, W.O. e auto-confirmação 48h

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 10: Página Início — o mural

**Files:** Create: `src/lib/settings.ts`, `src/components/jogo-card.tsx`, `src/components/aceitar-convite-button.tsx`, `src/app/(app)/actions.ts` · Modify: `src/app/(app)/page.tsx`, `src/app/(app)/layout.tsx`

- [ ] **Step 1: settings + pendências no layout**

```ts
// src/lib/settings.ts
import { cache } from "react";
import { db } from "@/lib/db";

export const getSettings = cache(() => db.appSettings.findUniqueOrThrow({ where: { id: 1 } }));
```

Em `src/app/(app)/layout.tsx`, antes do `return`, adicionar (resolve auto-confirmações de 48h a cada navegação — sem cron):

```ts
import { db } from "@/lib/db";
import { resolverPendencias } from "@/lib/services/jogos";
// dentro do componente, após requireUser():
await resolverPendencias(db);
```

- [ ] **Step 2: ações compartilhadas** — `src/app/(app)/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { runAction, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/current-user";
import { aceitarConvite } from "@/lib/services/convites";
import { cancelarJogo } from "@/lib/services/jogos";
import { confirmarPlacar, contestarPlacar, lancarPlacar } from "@/lib/services/placar";

export async function aceitarConviteAction(matchId: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await aceitarConvite(db, matchId, user.id);
  });
  revalidatePath("/", "layout");
  return r;
}

export async function cancelarJogoAction(matchId: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await cancelarJogo(db, matchId, user.id);
  });
  revalidatePath("/", "layout");
  return r;
}

export async function lancarPlacarAction(matchId: string, sets: number[][]): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await lancarPlacar(db, matchId, user.id, sets);
  });
  revalidatePath("/", "layout");
  return r;
}

export async function confirmarPlacarAction(matchId: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await confirmarPlacar(db, matchId, user.id);
  });
  revalidatePath("/", "layout");
  return r;
}

export async function contestarPlacarAction(matchId: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await contestarPlacar(db, matchId, user.id);
  });
  revalidatePath("/", "layout");
  return r;
}
```

- [ ] **Step 3: JogoCard + botão de aceitar**

```tsx
// src/components/jogo-card.tsx (server component)
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { Match, User } from "@prisma/client";
import { AvatarIniciais } from "@/components/avatar-iniciais";
import { NivelBadge } from "@/components/nivel-badge";
import { Badge } from "@/components/ui/badge";
import { formatarDataHora, placarTexto } from "@/lib/format";

export type MatchComJogadores = Match & { playerA: User; playerB: User | null };

const TIPO_LABEL = { amistoso: "Amistoso", liga: "Liga", playoff: "Playoff" } as const;
const STATUS_LABEL: Record<string, string> = {
  aberto: "Procurando parceiro",
  proposto: "Proposta de data",
  marcado: "Marcado",
  aguardando_confirmacao: "Placar a confirmar",
  confirmado: "Finalizado",
  pendente: "Sem data",
  cancelado: "Cancelado",
  wo: "W.O.",
};

export function JogoCard({ match, tz, children }: {
  match: MatchComJogadores; tz: string; children?: React.ReactNode;
}) {
  const aberto = match.status === "aberto";
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <Badge variant={match.type === "amistoso" ? "secondary" : "default"}>
          {TIPO_LABEL[match.type]}
        </Badge>
        <span className="text-xs text-muted-foreground">{STATUS_LABEL[match.status]}</span>
      </div>

      <Link href={`/jogo/${match.id}`} className="mt-3 block">
        <div className="flex items-center gap-3">
          <AvatarIniciais nome={match.playerA.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {match.playerA.name}
              {match.playerB && <span className="text-muted-foreground"> vs </span>}
              {match.playerB?.name}
            </p>
            {aberto && <NivelBadge nivel={match.playerA.level} />}
            {match.score != null && (
              <p className="text-sm font-medium text-primary">{placarTexto(match.score as number[][])}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {match.scheduledAt && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-4" />
              {formatarDataHora(match.scheduledAt, tz)}
            </span>
          )}
          {match.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" />{match.location}
            </span>
          )}
        </div>
        {match.note && <p className="mt-2 text-sm text-muted-foreground">“{match.note}”</p>}
      </Link>

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
```

```tsx
// src/components/aceitar-convite-button.tsx
"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { aceitarConviteAction } from "@/app/(app)/actions";

export function AceitarConviteButton({ matchId }: { matchId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      className="w-full font-semibold"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await aceitarConviteAction(matchId);
          if (r.ok) toast.success("Jogo marcado! 🎾");
          else if (r.error) toast.error(r.error);
        })
      }
    >
      {pending ? "Entrando…" : "Topo jogar!"}
    </Button>
  );
}
```

- [ ] **Step 4: a página** — substituir `src/app/(app)/page.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/settings";
import { JogoCard } from "@/components/jogo-card";
import { AceitarConviteButton } from "@/components/aceitar-convite-button";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default async function InicioPage() {
  const user = await requireUser();
  const { timezone, communityName } = await getSettings();
  const agora = new Date();

  const [pendencias, convites, proximos] = await Promise.all([
    db.match.findMany({
      where: {
        OR: [
          { status: "aguardando_confirmacao", reportedById: { not: user.id }, OR: [{ playerAId: user.id }, { playerBId: user.id }] },
          { status: "proposto", proposedById: { not: user.id }, OR: [{ playerAId: user.id }, { playerBId: user.id }] },
        ],
      },
      include: { playerA: true, playerB: true },
      orderBy: { createdAt: "asc" },
    }),
    db.match.findMany({
      where: { status: "aberto", scheduledAt: { gt: agora }, playerAId: { not: user.id } },
      include: { playerA: true, playerB: true },
      orderBy: { scheduledAt: "asc" },
    }),
    db.match.findMany({
      where: {
        OR: [{ playerAId: user.id }, { playerBId: user.id }],
        status: { in: ["aberto", "marcado", "proposto"] },
        // jogos com data passada saem dos "próximos" (viram histórico/pendência de placar)
        AND: [{ OR: [{ scheduledAt: null }, { scheduledAt: { gte: agora } }] }],
      },
      include: { playerA: true, playerB: true },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{communityName}</p>
        <h1 className="text-xl font-bold">Olá, {user.name.split(" ")[0]}! 🎾</h1>
      </header>

      {pendencias.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-amber-700">Para você resolver</h2>
          {pendencias.map((m) => <JogoCard key={m.id} match={m} tz={timezone} />)}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Convites abertos</h2>
        {convites.length === 0 ? (
          <EmptyState emoji="📭" titulo="Nenhum convite aberto" descricao="Que tal puxar o primeiro jogo?">
            <Button asChild size="sm"><Link href="/jogar">Criar convite</Link></Button>
          </EmptyState>
        ) : (
          convites.map((m) => (
            <JogoCard key={m.id} match={m} tz={timezone}>
              <AceitarConviteButton matchId={m.id} />
            </JogoCard>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Seus próximos jogos</h2>
        {proximos.length === 0 ? (
          <EmptyState emoji="🗓️" titulo="Nada marcado ainda" />
        ) : (
          proximos.map((m) => <JogoCard key={m.id} match={m} tz={timezone} />)
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 5: verificar e commitar**

```bash
npx tsc --noEmit && npm run build
```
Manual: criar convite via Prisma Studio (`npx prisma studio`) ou esperar a Task 11; com 2 contas, aceitar convite e ver "Jogo marcado!".

```bash
git add -A && git commit -m "feat: mural de convites, pendências e próximos jogos no Início

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 11: Página Jogar — criar amistosos

**Files:** Create: `src/app/(app)/jogar/page.tsx`, `src/app/(app)/jogar/actions.ts`, `src/app/(app)/jogar/forms.tsx`

- [ ] **Step 1: actions** — `src/app/(app)/jogar/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { runAction, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/current-user";
import { criarAmistosoCombinado, criarConviteAberto } from "@/lib/services/convites";
import { getSettings } from "@/lib/settings";
import { fromZonedTime } from "date-fns-tz";

const baseSchema = z.object({
  quando: z.string().min(1, "Escolha data e hora."), // datetime-local: "2026-06-13T10:00"
  local: z.string().trim().max(80).optional(),
  observacao: z.string().trim().max(200).optional(),
  formato: z.enum(["bo3_mtb", "set_unico", "proset8"]).default("bo3_mtb"),
});

async function parseQuando(quando: string) {
  const { timezone } = await getSettings();
  const data = fromZonedTime(quando, timezone); // input local da comunidade → UTC
  if (isNaN(data.getTime())) throw new AppError("Data inválida.");
  return data;
}

export async function criarConviteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  let id: string | null = null;
  const r = await runAction(async () => {
    const parsed = baseSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
    const m = await criarConviteAberto(db, {
      criadorId: user.id,
      scheduledAt: await parseQuando(parsed.data.quando),
      location: parsed.data.local || null,
      note: parsed.data.observacao || null,
      format: parsed.data.formato,
    });
    id = m.id;
  });
  if (!r.ok) return r;
  revalidatePath("/", "layout");
  redirect(`/jogo/${id}`);
}

export async function criarCombinadoAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  let id: string | null = null;
  const r = await runAction(async () => {
    const parsed = baseSchema.extend({ parceiroId: z.string().min(1, "Escolha o parceiro.") })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
    const m = await criarAmistosoCombinado(db, {
      criadorId: user.id,
      parceiroId: parsed.data.parceiroId,
      scheduledAt: await parseQuando(parsed.data.quando),
      location: parsed.data.local || null,
      note: parsed.data.observacao || null,
      format: parsed.data.formato,
    });
    id = m.id;
  });
  if (!r.ok) return r;
  revalidatePath("/", "layout");
  redirect(`/jogo/${id}`);
}
```

- [ ] **Step 2: página com abas + forms** — `src/app/(app)/jogar/page.tsx`:

```tsx
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { CombinadoForm, ConviteForm } from "./forms";

export default async function JogarPage() {
  const user = await requireUser();
  const jogadores = await db.user.findMany({
    where: { isActive: true, id: { not: user.id } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, level: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Puxar um jogo</h1>
      <Tabs defaultValue="aberto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="aberto">Convite</TabsTrigger>
          <TabsTrigger value="combinado">Combinado</TabsTrigger>
          <TabsTrigger value="liga">Liga</TabsTrigger>
        </TabsList>
        <TabsContent value="aberto" className="pt-2">
          <p className="mb-3 text-sm text-muted-foreground">
            Publica no mural — o primeiro que topar joga com você.
          </p>
          <ConviteForm />
        </TabsContent>
        <TabsContent value="combinado" className="pt-2">
          <p className="mb-3 text-sm text-muted-foreground">
            Já achou parceiro (no grupo, por exemplo)? Salva aqui o jogo de vocês.
          </p>
          <CombinadoForm jogadores={jogadores} />
        </TabsContent>
        <TabsContent value="liga" className="pt-2">
          <EmptyState emoji="🏆" titulo="Temporadas chegam em breve"
            descricao="Os jogos da liga aparecem aqui quando você estiver numa divisão." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

(A aba "Liga" é substituída por conteúdo real na Task 20.)

`src/app/(app)/jogar/forms.tsx`:

```tsx
"use client";
import { useActionState } from "react";
import { idle } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { criarCombinadoAction, criarConviteAction } from "./actions";

function CamposComuns() {
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="quando">Quando</Label>
        <Input id="quando" name="quando" type="datetime-local" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="local">Onde (opcional)</Label>
        <Input id="local" name="local" placeholder="Ex.: Quadra 1 da academia" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="formato">Formato</Label>
        <select id="formato" name="formato" defaultValue="bo3_mtb"
          className="w-full rounded-lg border border-input bg-background p-2 text-sm">
          <option value="bo3_mtb">Melhor de 3 (match tiebreak no 3º)</option>
          <option value="set_unico">Set único</option>
          <option value="proset8">Pro-set de 8 games</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="observacao">Observação (opcional)</Label>
        <Textarea id="observacao" name="observacao" placeholder="Ex.: só bater bola, levo as bolas" />
      </div>
    </>
  );
}

export function ConviteForm() {
  const [state, action, pending] = useActionState(criarConviteAction, idle);
  return (
    <form action={action} className="space-y-3">
      <CamposComuns />
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Publicando…" : "Publicar no mural"}</Button>
    </form>
  );
}

export function CombinadoForm({ jogadores }: { jogadores: { id: string; name: string; level: number }[] }) {
  const [state, action, pending] = useActionState(criarCombinadoAction, idle);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="parceiroId">Parceiro</Label>
        <select id="parceiroId" name="parceiroId" required defaultValue=""
          className="w-full rounded-lg border border-input bg-background p-2 text-sm">
          <option value="" disabled>Escolha…</option>
          {jogadores.map((j) => (
            <option key={j.id} value={j.id}>{j.name} (N{j.level})</option>
          ))}
        </select>
      </div>
      <CamposComuns />
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Salvando…" : "Salvar jogo"}</Button>
    </form>
  );
}
```

- [ ] **Step 3: verificar e commitar**

```bash
npx tsc --noEmit && npm run build
```
Manual: criar convite aberto → redireciona pro detalhe (404 por enquanto — página vem na Task 12, tudo bem); convite aparece no Início da outra conta.

```bash
git add -A && git commit -m "feat: criação de amistoso aberto e combinado na aba Jogar

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 12: Página do jogo (detalhe + placar)

**Files:** Create: `src/app/(app)/jogo/[id]/page.tsx`, `src/components/placar-form.tsx`, `src/components/responder-placar.tsx`

- [ ] **Step 1: PlacarForm (client)** — `src/components/placar-form.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { MatchFormat } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lancarPlacarAction } from "@/app/(app)/actions";

export function PlacarForm({ matchId, format, nomeA, nomeB }: {
  matchId: string; format: MatchFormat; nomeA: string; nomeB: string;
}) {
  const linhas = format === "bo3_mtb" ? [0, 1, 2] : [0];
  const [valores, setValores] = useState<string[][]>(linhas.map(() => ["", ""]));
  const [pending, start] = useTransition();

  function enviar() {
    const sets = valores
      .filter(([a, b]) => a !== "" && b !== "")
      .map(([a, b]) => [Number(a), Number(b)]);
    start(async () => {
      const r = await lancarPlacarAction(matchId, sets);
      if (r.ok) toast.success("Placar lançado! O adversário tem 48h para confirmar.");
      else if (r.error) toast.error(r.error);
    });
  }

  return (
    <div className="space-y-2 rounded-2xl border bg-card p-4">
      <p className="font-semibold">Lançar placar</p>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-sm">
        <span />
        <span className="w-14 text-center text-muted-foreground">{nomeA.split(" ")[0]}</span>
        <span className="w-14 text-center text-muted-foreground">{nomeB.split(" ")[0]}</span>
        {linhas.map((i) => (
          <FragmentoSet key={i} rotulo={format === "bo3_mtb" && i === 2 ? "Match TB" : `Set ${i + 1}`}
            valores={valores[i]}
            onChange={(lado, v) =>
              setValores((prev) => prev.map((linha, j) => (j === i ? linha.map((x, k) => (k === lado ? v : x)) as string[] : linha)))
            } />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Deixe em branco os sets que não aconteceram.</p>
      <Button className="w-full" onClick={enviar} disabled={pending}>
        {pending ? "Enviando…" : "Enviar placar"}
      </Button>
    </div>
  );
}

function FragmentoSet({ rotulo, valores, onChange }: {
  rotulo: string; valores: string[]; onChange: (lado: number, v: string) => void;
}) {
  return (
    <>
      <span className="text-muted-foreground">{rotulo}</span>
      {[0, 1].map((lado) => (
        <Input key={lado} type="number" inputMode="numeric" min={0} max={30}
          className="w-14 text-center" value={valores[lado]}
          onChange={(e) => onChange(lado, e.target.value)} />
      ))}
    </>
  );
}
```

- [ ] **Step 2: botões de confirmar/contestar** — `src/components/responder-placar.tsx`:

```tsx
"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { confirmarPlacarAction, contestarPlacarAction } from "@/app/(app)/actions";

export function ResponderPlacar({ matchId }: { matchId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <Button className="w-full" disabled={pending}
        onClick={() => start(async () => {
          const r = await confirmarPlacarAction(matchId);
          if (r.ok) toast.success("Placar confirmado!");
          else if (r.error) toast.error(r.error);
        })}>
        Confirmar placar
      </Button>
      <ConfirmButton titulo="Contestar placar?"
        descricao="O placar lançado será descartado e o jogo volta para 'marcado'. Persistindo a divergência, o admin resolve."
        acao={() => contestarPlacarAction(matchId)}>
        Contestar
      </ConfirmButton>
    </div>
  );
}
```

- [ ] **Step 3: página do jogo** — `src/app/(app)/jogo/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/settings";
import { JogoCard } from "@/components/jogo-card";
import { PlacarForm } from "@/components/placar-form";
import { ResponderPlacar } from "@/components/responder-placar";
import { AceitarConviteButton } from "@/components/aceitar-convite-button";
import { ConfirmButton } from "@/components/confirm-button";
import { cancelarJogoAction } from "@/app/(app)/actions";

export default async function JogoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const { timezone } = await getSettings();
  const match = await db.match.findUnique({
    where: { id },
    include: { playerA: true, playerB: true, division: true },
  });
  if (!match) notFound();

  const souParticipante = match.playerAId === user.id || match.playerBId === user.id;
  const cancelarPossivel =
    souParticipante &&
    ["aberto", "proposto", "marcado"].includes(match.status) &&
    !(match.scheduledAt && match.scheduledAt.getTime() < Date.now() && match.status === "marcado");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Jogo</h1>
      <JogoCard match={match} tz={timezone} />

      {match.status === "confirmado" && match.winnerId && (
        <p className="rounded-2xl bg-accent p-4 text-center font-semibold text-accent-foreground">
          🏆 Vitória de {match.winnerId === match.playerAId ? match.playerA.name : match.playerB?.name}
        </p>
      )}
      {match.status === "wo" && match.winnerId && (
        <p className="rounded-2xl bg-muted p-4 text-center text-sm">
          W.O. — vitória de {match.winnerId === match.playerAId ? match.playerA.name : match.playerB?.name}
        </p>
      )}

      {match.status === "aberto" && !souParticipante && <AceitarConviteButton matchId={match.id} />}

      {match.status === "marcado" && souParticipante && match.playerB && (
        <PlacarForm matchId={match.id} format={match.format}
          nomeA={match.playerA.name} nomeB={match.playerB.name} />
      )}

      {match.status === "aguardando_confirmacao" && souParticipante && (
        match.reportedById === user.id ? (
          <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Aguardando o adversário confirmar (confirma sozinho em 48h).
          </p>
        ) : (
          <ResponderPlacar matchId={match.id} />
        )
      )}

      {cancelarPossivel && (
        <ConfirmButton titulo="Cancelar este jogo?"
          descricao={match.type === "amistoso"
            ? "O jogo será cancelado e o outro jogador fica sabendo."
            : "A data combinada será desfeita e o confronto volta para a lista de pendentes."}
          acao={cancelarJogoAction.bind(null, match.id)} variant="destructive">
          {match.type === "amistoso" ? "Cancelar jogo" : "Desfazer data"}
        </ConfirmButton>
      )}
    </div>
  );
}
```

(Os estados `pendente`/`proposto` de liga ganham ações de proposta de data na Task 20 — por enquanto o card já mostra o status.)

- [ ] **Step 4: verificar e commitar**

```bash
npx tsc --noEmit && npm run build
```
Manual com 2 contas: convite → aceitar → lançar placar → confirmar na outra conta → "🏆 Vitória de…".

```bash
git add -A && git commit -m "feat: página do jogo com ciclo completo de placar

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 13: Jogadores, perfil público e meu perfil

**Files:** Create: `src/app/(app)/jogadores/page.tsx`, `src/app/(app)/jogadores/[id]/page.tsx`, `src/app/(app)/perfil/page.tsx`, `src/app/(app)/perfil/editar/page.tsx`, `src/app/(app)/perfil/editar/forms.tsx`, `src/app/(app)/perfil/actions.ts`, `src/lib/stats.ts`

- [ ] **Step 1: stats compartilhadas** — `src/lib/stats.ts`:

```ts
import type { Db } from "@/lib/db";

export async function statsDoJogador(db: Db, userId: string) {
  const meus = { OR: [{ playerAId: userId }, { playerBId: userId }] };
  const jogos = await db.match.findMany({
    where: { ...meus, status: { in: ["confirmado", "wo"] } },
    include: { playerA: true, playerB: true },
    orderBy: { confirmedAt: "desc" },
  });
  // amistosos jogados sem placar entram no histórico (spec §4), mas não nas estatísticas
  const jogadosSemPlacar = await db.match.findMany({
    where: { ...meus, type: "amistoso", status: "marcado", scheduledAt: { lt: new Date() } },
    include: { playerA: true, playerB: true },
    orderBy: { scheduledAt: "desc" },
  });
  const vitorias = jogos.filter((m) => m.winnerId === userId).length;
  return {
    jogos,
    historico: [...jogadosSemPlacar, ...jogos],
    total: jogos.length,
    vitorias,
    derrotas: jogos.length - vitorias,
  };
}

export function headToHead(jogos: { winnerId: string | null; playerAId: string; playerBId: string | null }[], euId: string, outroId: string) {
  const entreNos = jogos.filter(
    (m) =>
      (m.playerAId === euId && m.playerBId === outroId) ||
      (m.playerAId === outroId && m.playerBId === euId)
  );
  return {
    total: entreNos.length,
    minhas: entreNos.filter((m) => m.winnerId === euId).length,
    dele: entreNos.filter((m) => m.winnerId === outroId).length,
  };
}

export async function trofeus(db: Db, userId: string) {
  return db.divisionPlayer.findMany({
    where: { userId, finalPosition: 1, division: { season: { status: "encerrada" } } },
    include: { division: { include: { season: true } } },
  });
}
```

- [ ] **Step 2: lista de jogadores** — `src/app/(app)/jogadores/page.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { AvatarIniciais } from "@/components/avatar-iniciais";
import { NivelBadge } from "@/components/nivel-badge";

export default async function JogadoresPage() {
  await requireUser();
  const jogadores = await db.user.findMany({
    where: { isActive: true },
    orderBy: [{ level: "desc" }, { name: "asc" }],
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Jogadores ({jogadores.length})</h1>
      <div className="divide-y rounded-2xl border bg-card">
        {jogadores.map((j) => (
          <Link key={j.id} href={`/jogadores/${j.id}`} className="flex items-center gap-3 p-3">
            <AvatarIniciais nome={j.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{j.name}</p>
              {Array.isArray(j.availability) && j.availability.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  Joga: {(j.availability as string[]).join(" · ")}
                </p>
              )}
            </div>
            <NivelBadge nivel={j.level} />
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: perfil público** — `src/app/(app)/jogadores/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/settings";
import { headToHead, statsDoJogador, trofeus } from "@/lib/stats";
import { AvatarIniciais } from "@/components/avatar-iniciais";
import { NivelBadge } from "@/components/nivel-badge";
import { JogoCard } from "@/components/jogo-card";
import { EmptyState } from "@/components/empty-state";

export default async function PerfilPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eu = await requireUser();
  const { timezone } = await getSettings();
  const jogador = await db.user.findUnique({ where: { id, isActive: true } });
  if (!jogador) notFound();

  const { jogos, historico, total, vitorias, derrotas } = await statsDoJogador(db, jogador.id);
  const h2h = eu.id !== jogador.id ? headToHead(jogos, eu.id, jogador.id) : null;
  const titulos = await trofeus(db, jogador.id);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <AvatarIniciais nome={jogador.name} className="size-16 text-xl" />
        <div>
          <h1 className="text-xl font-bold">{jogador.name}</h1>
          <NivelBadge nivel={jogador.level} />
        </div>
      </header>

      {titulos.length > 0 && (
        <div className="space-y-1 rounded-2xl bg-accent p-4">
          {titulos.map((t) => (
            <p key={t.divisionId} className="text-sm font-semibold text-accent-foreground">
              🏆 Campeão {t.division.name} — {t.division.season.name}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        {[{ n: total, l: "jogos" }, { n: vitorias, l: "vitórias" }, { n: derrotas, l: "derrotas" }].map((s) => (
          <div key={s.l} className="rounded-2xl border bg-card p-3">
            <p className="text-2xl font-bold text-primary">{s.n}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      {h2h && h2h.total > 0 && (
        <p className="rounded-2xl border bg-card p-4 text-center text-sm">
          Contra você: <strong>{h2h.dele} × {h2h.minhas}</strong> em {h2h.total} jogo{h2h.total > 1 ? "s" : ""}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Últimos jogos</h2>
        {historico.length === 0
          ? <EmptyState emoji="🎾" titulo="Ainda sem jogos" />
          : historico.slice(0, 10).map((m) => <JogoCard key={m.id} match={m} tz={timezone} />)}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: meu perfil + edição** — `src/app/(app)/perfil/page.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/settings";
import { statsDoJogador, trofeus } from "@/lib/stats";
import { sairAction } from "@/app/(auth)/actions";
import { AvatarIniciais } from "@/components/avatar-iniciais";
import { NivelBadge } from "@/components/nivel-badge";
import { JogoCard } from "@/components/jogo-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default async function PerfilPage() {
  const user = await requireUser();
  const { timezone } = await getSettings();
  const { historico, total, vitorias, derrotas } = await statsDoJogador(db, user.id);
  const titulos = await trofeus(db, user.id);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <AvatarIniciais nome={user.name} className="size-16 text-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{user.name}</h1>
          <NivelBadge nivel={user.level} />
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/perfil/editar">Editar</Link></Button>
      </header>

      {user.isAdmin && (
        <Link href="/admin" className="block rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <p className="font-semibold text-primary">⚙️ Painel do admin</p>
          <p className="text-sm text-muted-foreground">Temporadas, usuários e configurações</p>
        </Link>
      )}

      {titulos.length > 0 && (
        <div className="space-y-1 rounded-2xl bg-accent p-4">
          {titulos.map((t) => (
            <p key={t.divisionId} className="text-sm font-semibold text-accent-foreground">
              🏆 Campeão {t.division.name} — {t.division.season.name}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        {[{ n: total, l: "jogos" }, { n: vitorias, l: "vitórias" }, { n: derrotas, l: "derrotas" }].map((s) => (
          <div key={s.l} className="rounded-2xl border bg-card p-3">
            <p className="text-2xl font-bold text-primary">{s.n}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Seu histórico</h2>
        {historico.length === 0
          ? <EmptyState emoji="🎾" titulo="Ainda sem jogos" descricao="Bora puxar o primeiro na aba Jogar!" />
          : historico.slice(0, 10).map((m) => <JogoCard key={m.id} match={m} tz={timezone} />)}
      </section>

      <form action={sairAction}>
        <Button variant="outline" className="w-full text-muted-foreground">Sair da conta</Button>
      </form>
    </div>
  );
}
```

`src/app/(app)/perfil/editar/page.tsx`:

```tsx
import { requireUser } from "@/lib/auth/current-user";
import { Separator } from "@/components/ui/separator";
import { PerfilForm, SenhaForm } from "./forms";

export default async function EditarPerfilPage() {
  const user = await requireUser();
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Editar perfil</h1>
      <PerfilForm nome={user.name} telefone={user.phone}
        disponibilidade={Array.isArray(user.availability) ? (user.availability as string[]) : []} />
      <Separator />
      <SenhaForm />
    </div>
  );
}
```

`src/app/(app)/perfil/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { runAction, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/current-user";
import { perfilSchema, senhaSchema } from "@/lib/validation/schemas";
import { alterarSenha, atualizarPerfil } from "@/lib/services/usuarios";

export async function atualizarPerfilAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    const parsed = perfilSchema.safeParse({
      nome: formData.get("nome"),
      telefone: formData.get("telefone"),
      availability: formData.getAll("disponibilidade").map(String),
    });
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
    await atualizarPerfil(db, user.id, parsed.data);
  });
  revalidatePath("/", "layout");
  return r;
}

export async function alterarSenhaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    const nova = senhaSchema.safeParse(formData.get("nova"));
    if (!nova.success) throw new AppError(nova.error.issues[0].message);
    await alterarSenha(db, user.id, String(formData.get("atual") ?? ""), nova.data);
  });
}
```

`src/app/(app)/perfil/editar/page.tsx` (server: passa `user` pro form) + `forms.tsx` (client):

```tsx
// forms.tsx
"use client";
import { useActionState } from "react";
import { toast } from "sonner";
import { useEffect } from "react";
import { idle } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { alterarSenhaAction, atualizarPerfilAction } from "../actions";

export const OPCOES_DISPONIBILIDADE = [
  "seg", "ter", "qua", "qui", "sex", "sáb", "dom", "manhã", "tarde", "noite",
];

export function PerfilForm({ nome, telefone, disponibilidade }: {
  nome: string; telefone: string; disponibilidade: string[];
}) {
  const [state, action, pending] = useActionState(atualizarPerfilAction, idle);
  useEffect(() => { if (state.ok) toast.success("Perfil atualizado!"); }, [state]);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={nome} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="telefone">WhatsApp</Label>
        <Input id="telefone" name="telefone" type="tel" defaultValue={telefone} required />
      </div>
      <div className="space-y-1">
        <Label>Quando você costuma jogar?</Label>
        <div className="flex flex-wrap gap-2">
          {OPCOES_DISPONIBILIDADE.map((o) => (
            <label key={o} className="cursor-pointer">
              <input type="checkbox" name="disponibilidade" value={o}
                defaultChecked={disponibilidade.includes(o)} className="peer sr-only" />
              <span className="inline-block rounded-full border px-3 py-1 text-sm peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                {o}
              </span>
            </label>
          ))}
        </div>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
    </form>
  );
}

export function SenhaForm() {
  const [state, action, pending] = useActionState(alterarSenhaAction, idle);
  useEffect(() => { if (state.ok) toast.success("Senha alterada!"); }, [state]);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="atual">Senha atual</Label>
        <Input id="atual" name="atual" type="password" autoComplete="current-password" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="nova">Nova senha</Label>
        <Input id="nova" name="nova" type="password" autoComplete="new-password" required />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button variant="outline" className="w-full" disabled={pending}>Alterar senha</Button>
    </form>
  );
}
```

- [ ] **Step 5: verificar e commitar**

```bash
npx tsc --noEmit && npm run build
```
Manual: lista de jogadores → perfil → head-to-head correto após o jogo da Task 12; editar disponibilidade aparece na lista.

```bash
git add -A && git commit -m "feat: lista de jogadores, perfis com head-to-head e edição de perfil

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Fase C — Temporadas

### Task 14: Round-robin (puro)

**Files:** Create: `src/lib/round-robin.ts`, `tests/unit/round-robin.test.ts`

- [ ] **Step 1: teste falhando** — `tests/unit/round-robin.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { gerarConfrontos } from "@/lib/round-robin";

const chave = (a: string, b: string) => [a, b].sort().join("-");

describe("gerarConfrontos", () => {
  it("todos contra todos exatamente 1x (par e ímpar)", () => {
    for (const n of [2, 4, 5, 8, 9]) {
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      const confrontos = gerarConfrontos(ids);
      expect(confrontos).toHaveLength((n * (n - 1)) / 2);
      const unicos = new Set(confrontos.map(([a, b]) => chave(a, b)));
      expect(unicos.size).toBe(confrontos.length);
      for (const id of ids) {
        const jogos = confrontos.filter(([a, b]) => a === id || b === id);
        expect(jogos).toHaveLength(n - 1);
      }
    }
  });
  it("menos de 2 jogadores → vazio", () => {
    expect(gerarConfrontos([])).toEqual([]);
    expect(gerarConfrontos(["a"])).toEqual([]);
  });
});
```

Rodar: `npm run test` → FAIL.

- [ ] **Step 2: implementar** `src/lib/round-robin.ts` (método do círculo; nº ímpar ganha um "bye" descartado):

```ts
export function gerarConfrontos(ids: string[]): [string, string][] {
  const jogadores = [...ids];
  if (jogadores.length < 2) return [];
  const BYE = "__bye__";
  if (jogadores.length % 2 === 1) jogadores.push(BYE);
  const n = jogadores.length;
  const confrontos: [string, string][] = [];
  for (let rodada = 0; rodada < n - 1; rodada++) {
    for (let i = 0; i < n / 2; i++) {
      const a = jogadores[i];
      const b = jogadores[n - 1 - i];
      if (a !== BYE && b !== BYE) confrontos.push([a, b]);
    }
    jogadores.splice(1, 0, jogadores.pop()!); // gira mantendo o primeiro fixo
  }
  return confrontos;
}
```

Rodar: `npm run test` → PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: geração de confrontos round-robin (método do círculo)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 15: Classificação com desempates (puro)

**Files:** Create: `src/lib/classificacao.ts`, `tests/unit/classificacao.test.ts`

Pontos: vitória **2**, derrota jogada **1**, W.O. vencedor **2** / perdedor **0**, não realizado **0/0** (jogos `pendente` simplesmente não entram). Desempate: pontos → confronto direto (apenas empate entre 2) → saldo de sets → saldo de games → `ordemInscricao`.

- [ ] **Step 1: teste falhando** — `tests/unit/classificacao.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeStandings, type JogoClassificavel } from "@/lib/classificacao";

const jogadores = [
  { userId: "ana", ordemInscricao: 0 },
  { userId: "bia", ordemInscricao: 1 },
  { userId: "cris", ordemInscricao: 2 },
  { userId: "duda", ordemInscricao: 3 },
];

const jogo = (a: string, b: string, winner: string, score: number[][] | null, status: "confirmado" | "wo" = "confirmado"): JogoClassificavel =>
  ({ playerAId: a, playerBId: b, winnerId: winner, score, status });

describe("computeStandings", () => {
  it("pontua 2/1 e W.O. 2/0", () => {
    const s = computeStandings(jogadores, [
      jogo("ana", "bia", "ana", [[6, 0], [6, 0]]),
      jogo("cris", "duda", "cris", null, "wo"),
    ]);
    const por = Object.fromEntries(s.map((x) => [x.userId, x]));
    expect(por.ana.pontos).toBe(2);
    expect(por.bia.pontos).toBe(1);  // derrota jogada vale 1
    expect(por.cris.pontos).toBe(2);
    expect(por.duda.pontos).toBe(0); // W.O. não pontua
    expect(por.cris.saldoSets).toBe(0); // W.O. sem sets
  });
  it("empate entre 2 resolve por confronto direto", () => {
    const s = computeStandings(jogadores, [
      jogo("ana", "bia", "bia", [[4, 6], [4, 6]]),     // bia vence ana
      jogo("ana", "cris", "ana", [[6, 0], [6, 0]]),
      jogo("bia", "duda", "bia", [[6, 0], [6, 0]]),
      jogo("cris", "duda", "cris", [[6, 0], [6, 0]]),
      jogo("ana", "duda", "ana", [[6, 0], [6, 0]]),
      jogo("bia", "cris", "cris", [[6, 7], [0, 6]]),
    ]);
    // ana e bia terminam com os mesmos pontos (5); bia venceu o confronto direto
    const posBia = s.findIndex((x) => x.userId === "bia");
    const posAna = s.findIndex((x) => x.userId === "ana");
    expect(posBia).toBeLessThan(posAna);
  });
  it("empate múltiplo (3+) pula confronto direto e cai para saldo de sets/games", () => {
    const s = computeStandings(jogadores.slice(0, 3), [
      jogo("ana", "bia", "ana", [[6, 4], [6, 4]]),
      jogo("bia", "cris", "bia", [[6, 0], [6, 0]]),
      jogo("cris", "ana", "cris", [[6, 1], [6, 1]]),
    ]);
    // todos 1V/1D = 3 pts e saldo de sets 0; decide saldo de games:
    // ana +4−10=−6 · bia +12−4=+8 · cris +10−12=−2  →  bia, cris, ana
    expect(s.map((x) => x.userId)).toEqual(["bia", "cris", "ana"]);
    expect(s.map((x) => x.posicao)).toEqual([1, 2, 3]);
  });
  it("último desempate é a ordem de inscrição (determinístico)", () => {
    const s = computeStandings(jogadores.slice(0, 2), []);
    expect(s[0].userId).toBe("ana");
    expect(s.map((x) => x.posicao)).toEqual([1, 2]);
  });
});
```

(No 3º teste, calcule à mão na implementação: cada um tem 1 vitória 2×0 e 1 derrota; saldo de sets é 0 para todos; saldo de games — ana: +4−10=−6… ajuste a expectativa para o resultado correto do SEU cálculo manual: ana ganhou 6/4 6/4 (+4) e perdeu 1/6 1/6 (−10) → −6; bia ganhou 6/0 6/0 (+12) e perdeu 4/6 4/6 (−4) → +8; cris ganhou 6/1 6/1 (+10) e perdeu 0/6 0/6 (−12) → −2. Ordem: bia, cris, ana → corrigir `s[0].userId` para `"bia"` e o comentário.)

Rodar: `npm run test` → FAIL.

- [ ] **Step 2: implementar** `src/lib/classificacao.ts`:

```ts
export type JogoClassificavel = {
  playerAId: string;
  playerBId: string | null;
  winnerId: string | null;
  score: unknown; // number[][] | null
  status: "confirmado" | "wo" | string;
};

export type Standing = {
  userId: string;
  posicao: number;
  pontos: number;
  jogos: number;
  vitorias: number;
  derrotas: number;
  saldoSets: number;
  saldoGames: number;
};

export function computeStandings(
  jogadores: { userId: string; ordemInscricao: number }[],
  jogos: JogoClassificavel[]
): Standing[] {
  const mapa = new Map<string, Standing & { ordem: number }>();
  for (const j of jogadores) {
    mapa.set(j.userId, {
      userId: j.userId, posicao: 0, pontos: 0, jogos: 0, vitorias: 0, derrotas: 0,
      saldoSets: 0, saldoGames: 0, ordem: j.ordemInscricao,
    });
  }

  const validos = jogos.filter(
    (m) => (m.status === "confirmado" || m.status === "wo") && m.playerBId && m.winnerId &&
      mapa.has(m.playerAId) && mapa.has(m.playerBId)
  );

  for (const m of validos) {
    const vencedor = mapa.get(m.winnerId!)!;
    const perdedor = mapa.get(m.winnerId === m.playerAId ? m.playerBId! : m.playerAId)!;
    vencedor.jogos++; perdedor.jogos++;
    vencedor.vitorias++; perdedor.derrotas++;
    vencedor.pontos += 2;
    if (m.status === "confirmado") {
      perdedor.pontos += 1; // derrota jogada vale 1
      const sets = (m.score as number[][]) ?? [];
      for (const [a, b] of sets) {
        const dirA = m.playerAId === vencedor.userId ? vencedor : perdedor;
        const dirB = dirA === vencedor ? perdedor : vencedor;
        dirA.saldoGames += a - b;
        dirB.saldoGames += b - a;
        if (a > b) { dirA.saldoSets += 1; dirB.saldoSets -= 1; }
        else { dirB.saldoSets += 1; dirA.saldoSets -= 1; }
      }
    }
  }

  const lista = [...mapa.values()];
  // 1) ordena por pontos, saldo sets, saldo games, ordem de inscrição
  lista.sort((x, y) =>
    y.pontos - x.pontos || y.saldoSets - x.saldoSets || y.saldoGames - x.saldoGames || x.ordem - y.ordem
  );
  // 2) confronto direto SÓ para grupos de exatamente 2 empatados em pontos
  for (let i = 0; i < lista.length - 1; i++) {
    const a = lista[i], b = lista[i + 1];
    if (a.pontos !== b.pontos) continue;
    const grupo = lista.filter((s) => s.pontos === a.pontos);
    if (grupo.length !== 2) continue;
    const direto = validos.find(
      (m) =>
        (m.playerAId === a.userId && m.playerBId === b.userId) ||
        (m.playerAId === b.userId && m.playerBId === a.userId)
    );
    if (direto?.winnerId === b.userId) {
      lista[i] = b; lista[i + 1] = a;
    }
    i++; // par já resolvido
  }
  return lista.map((s, i) => {
    const { ordem: _ordem, ...resto } = s;
    return { ...resto, posicao: i + 1 };
  });
}
```

Rodar: `npm run test` → PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: classificação da liga com pontos 2/1/0 e cadeia de desempates

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 16: Semeadura de playoffs e sugestão de divisões (puro)

**Files:** Create: `src/lib/playoffs.ts`, `src/lib/divisoes.ts`, `tests/unit/playoffs.test.ts`, `tests/unit/divisoes.test.ts`

- [ ] **Step 1: testes falhando**

`tests/unit/playoffs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { seedPlayoffs, vencedoresDasSemis } from "@/lib/playoffs";

const top = (...ids: string[]) => ids.map((userId) => ({ userId }));

describe("seedPlayoffs", () => {
  it("divisão com 6+ → semis 1×4 e 2×3", () => {
    const r = seedPlayoffs(top("p1", "p2", "p3", "p4", "p5", "p6"), 6);
    expect(r).toEqual({ tipo: "semis", semi1: ["p1", "p4"], semi2: ["p2", "p3"] });
  });
  it("divisão com menos de 6 → final direta top 2", () => {
    const r = seedPlayoffs(top("p1", "p2", "p3", "p4", "p5"), 5);
    expect(r).toEqual({ tipo: "final", final: ["p1", "p2"] });
  });
});

describe("vencedoresDasSemis", () => {
  it("retorna a dupla da final quando as duas semis resolveram", () => {
    expect(
      vencedoresDasSemis([
        { round: "semi1", status: "confirmado", winnerId: "p4" },
        { round: "semi2", status: "wo", winnerId: "p2" },
      ])
    ).toEqual(["p4", "p2"]);
  });
  it("null enquanto faltar semi", () => {
    expect(
      vencedoresDasSemis([{ round: "semi1", status: "confirmado", winnerId: "p1" }])
    ).toBeNull();
    expect(
      vencedoresDasSemis([
        { round: "semi1", status: "marcado", winnerId: null },
        { round: "semi2", status: "confirmado", winnerId: "p2" },
      ])
    ).toBeNull();
  });
});
```

`tests/unit/divisoes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sugerirDivisoes } from "@/lib/divisoes";

const inscritos = (niveis: number[]) =>
  niveis.map((level, i) => ({ userId: `p${i}`, level }));

describe("sugerirDivisoes", () => {
  it("agrupa por nível em divisões equilibradas (24 → 3×8)", () => {
    const r = sugerirDivisoes(inscritos(Array.from({ length: 24 }, (_, i) => (i % 7) + 1)));
    expect(r).toHaveLength(3);
    expect(r.map((d) => d.userIds.length)).toEqual([8, 8, 8]);
    expect(r.map((d) => d.name)).toEqual(["Divisão A", "Divisão B", "Divisão C"]);
    // Divisão A tem os níveis mais altos
    const todos = inscritos(Array.from({ length: 24 }, (_, i) => (i % 7) + 1));
    const nivelDe = (id: string) => todos.find((x) => x.userId === id)!.level;
    const minA = Math.min(...r[0].userIds.map(nivelDe));
    const maxB = Math.max(...r[1].userIds.map(nivelDe));
    expect(minA).toBeGreaterThanOrEqual(maxB);
  });
  it("poucos inscritos → divisão única; tamanhos diferem no máx. 1", () => {
    expect(sugerirDivisoes(inscritos([3, 4, 5, 2, 1, 6, 7]))).toHaveLength(1);
    const r = sugerirDivisoes(inscritos(Array.from({ length: 30 }, () => 4)));
    const tamanhos = r.map((d) => d.userIds.length);
    expect(Math.max(...tamanhos) - Math.min(...tamanhos)).toBeLessThanOrEqual(1);
    expect(tamanhos.reduce((a, b) => a + b, 0)).toBe(30);
  });
});
```

Rodar: `npm run test` → FAIL.

- [ ] **Step 2: implementar**

```ts
// src/lib/playoffs.ts
export type Semeadura =
  | { tipo: "semis"; semi1: [string, string]; semi2: [string, string] }
  | { tipo: "final"; final: [string, string] };

// standings já ordenado (1º primeiro). Divisão <6 inscritos: top 2 direto à final.
export function seedPlayoffs(standings: { userId: string }[], tamanhoDivisao: number): Semeadura {
  const ids = standings.map((s) => s.userId);
  if (tamanhoDivisao < 6) return { tipo: "final", final: [ids[0], ids[1]] };
  return { tipo: "semis", semi1: [ids[0], ids[3]], semi2: [ids[1], ids[2]] };
}

export function vencedoresDasSemis(
  semis: { round: string | null; status: string; winnerId: string | null }[]
): [string, string] | null {
  const s1 = semis.find((s) => s.round === "semi1");
  const s2 = semis.find((s) => s.round === "semi2");
  const ok = (s?: { status: string; winnerId: string | null }) =>
    s && (s.status === "confirmado" || s.status === "wo") && s.winnerId;
  if (!ok(s1) || !ok(s2)) return null;
  return [s1!.winnerId!, s2!.winnerId!];
}
```

```ts
// src/lib/divisoes.ts
// Ordena por nível (desc) e corta em divisões contíguas de tamanhos quase iguais (~8 por divisão).
export function sugerirDivisoes(
  inscritos: { userId: string; level: number }[]
): { name: string; order: number; userIds: string[] }[] {
  const ordenados = [...inscritos].sort((a, b) => b.level - a.level);
  const n = ordenados.length;
  if (n === 0) return [];
  const qtd = Math.max(1, Math.round(n / 8));
  const base = Math.floor(n / qtd);
  const sobra = n % qtd;
  const divisoes: { name: string; order: number; userIds: string[] }[] = [];
  let cursor = 0;
  for (let i = 0; i < qtd; i++) {
    const tamanho = base + (i < sobra ? 1 : 0);
    divisoes.push({
      name: `Divisão ${String.fromCharCode(65 + i)}`,
      order: i,
      userIds: ordenados.slice(cursor, cursor + tamanho).map((x) => x.userId),
    });
    cursor += tamanho;
  }
  return divisoes;
}
```

Rodar: `npm run test` → PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: semeadura de playoffs e sugestão automática de divisões

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 17: Serviço de temporada (ciclo de vida completo)

**Files:** Create: `src/lib/services/temporada.ts`, `tests/int/temporada.test.ts` · Modify: `src/lib/services/jogos.ts` (estender `resolverPendencias`)

- [ ] **Step 1: teste de integração falhando** — `tests/int/temporada.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  abrirInscricoes, criarFinaisProntas, criarTemporada, encerrarTemporada,
  getClassificacao, inscrever, iniciarLiga, iniciarPlayoffs,
} from "@/lib/services/temporada";
import { adminDefinirPlacar } from "@/lib/services/placar";
import { trofeus } from "@/lib/stats";
import { criarUsuario, resetDb, testDb } from "../helpers/db";

beforeEach(resetDb);

// placar onde o jogador "mais forte" (índice menor) vence
const placarDoMaisForte = [[6, 3], [6, 3]];

async function setupLigaDe6() {
  const jogadores = [];
  for (let i = 0; i < 6; i++) jogadores.push(await criarUsuario({ level: 7 - i }));
  const season = await criarTemporada(testDb, { nome: "Temporada Teste" });
  await abrirInscricoes(testDb, season.id);
  for (const j of jogadores) await inscrever(testDb, season.id, j.id);
  await iniciarLiga(testDb, season.id, [
    { name: "Divisão A", userIds: jogadores.map((j) => j.id) },
  ]);
  return { season, jogadores };
}

// resolve todos os jogos de liga: vence quem tem índice menor na lista
async function resolverLiga(jogadores: { id: string }[]) {
  const forca = new Map(jogadores.map((j, i) => [j.id, i]));
  const pendentes = await testDb.match.findMany({ where: { type: "liga" } });
  for (const m of pendentes) {
    const aMaisForte = forca.get(m.playerAId)! < forca.get(m.playerBId!)!;
    await adminDefinirPlacar(testDb, m.id, aMaisForte ? placarDoMaisForte : [[3, 6], [3, 6]]);
  }
}

describe("ciclo completo da temporada", () => {
  it("inscrições → liga (15 jogos) → playoffs → final → campeão", async () => {
    const { season, jogadores } = await setupLigaDe6();
    expect(await testDb.match.count({ where: { type: "liga", status: "pendente" } })).toBe(15);

    await resolverLiga(jogadores);
    const div = await testDb.division.findFirstOrThrow();
    const { standings } = await getClassificacao(testDb, div.id);
    expect(standings[0].userId).toBe(jogadores[0].id);
    expect(standings[0].pontos).toBe(10); // 5 vitórias × 2

    await iniciarPlayoffs(testDb, season.id);
    const semis = await testDb.match.findMany({ where: { type: "playoff" }, orderBy: { round: "asc" } });
    expect(semis.map((s) => s.round).sort()).toEqual(["semi1", "semi2"]);
    const semi1 = semis.find((s) => s.round === "semi1")!;
    expect([semi1.playerAId, semi1.playerBId]).toEqual([jogadores[0].id, jogadores[3].id]);

    // zebra: 4º vence o 1º; 2º vence o 3º
    await adminDefinirPlacar(testDb, semi1.id, [[3, 6], [3, 6]]);
    const semi2 = semis.find((s) => s.round === "semi2")!;
    await adminDefinirPlacar(testDb, semi2.id, placarDoMaisForte);

    await criarFinaisProntas(testDb);
    const final = await testDb.match.findFirstOrThrow({ where: { round: "final" } });
    expect([final.playerAId, final.playerBId].sort()).toEqual(
      [jogadores[3].id, jogadores[1].id].sort()
    );

    // 2º da liga vence a final
    const vencedorEhA = final.playerAId === jogadores[1].id;
    await adminDefinirPlacar(testDb, final.id, vencedorEhA ? placarDoMaisForte : [[3, 6], [3, 6]]);
    await encerrarTemporada(testDb, season.id);

    const encerrada = await testDb.season.findUniqueOrThrow({ where: { id: season.id } });
    expect(encerrada.status).toBe("encerrada");
    const titulos = await trofeus(testDb, jogadores[1].id);
    expect(titulos).toHaveLength(1);
    const posicoes = await testDb.divisionPlayer.findMany({ orderBy: { finalPosition: "asc" } });
    expect(posicoes[0].userId).toBe(jogadores[1].id); // campeão
    expect(posicoes[1].userId).toBe(jogadores[3].id); // vice
    expect(posicoes[2].userId).toBe(jogadores[0].id); // 1º da liga fica em 3º
  });

  it("divisão com menos de 6 vai direto pra final (top 2)", async () => {
    const jogadores = [];
    for (let i = 0; i < 4; i++) jogadores.push(await criarUsuario());
    const season = await criarTemporada(testDb, { nome: "Mini" });
    await abrirInscricoes(testDb, season.id);
    for (const j of jogadores) await inscrever(testDb, season.id, j.id);
    await iniciarLiga(testDb, season.id, [{ name: "Divisão A", userIds: jogadores.map((j) => j.id) }]);
    await resolverLiga(jogadores);
    await iniciarPlayoffs(testDb, season.id);
    const playoff = await testDb.match.findMany({ where: { type: "playoff" } });
    expect(playoff).toHaveLength(1);
    expect(playoff[0].round).toBe("final");
  });

  it("guardas: inscrever fora do período e liga com não-inscrito falham", async () => {
    const u = await criarUsuario();
    const season = await criarTemporada(testDb, { nome: "X" });
    await expect(inscrever(testDb, season.id, u.id)).rejects.toThrow(/inscriç/i);
    await abrirInscricoes(testDb, season.id);
    await inscrever(testDb, season.id, u.id);
    const intruso = await criarUsuario();
    await expect(
      iniciarLiga(testDb, season.id, [{ name: "Divisão A", userIds: [u.id, intruso.id] }])
    ).rejects.toThrow(/inscrit/i);
  });
});
```

Rodar: `npm run test:int` → FAIL.

- [ ] **Step 2: implementar** `src/lib/services/temporada.ts`:

```ts
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { gerarConfrontos } from "@/lib/round-robin";
import { computeStandings } from "@/lib/classificacao";
import { seedPlayoffs, vencedoresDasSemis } from "@/lib/playoffs";

export async function criarTemporada(
  db: Db,
  input: { nome: string; inscricoesAte?: Date | null; ligaAte?: Date | null }
) {
  if (!input.nome.trim()) throw new AppError("Dê um nome à temporada.");
  return db.season.create({
    data: { name: input.nome.trim(), inscricoesAte: input.inscricoesAte ?? null, ligaAte: input.ligaAte ?? null },
  });
}

export async function abrirInscricoes(db: Db, seasonId: string) {
  const { count } = await db.season.updateMany({
    where: { id: seasonId, status: "rascunho" },
    data: { status: "inscricoes" },
  });
  if (count === 0) throw new AppError("Essa temporada não está em rascunho.");
}

export async function inscrever(db: Db, seasonId: string, userId: string) {
  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season || season.status !== "inscricoes")
    throw new AppError("As inscrições não estão abertas.");
  return db.seasonEntry.upsert({
    where: { seasonId_userId: { seasonId, userId } },
    update: {},
    create: { seasonId, userId },
  });
}

export async function cancelarInscricao(db: Db, seasonId: string, userId: string) {
  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season || season.status !== "inscricoes")
    throw new AppError("As inscrições já fecharam — fale com o admin.");
  await db.seasonEntry.deleteMany({ where: { seasonId, userId } });
}

export async function iniciarLiga(
  db: Db,
  seasonId: string,
  divisoes: { name: string; userIds: string[] }[]
) {
  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season || season.status !== "inscricoes")
    throw new AppError("A liga só começa a partir das inscrições.");
  const entries = await db.seasonEntry.findMany({
    where: { seasonId },
    orderBy: { createdAt: "asc" },
  });
  const ordem = new Map(entries.map((e, i) => [e.userId, i]));

  const vistos = new Set<string>();
  for (const d of divisoes) {
    if (!d.name.trim()) throw new AppError("Toda divisão precisa de nome.");
    if (d.userIds.length < 2) throw new AppError(`${d.name} precisa de pelo menos 2 jogadores.`);
    for (const id of d.userIds) {
      if (!ordem.has(id)) throw new AppError("Há jogador não inscrito numa divisão.");
      if (vistos.has(id)) throw new AppError("Jogador repetido em mais de uma divisão.");
      vistos.add(id);
    }
  }

  // tx exige PrismaClient; em testes recebemos o client direto
  const client = db as { $transaction?: <T>(fn: (tx: Db) => Promise<T>) => Promise<T> };
  const executar = async (tx: Db) => {
    for (const [i, d] of divisoes.entries()) {
      const division = await tx.division.create({
        data: { seasonId, name: d.name.trim(), order: i },
      });
      await tx.divisionPlayer.createMany({
        data: d.userIds.map((userId) => ({
          divisionId: division.id, userId, ordemInscricao: ordem.get(userId)!,
        })),
      });
      await tx.match.createMany({
        data: gerarConfrontos(d.userIds).map(([a, b]) => ({
          type: "liga" as const, status: "pendente" as const,
          seasonId, divisionId: division.id,
          playerAId: a, playerBId: b, createdById: a,
        })),
      });
    }
    await tx.season.update({ where: { id: seasonId }, data: { status: "liga" } });
  };
  if (client.$transaction) await client.$transaction(executar);
  else await executar(db);
}

export async function getClassificacao(db: Db, divisionId: string) {
  const players = await db.divisionPlayer.findMany({
    where: { divisionId },
    include: { user: true },
  });
  const matches = await db.match.findMany({
    where: { divisionId, type: "liga" },
    include: { playerA: true, playerB: true },
  });
  const standings = computeStandings(
    players.map((p) => ({ userId: p.userId, ordemInscricao: p.ordemInscricao })),
    matches
  );
  const usuarios = new Map(players.map((p) => [p.userId, p.user]));
  return { standings, usuarios, matches };
}

export async function iniciarPlayoffs(db: Db, seasonId: string) {
  const season = await db.season.findUnique({
    where: { id: seasonId },
    include: { divisions: { include: { players: true } } },
  });
  if (!season || season.status !== "liga")
    throw new AppError("Os playoffs só começam com a liga em andamento.");

  for (const div of season.divisions) {
    const { standings } = await getClassificacao(db, div.id);
    const semeadura = seedPlayoffs(standings, div.players.length);
    if (semeadura.tipo === "semis") {
      await db.match.createMany({
        data: [
          { round: "semi1" as const, playerAId: semeadura.semi1[0], playerBId: semeadura.semi1[1] },
          { round: "semi2" as const, playerAId: semeadura.semi2[0], playerBId: semeadura.semi2[1] },
        ].map((m) => ({
          ...m, type: "playoff" as const, status: "pendente" as const,
          seasonId, divisionId: div.id, createdById: m.playerAId,
        })),
      });
    } else {
      await db.match.create({
        data: {
          type: "playoff", status: "pendente", round: "final",
          seasonId, divisionId: div.id,
          playerAId: semeadura.final[0], playerBId: semeadura.final[1],
          createdById: semeadura.final[0],
        },
      });
    }
  }
  await db.season.update({ where: { id: seasonId }, data: { status: "playoffs" } });
  // jogos de liga não realizados permanecem `pendente` (exibidos como "não realizado")
}

export async function criarFinaisProntas(db: Db) {
  const emPlayoffs = await db.season.findMany({
    where: { status: "playoffs" },
    include: { divisions: true },
  });
  for (const season of emPlayoffs) {
    for (const div of season.divisions) {
      const jogos = await db.match.findMany({ where: { divisionId: div.id, type: "playoff" } });
      if (jogos.some((m) => m.round === "final")) continue;
      const dupla = vencedoresDasSemis(jogos);
      if (!dupla) continue;
      await db.match
        .create({
          data: {
            type: "playoff", status: "pendente", round: "final",
            seasonId: season.id, divisionId: div.id,
            playerAId: dupla[0], playerBId: dupla[1], createdById: dupla[0],
          },
        })
        .catch(() => undefined); // corrida no unique(divisionId, round): outro request já criou
    }
  }
}

export async function encerrarTemporada(db: Db, seasonId: string) {
  const season = await db.season.findUnique({
    where: { id: seasonId },
    include: { divisions: true },
  });
  if (!season || season.status !== "playoffs")
    throw new AppError("Só dá para encerrar uma temporada em playoffs.");

  for (const div of season.divisions) {
    const final = await db.match.findFirst({
      where: { divisionId: div.id, type: "playoff", round: "final" },
    });
    if (!final || !["confirmado", "wo"].includes(final.status) || !final.winnerId)
      throw new AppError(`A final da ${div.name} ainda não terminou.`);

    const campeao = final.winnerId;
    const vice = final.playerAId === campeao ? final.playerBId! : final.playerAId;
    const { standings } = await getClassificacao(db, div.id);
    let proxima = 3;
    for (const s of standings) {
      const posicao = s.userId === campeao ? 1 : s.userId === vice ? 2 : proxima++;
      await db.divisionPlayer.update({
        where: { divisionId_userId: { divisionId: div.id, userId: s.userId } },
        data: { finalPosition: posicao },
      });
    }
  }
  await db.season.update({ where: { id: seasonId }, data: { status: "encerrada" } });
}

export async function getTemporadaAtual(db: Db) {
  return db.season.findFirst({
    where: { status: { not: "encerrada" } },
    orderBy: { createdAt: "desc" },
    include: { divisions: { orderBy: { order: "asc" }, include: { players: true } } },
  });
}
```

- [ ] **Step 3: estender `resolverPendencias`** em `src/lib/services/jogos.ts` — adicionar ao final da função:

```ts
import { criarFinaisProntas } from "@/lib/services/temporada";
// ...dentro de resolverPendencias, após o updateMany:
await criarFinaisProntas(db);
```

Rodar: `npm run test:int` → PASS (todos os arquivos).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: ciclo de vida da temporada (inscrições, liga, playoffs, encerramento)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 18: Serviço da liga — propor e aceitar data

**Files:** Create: `src/lib/services/liga.ts`, `tests/int/liga.test.ts`

- [ ] **Step 1: teste de integração falhando** — `tests/int/liga.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { aceitarProposta, proporData } from "@/lib/services/liga";
import { criarUsuario, resetDb, testDb } from "../helpers/db";

beforeEach(resetDb);
const amanha = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

async function confrontoPendente() {
  const a = await criarUsuario();
  const b = await criarUsuario();
  const m = await testDb.match.create({
    data: { type: "liga", status: "pendente", playerAId: a.id, playerBId: b.id, createdById: a.id },
  });
  return { a, b, m };
}

describe("proposta de data na liga", () => {
  it("propor → aceitar marca o jogo", async () => {
    const { a, b, m } = await confrontoPendente();
    const p = await proporData(testDb, m.id, a.id, { scheduledAt: amanha(), location: "Quadra 1" });
    expect(p.status).toBe("proposto");
    expect(p.proposedById).toBe(a.id);
    const marcado = await aceitarProposta(testDb, m.id, b.id);
    expect(marcado.status).toBe("marcado");
  });
  it("contraproposta substitui e inverte quem propôs", async () => {
    const { a, b, m } = await confrontoPendente();
    await proporData(testDb, m.id, a.id, { scheduledAt: amanha(), location: null });
    const outra = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const contra = await proporData(testDb, m.id, b.id, { scheduledAt: outra, location: "Quadra 2" });
    expect(contra.proposedById).toBe(b.id);
    expect(contra.scheduledAt!.getTime()).toBe(outra.getTime());
    const marcado = await aceitarProposta(testDb, m.id, a.id);
    expect(marcado.status).toBe("marcado");
  });
  it("quem propôs não aceita a própria proposta; estranho não propõe", async () => {
    const { a, m } = await confrontoPendente();
    await proporData(testDb, m.id, a.id, { scheduledAt: amanha(), location: null });
    await expect(aceitarProposta(testDb, m.id, a.id)).rejects.toThrow(/adversário/i);
    const x = await criarUsuario();
    await expect(proporData(testDb, m.id, x.id, { scheduledAt: amanha(), location: null })).rejects.toThrow();
  });
  it("não propõe em jogo já marcado", async () => {
    const { a, b, m } = await confrontoPendente();
    await proporData(testDb, m.id, a.id, { scheduledAt: amanha(), location: null });
    await aceitarProposta(testDb, m.id, b.id);
    await expect(proporData(testDb, m.id, a.id, { scheduledAt: amanha(), location: null })).rejects.toThrow();
  });
});
```

Rodar: `npm run test:int` → FAIL.

- [ ] **Step 2: implementar** `src/lib/services/liga.ts`:

```ts
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ehParticipante, getJogo } from "@/lib/services/jogos";
import { emailPropostaRecebida, linkJogo, sendEmail } from "@/lib/services/notificacoes";

export async function proporData(
  db: Db,
  matchId: string,
  userId: string,
  input: { scheduledAt: Date; location: string | null }
) {
  const match = await getJogo(db, matchId);
  if (match.type === "amistoso") throw new AppError("Amistoso já nasce com data.");
  if (!ehParticipante(match, userId)) throw new AppError("Esse confronto não é seu.");
  if (!["pendente", "proposto"].includes(match.status))
    throw new AppError("Esse jogo já tem data combinada.");
  if (input.scheduledAt.getTime() <= Date.now())
    throw new AppError("Escolha uma data no futuro.");

  const atualizado = await db.match.update({
    where: { id: matchId },
    data: {
      status: "proposto",
      scheduledAt: input.scheduledAt,
      location: input.location,
      proposedById: userId,
    },
  });
  const eu = match.playerAId === userId ? match.playerA : match.playerB!;
  const outro = match.playerAId === userId ? match.playerB! : match.playerA;
  await sendEmail(outro.email, emailPropostaRecebida(eu.name, linkJogo(matchId)));
  return atualizado;
}

export async function aceitarProposta(db: Db, matchId: string, userId: string) {
  const match = await getJogo(db, matchId);
  if (match.status !== "proposto") throw new AppError("Não há proposta para aceitar.");
  if (!ehParticipante(match, userId) || match.proposedById === userId)
    throw new AppError("Só o adversário aceita a proposta — ou contrapropõe outra data.");
  return db.match.update({ where: { id: matchId }, data: { status: "marcado" } });
}
```

Rodar: `npm run test:int` → PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: proposta e aceite de data para jogos de liga/playoff

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 19: Página Temporada (inscrição, classificação, chaveamento)

**Files:** Create: `src/components/tabela-classificacao.tsx`, `src/components/bracket.tsx`, `src/app/(app)/temporada/page.tsx`, `src/app/(app)/temporada/actions.ts`, `src/components/inscricao-buttons.tsx`

- [ ] **Step 1: componentes**

```tsx
// src/components/tabela-classificacao.tsx
import type { User } from "@prisma/client";
import type { Standing } from "@/lib/classificacao";
import { cn } from "@/lib/utils";

export function TabelaClassificacao({ standings, usuarios, destaqueUserId, classificados = 4 }: {
  standings: Standing[];
  usuarios: Map<string, User>;
  destaqueUserId?: string;
  classificados?: number; // quantos vão pros playoffs (linha visual)
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th className="p-2 text-left">#</th>
            <th className="p-2 text-left">Jogador</th>
            <th className="p-2 text-center" title="Pontos">P</th>
            <th className="p-2 text-center" title="Jogos">J</th>
            <th className="p-2 text-center" title="Vitórias">V</th>
            <th className="p-2 text-center" title="Saldo de sets">±S</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => (
            <tr key={s.userId}
              className={cn(
                "border-t",
                s.posicao === classificados && "border-b-2 border-b-primary/40",
                s.userId === destaqueUserId && "bg-accent/50 font-medium"
              )}>
              <td className="p-2">{s.posicao <= classificados ? <span className="font-bold text-primary">{s.posicao}</span> : s.posicao}</td>
              <td className="max-w-0 truncate p-2">{usuarios.get(s.userId)?.name ?? "?"}</td>
              <td className="p-2 text-center font-bold">{s.pontos}</td>
              <td className="p-2 text-center text-muted-foreground">{s.jogos}</td>
              <td className="p-2 text-center">{s.vitorias}</td>
              <td className="p-2 text-center">{s.saldoSets > 0 ? `+${s.saldoSets}` : s.saldoSets}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```tsx
// src/components/bracket.tsx
import Link from "next/link";
import type { Match, User } from "@prisma/client";
import { placarTexto } from "@/lib/format";
import { cn } from "@/lib/utils";

type Jogo = Match & { playerA: User; playerB: User | null };

function LinhaJogador({ nome, vencedor }: { nome?: string; vencedor: boolean }) {
  return (
    <p className={cn("truncate text-sm", vencedor ? "font-bold text-primary" : "text-foreground")}>
      {vencedor && "🏆 "}{nome ?? "A definir"}
    </p>
  );
}

function CardJogo({ jogo, rotulo }: { jogo?: Jogo; rotulo: string }) {
  if (!jogo) {
    return (
      <div className="rounded-xl border border-dashed p-3">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p className="text-sm text-muted-foreground">Aguardando semifinais…</p>
      </div>
    );
  }
  return (
    <Link href={`/jogo/${jogo.id}`} className="block rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{rotulo}</p>
        {jogo.score != null && <p className="text-xs font-semibold">{placarTexto(jogo.score as number[][])}</p>}
        {jogo.status === "wo" && <p className="text-xs">W.O.</p>}
      </div>
      <LinhaJogador nome={jogo.playerA.name} vencedor={jogo.winnerId === jogo.playerAId} />
      <LinhaJogador nome={jogo.playerB?.name} vencedor={!!jogo.winnerId && jogo.winnerId === jogo.playerBId} />
    </Link>
  );
}

export function Bracket({ jogos }: { jogos: Jogo[] }) {
  const semi1 = jogos.find((j) => j.round === "semi1");
  const semi2 = jogos.find((j) => j.round === "semi2");
  const final = jogos.find((j) => j.round === "final");
  const soFinal = !semi1 && !semi2; // divisão pequena: final direta
  return (
    <div className="space-y-2">
      {!soFinal && (
        <div className="grid grid-cols-2 gap-2">
          <CardJogo jogo={semi1} rotulo="Semifinal 1 (1º × 4º)" />
          <CardJogo jogo={semi2} rotulo="Semifinal 2 (2º × 3º)" />
        </div>
      )}
      <CardJogo jogo={final} rotulo={soFinal ? "Final (1º × 2º)" : "Final"} />
    </div>
  );
}
```

- [ ] **Step 2: actions + botões de inscrição**

```ts
// src/app/(app)/temporada/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { runAction, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/current-user";
import { cancelarInscricao, inscrever } from "@/lib/services/temporada";

export async function inscreverAction(seasonId: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await inscrever(db, seasonId, user.id);
  });
  revalidatePath("/temporada");
  return r;
}

export async function cancelarInscricaoAction(seasonId: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await cancelarInscricao(db, seasonId, user.id);
  });
  revalidatePath("/temporada");
  return r;
}
```

```tsx
// src/components/inscricao-buttons.tsx
"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelarInscricaoAction, inscreverAction } from "@/app/(app)/temporada/actions";

export function InscricaoButtons({ seasonId, inscrito }: { seasonId: string; inscrito: boolean }) {
  const [pending, start] = useTransition();
  const agir = (fn: (id: string) => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn(seasonId);
      if (r.ok) toast.success(msg);
      else if (r.error) toast.error(r.error);
    });
  return inscrito ? (
    <Button variant="outline" className="w-full" disabled={pending}
      onClick={() => agir(cancelarInscricaoAction, "Inscrição cancelada.")}>
      Inscrito ✓ — toque para cancelar
    </Button>
  ) : (
    <Button className="w-full font-semibold" disabled={pending}
      onClick={() => agir(inscreverAction, "Você está dentro! 🎾")}>
      Quero disputar!
    </Button>
  );
}
```

- [ ] **Step 3: a página** — `src/app/(app)/temporada/page.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/settings";
import { getClassificacao, getTemporadaAtual } from "@/lib/services/temporada";
import { formatarData } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { InscricaoButtons } from "@/components/inscricao-buttons";
import { TabelaClassificacao } from "@/components/tabela-classificacao";
import { Bracket } from "@/components/bracket";
import { JogoCard } from "@/components/jogo-card";
import { cn } from "@/lib/utils";

export default async function TemporadaPage({ searchParams }: {
  searchParams: Promise<{ divisao?: string }>;
}) {
  const user = await requireUser();
  const { timezone } = await getSettings();
  const season = await getTemporadaAtual(db);

  if (!season || season.status === "rascunho") {
    return <EmptyState emoji="🏆" titulo="Nenhuma temporada ativa"
      descricao="Quando o professor abrir a próxima, você se inscreve aqui." />;
  }

  if (season.status === "inscricoes") {
    const inscritos = await db.seasonEntry.findMany({
      where: { seasonId: season.id }, include: { user: true }, orderBy: { createdAt: "asc" },
    });
    const inscrito = inscritos.some((e) => e.userId === user.id);
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-bold">{season.name}</h1>
          <p className="text-sm text-muted-foreground">
            Inscrições abertas{season.inscricoesAte && ` até ${formatarData(season.inscricoesAte, timezone)}`}
          </p>
        </header>
        <InscricaoButtons seasonId={season.id} inscrito={inscrito} />
        <section className="rounded-2xl border bg-card p-4">
          <p className="mb-2 font-semibold">{inscritos.length} inscrito{inscritos.length !== 1 && "s"}</p>
          <p className="text-sm text-muted-foreground">{inscritos.map((e) => e.user.name.split(" ")[0]).join(", ") || "Seja o primeiro!"}</p>
        </section>
        <p className="text-xs text-muted-foreground">
          Liga todos-contra-todos na sua divisão → top 4 → semis e final. Quem não disputar segue nos amistosos normalmente.
        </p>
      </div>
    );
  }

  // liga ou playoffs
  const { divisao } = await searchParams;
  const minhaDivisao = season.divisions.find((d) => d.players.some((p) => p.userId === user.id));
  const divisaoAtiva = season.divisions.find((d) => d.id === divisao) ?? minhaDivisao ?? season.divisions[0];
  if (!divisaoAtiva) return <EmptyState emoji="🤔" titulo="Temporada sem divisões" />;

  const { standings, usuarios } = await getClassificacao(db, divisaoAtiva.id);
  const meusPendentes = minhaDivisao
    ? await db.match.findMany({
        where: {
          divisionId: minhaDivisao.id, status: { in: ["pendente", "proposto"] },
          OR: [{ playerAId: user.id }, { playerBId: user.id }],
        },
        include: { playerA: true, playerB: true },
      })
    : [];
  const playoffs = await db.match.findMany({
    where: { divisionId: divisaoAtiva.id, type: "playoff" },
    include: { playerA: true, playerB: true },
  });

  const classificados = divisaoAtiva.players.length < 6 ? 2 : 4;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold">{season.name}</h1>
        <p className="text-sm text-muted-foreground">
          {season.status === "liga"
            ? <>Fase de liga{season.ligaAte && ` — até ${formatarData(season.ligaAte, timezone)}`}</>
            : "Playoffs! 🔥"}
        </p>
      </header>

      {season.divisions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {season.divisions.map((d) => (
            <Link key={d.id} href={`/temporada?divisao=${d.id}`}
              className={cn("shrink-0 rounded-full border px-3 py-1 text-sm",
                d.id === divisaoAtiva.id && "border-primary bg-primary text-primary-foreground")}>
              {d.name}
            </Link>
          ))}
        </div>
      )}

      {season.status === "playoffs" && <Bracket jogos={playoffs} />}

      <TabelaClassificacao standings={standings} usuarios={usuarios}
        destaqueUserId={user.id} classificados={classificados} />

      {meusPendentes.length > 0 && season.status === "liga" && (
        <section className="space-y-3">
          <h2 className="font-semibold">Seus confrontos para marcar</h2>
          {meusPendentes.map((m) => <JogoCard key={m.id} match={m} tz={timezone} />)}
        </section>
      )}

      {season.status === "liga" && !minhaDivisao && (
        <p className="text-center text-sm text-muted-foreground">
          Você não está nesta temporada — dá pra acompanhar e seguir nos amistosos. 😉
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: verificar e commitar**

```bash
npx tsc --noEmit && npm run build
```

```bash
git add -A && git commit -m "feat: página da temporada com inscrição, classificação e chaveamento

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 20: Liga na aba Jogar + propostas na página do jogo

**Files:** Modify: `src/app/(app)/jogar/page.tsx` (aba Liga real), `src/app/(app)/jogo/[id]/page.tsx` (propor/aceitar data), `src/app/(app)/actions.ts` (2 actions novas) · Create: `src/components/proposta-data.tsx`

- [ ] **Step 1: actions novas** em `src/app/(app)/actions.ts`:

```ts
import { aceitarProposta, proporData } from "@/lib/services/liga";
import { getSettings } from "@/lib/settings";
import { fromZonedTime } from "date-fns-tz";
import { AppError } from "@/lib/errors";

export async function proporDataAction(matchId: string, quando: string, local: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    const { timezone } = await getSettings();
    const data = fromZonedTime(quando, timezone);
    if (!quando || isNaN(data.getTime())) throw new AppError("Escolha data e hora.");
    await proporData(db, matchId, user.id, { scheduledAt: data, location: local.trim() || null });
  });
  revalidatePath("/", "layout");
  return r;
}

export async function aceitarPropostaAction(matchId: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await aceitarProposta(db, matchId, user.id);
  });
  revalidatePath("/", "layout");
  return r;
}
```

- [ ] **Step 2: componente de proposta** — `src/components/proposta-data.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aceitarPropostaAction, proporDataAction } from "@/app/(app)/actions";

export function PropostaData({ matchId, possoAceitar, contraproposta }: {
  matchId: string;
  possoAceitar: boolean;     // status proposto e eu NÃO sou quem propôs
  contraproposta: boolean;   // já existe proposta (muda os textos)
}) {
  const [quando, setQuando] = useState("");
  const [local, setLocal] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      {possoAceitar && (
        <Button className="w-full font-semibold" disabled={pending}
          onClick={() => start(async () => {
            const r = await aceitarPropostaAction(matchId);
            if (r.ok) toast.success("Jogo marcado! 🎾");
            else if (r.error) toast.error(r.error);
          })}>
          Aceitar a data proposta
        </Button>
      )}
      <p className="text-sm font-semibold">
        {contraproposta ? (possoAceitar ? "Ou contraproponha outra data" : "Sua proposta — pode trocar") : "Propor data para este confronto"}
      </p>
      <div className="space-y-1">
        <Label htmlFor="quando-prop">Quando</Label>
        <Input id="quando-prop" type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="local-prop">Onde (opcional)</Label>
        <Input id="local-prop" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Quadra 1" />
      </div>
      <Button variant={possoAceitar ? "outline" : "default"} className="w-full" disabled={pending}
        onClick={() => start(async () => {
          const r = await proporDataAction(matchId, quando, local);
          if (r.ok) toast.success("Proposta enviada — o adversário recebe por e-mail.");
          else if (r.error) toast.error(r.error);
        })}>
        {contraproposta ? "Enviar contraproposta" : "Enviar proposta"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: usar na página do jogo** — em `src/app/(app)/jogo/[id]/page.tsx`, adicionar após o bloco do `aguardando_confirmacao`:

```tsx
{souParticipante && match.type !== "amistoso" &&
  ["pendente", "proposto"].includes(match.status) && (
    <PropostaData matchId={match.id}
      possoAceitar={match.status === "proposto" && match.proposedById !== user.id}
      contraproposta={match.status === "proposto"} />
)}
```

(Importar `PropostaData`.)

- [ ] **Step 4: aba Liga na página Jogar** — substituir o `TabsContent value="liga"` por conteúdo real. Na função da página, buscar antes:

```tsx
import { getTemporadaAtual } from "@/lib/services/temporada";
import { getSettings } from "@/lib/settings";
import { JogoCard } from "@/components/jogo-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// dentro do componente:
const season = await getTemporadaAtual(db);
const { timezone } = await getSettings();
const meusConfrontos = season && ["liga", "playoffs"].includes(season.status)
  ? await db.match.findMany({
      where: {
        seasonId: season.id,
        status: { in: ["pendente", "proposto"] },
        OR: [{ playerAId: user.id }, { playerBId: user.id }],
      },
      include: { playerA: true, playerB: true },
    })
  : [];
```

```tsx
<TabsContent value="liga" className="space-y-3 pt-2">
  {meusConfrontos.length === 0 ? (
    <EmptyState emoji="🏆" titulo="Nenhum confronto para marcar"
      descricao={season?.status === "inscricoes"
        ? "As inscrições estão abertas na aba Temporada!"
        : "Seus jogos de liga aparecem aqui quando você estiver numa divisão."}>
      <Button asChild size="sm" variant="outline"><Link href="/temporada">Ver temporada</Link></Button>
    </EmptyState>
  ) : (
    <>
      <p className="text-sm text-muted-foreground">Toque num confronto para propor data.</p>
      {meusConfrontos.map((m) => <JogoCard key={m.id} match={m} tz={timezone} />)}
    </>
  )}
</TabsContent>
```

- [ ] **Step 5: verificar e commitar**

```bash
npx tsc --noEmit && npm run build
```
Manual (2 contas inscritas numa temporada de teste): propor data → e-mail/log → aceitar na outra conta → lançar placar → tabela da temporada atualiza.

```bash
git add -A && git commit -m "feat: marcação de jogos da liga (propor/aceitar data) na UI

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Fase D — Admin e entrega

### Task 21: Admin — temporadas e jogos

**Files:** Create: `src/app/(app)/admin/layout.tsx`, `src/app/(app)/admin/page.tsx`, `src/app/(app)/admin/actions.ts`, `src/app/(app)/admin/temporadas/page.tsx`, `src/app/(app)/admin/temporadas/nova-form.tsx`, `src/app/(app)/admin/temporadas/[id]/page.tsx`, `src/app/(app)/admin/temporadas/[id]/divisoes-editor.tsx`, `src/app/(app)/admin/temporadas/[id]/jogo-controles.tsx`

- [ ] **Step 1: layout + dashboard**

```tsx
// src/app/(app)/admin/layout.tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="font-semibold text-primary">⚙️ Admin</Link>
        <span>·</span>
        <Link href="/admin/temporadas">Temporadas</Link>
        <span>·</span>
        <Link href="/admin/usuarios">Usuários</Link>
        <span>·</span>
        <Link href="/admin/config">Config</Link>
      </div>
      {children}
    </div>
  );
}
```

```tsx
// src/app/(app)/admin/page.tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminPage() {
  const [usuarios, aguardando, temporada] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.match.count({ where: { status: "aguardando_confirmacao" } }),
    db.season.findFirst({ where: { status: { not: "encerrada" } }, orderBy: { createdAt: "desc" } }),
  ]);
  const itens = [
    { href: "/admin/temporadas", titulo: "Temporadas", info: temporada ? `${temporada.name} — ${temporada.status}` : "nenhuma ativa" },
    { href: "/admin/usuarios", titulo: "Usuários", info: `${usuarios} ativos` },
    { href: "/admin/config", titulo: "Configurações", info: "código de convite, fuso, nome" },
  ];
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Painel do admin</h1>
      {aguardando > 0 && <p className="text-sm text-amber-700">{aguardando} placar(es) aguardando confirmação.</p>}
      {itens.map((i) => (
        <Link key={i.href} href={i.href}>
          <Card className="mb-2"><CardContent className="p-4">
            <p className="font-semibold">{i.titulo}</p>
            <p className="text-sm text-muted-foreground">{i.info}</p>
          </CardContent></Card>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: actions de admin** — `src/app/(app)/admin/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { runAction, type ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/auth/current-user";
import {
  abrirInscricoes, criarTemporada, encerrarTemporada, iniciarLiga, iniciarPlayoffs,
} from "@/lib/services/temporada";
import { adminDefinirPlacar, adminMarcarWO } from "@/lib/services/placar";

function revalidarTudo() {
  revalidatePath("/", "layout");
}

export async function criarTemporadaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  let id = "";
  const r = await runAction(async () => {
    const s = await criarTemporada(db, {
      nome: String(formData.get("nome") ?? ""),
      inscricoesAte: formData.get("inscricoesAte") ? new Date(String(formData.get("inscricoesAte"))) : null,
      ligaAte: formData.get("ligaAte") ? new Date(String(formData.get("ligaAte"))) : null,
    });
    id = s.id;
  });
  if (!r.ok) return r;
  revalidarTudo();
  redirect(`/admin/temporadas/${id}`);
}

export async function abrirInscricoesAction(seasonId: string): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(() => abrirInscricoes(db, seasonId));
  revalidarTudo();
  return r;
}

export async function iniciarLigaAction(
  seasonId: string,
  divisoes: { name: string; userIds: string[] }[]
): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(() => iniciarLiga(db, seasonId, divisoes));
  revalidarTudo();
  return r;
}

export async function iniciarPlayoffsAction(seasonId: string): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(() => iniciarPlayoffs(db, seasonId));
  revalidarTudo();
  return r;
}

export async function encerrarTemporadaAction(seasonId: string): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(() => encerrarTemporada(db, seasonId));
  revalidarTudo();
  return r;
}

export async function adminDefinirPlacarAction(matchId: string, sets: number[][]): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(async () => {
    await adminDefinirPlacar(db, matchId, sets);
  });
  revalidarTudo();
  return r;
}

export async function adminWOAction(matchId: string, vencedorId: string): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(async () => {
    await adminMarcarWO(db, matchId, vencedorId);
  });
  revalidarTudo();
  return r;
}
```

- [ ] **Step 3: lista de temporadas + criação**

```tsx
// src/app/(app)/admin/temporadas/page.tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { NovaTemporadaForm } from "./nova-form";

export default async function AdminTemporadasPage() {
  const temporadas = await db.season.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Temporadas</h1>
      <NovaTemporadaForm />
      <div className="divide-y rounded-2xl border bg-card">
        {temporadas.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma ainda.</p>}
        {temporadas.map((t) => (
          <Link key={t.id} href={`/admin/temporadas/${t.id}`} className="flex justify-between p-3">
            <span className="font-medium">{t.name}</span>
            <span className="text-sm text-muted-foreground">{t.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/(app)/admin/temporadas/nova-form.tsx
"use client";
import { useActionState } from "react";
import { idle } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarTemporadaAction } from "../actions";

export function NovaTemporadaForm() {
  const [state, action, pending] = useActionState(criarTemporadaAction, idle);
  return (
    <form action={action} className="space-y-3 rounded-2xl border bg-card p-4">
      <p className="font-semibold">Nova temporada</p>
      <div className="space-y-1">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" placeholder="Ex.: Temporada Inverno 2026" required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="inscricoesAte">Inscrições até</Label>
          <Input id="inscricoesAte" name="inscricoesAte" type="date" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ligaAte">Liga até</Label>
          <Input id="ligaAte" name="ligaAte" type="date" />
        </div>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button disabled={pending} className="w-full">Criar (fica em rascunho)</Button>
    </form>
  );
}
```

- [ ] **Step 4: editor de divisões (client)** — `src/app/(app)/admin/temporadas/[id]/divisoes-editor.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { iniciarLigaAction } from "../../actions";

type Inscrito = { id: string; name: string; level: number };

export function DivisoesEditor({ seasonId, inscritos, sugestao }: {
  seasonId: string;
  inscritos: Inscrito[];
  sugestao: { name: string; userIds: string[] }[];
}) {
  // atribuição: userId → índice da divisão
  const [qtd, setQtd] = useState(Math.max(1, sugestao.length));
  const [atrib, setAtrib] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    sugestao.forEach((d, i) => d.userIds.forEach((u) => { m[u] = i; }));
    inscritos.forEach((j) => { if (!(j.id in m)) m[j.id] = 0; });
    return m;
  });
  const [pending, start] = useTransition();

  const divisoes = Array.from({ length: qtd }, (_, i) => ({
    name: `Divisão ${String.fromCharCode(65 + i)}`,
    userIds: inscritos.filter((j) => (atrib[j.id] ?? 0) === i).map((j) => j.id),
  }));

  function enviar() {
    start(async () => {
      const r = await iniciarLigaAction(seasonId, divisoes);
      if (r.ok) toast.success("Liga começou! Confrontos gerados. 🎾");
      else if (r.error) toast.error(r.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Divisões ({inscritos.length} inscritos)</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setQtd((q) => Math.max(1, q - 1))}>−</Button>
          <Button size="sm" variant="outline" onClick={() => setQtd((q) => Math.min(6, q + 1))}>+</Button>
        </div>
      </div>
      {divisoes.map((d, i) => (
        <div key={i} className="space-y-2 rounded-2xl border bg-card p-3">
          <p className="text-sm font-semibold">
            {d.name} <span className="font-normal text-muted-foreground">({d.userIds.length} jogadores)</span>
            {d.userIds.length > 12 && <span className="text-destructive"> — grande demais, round-robin pesado!</span>}
            {d.userIds.length > 0 && d.userIds.length < 2 && <span className="text-destructive"> — mínimo 2</span>}
          </p>
          {inscritos.filter((j) => (atrib[j.id] ?? 0) === i).map((j) => (
            <div key={j.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{j.name} <span className="text-muted-foreground">N{j.level}</span></span>
              <select value={i} className="rounded-lg border bg-background p-1 text-xs"
                onChange={(e) => setAtrib((prev) => ({ ...prev, [j.id]: Number(e.target.value) }))}>
                {Array.from({ length: qtd }, (_, k) => (
                  <option key={k} value={k}>{String.fromCharCode(65 + k)}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ))}
      <Button className="w-full font-semibold" disabled={pending} onClick={enviar}>
        {pending ? "Gerando…" : "Confirmar divisões e começar a liga"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Isso gera todos os confrontos (todos contra todos em cada divisão) e fecha as inscrições. Não dá para desfazer pelo app.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: controles de jogo do admin (client)** — `src/app/(app)/admin/temporadas/[id]/jogo-controles.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { adminDefinirPlacarAction, adminWOAction } from "../../actions";

export function JogoControles({ matchId, nomeA, nomeB, idA, idB }: {
  matchId: string; nomeA: string; nomeB: string; idA: string; idB: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [sets, setSets] = useState<string[][]>([["", ""], ["", ""], ["", ""]]);
  const [pending, start] = useTransition();

  const rodar = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast.success(msg); setAberto(false); }
      else if (r.error) toast.error(r.error);
    });

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Resolver</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{nomeA} × {nomeB}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {sets.map((linha, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 text-xs text-muted-foreground">{i === 2 ? "Match TB" : `Set ${i + 1}`}</span>
              {[0, 1].map((lado) => (
                <Input key={lado} type="number" className="w-16 text-center" value={linha[lado]}
                  onChange={(e) => setSets((prev) =>
                    prev.map((l, j) => (j === i ? l.map((v, k) => (k === lado ? e.target.value : v)) : l))
                  )} />
              ))}
            </div>
          ))}
          <Button className="w-full" disabled={pending}
            onClick={() => rodar(() => adminDefinirPlacarAction(
              matchId,
              sets.filter(([a, b]) => a !== "" && b !== "").map(([a, b]) => [Number(a), Number(b)])
            ), "Placar definido.")}>
            Definir placar (já confirmado)
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={pending}
              onClick={() => rodar(() => adminWOAction(matchId, idA), "W.O. aplicado.")}>
              W.O. p/ {nomeA.split(" ")[0]}
            </Button>
            <Button variant="outline" disabled={pending}
              onClick={() => rodar(() => adminWOAction(matchId, idB), "W.O. aplicado.")}>
              W.O. p/ {nomeB.split(" ")[0]}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: página da temporada no admin** — `src/app/(app)/admin/temporadas/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getClassificacao } from "@/lib/services/temporada";
import { sugerirDivisoes } from "@/lib/divisoes";
import { placarTexto } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { TabelaClassificacao } from "@/components/tabela-classificacao";
import { DivisoesEditor } from "./divisoes-editor";
import { JogoControles } from "./jogo-controles";
import {
  abrirInscricoesAction, encerrarTemporadaAction, iniciarPlayoffsAction,
} from "../../actions";

export default async function AdminTemporadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const season = await db.season.findUnique({
    where: { id },
    include: {
      entries: { include: { user: true }, orderBy: { createdAt: "asc" } },
      divisions: { orderBy: { order: "asc" }, include: { players: true } },
    },
  });
  if (!season) notFound();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold">{season.name}</h1>
        <p className="text-sm text-muted-foreground">Status: {season.status}</p>
      </header>

      {season.status === "rascunho" && (
        <ConfirmButton titulo="Abrir inscrições?" descricao="A temporada aparece para todo mundo se inscrever."
          acao={abrirInscricoesAction.bind(null, season.id)} variant="default">
          Abrir inscrições
        </ConfirmButton>
      )}

      {season.status === "inscricoes" && (
        <DivisoesEditor
          seasonId={season.id}
          inscritos={season.entries.map((e) => ({ id: e.user.id, name: e.user.name, level: e.user.level }))}
          sugestao={sugerirDivisoes(season.entries.map((e) => ({ userId: e.userId, level: e.user.level })))}
        />
      )}

      {["liga", "playoffs", "encerrada"].includes(season.status) &&
        (await Promise.all(season.divisions.map(async (div) => {
          const { standings, usuarios } = await getClassificacao(db, div.id);
          const jogos = await db.match.findMany({
            where: { divisionId: div.id },
            include: { playerA: true, playerB: true },
            orderBy: [{ type: "asc" }, { createdAt: "asc" }],
          });
          return (
            <section key={div.id} className="space-y-3">
              <h2 className="font-semibold">{div.name}</h2>
              <TabelaClassificacao standings={standings} usuarios={usuarios}
                classificados={div.players.length < 6 ? 2 : 4} />
              <div className="divide-y rounded-2xl border bg-card text-sm">
                {jogos.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 p-2">
                    <span className="min-w-0 truncate">
                      {m.type === "playoff" && <strong>[{m.round}] </strong>}
                      {m.playerA.name.split(" ")[0]} × {m.playerB?.name.split(" ")[0]}
                      {m.score != null && <span className="text-muted-foreground"> · {placarTexto(m.score as number[][])}</span>}
                      {m.status === "wo" && " · W.O."}
                      {m.status === "pendente" && season.status !== "liga" && m.type === "liga" && (
                        <span className="text-muted-foreground"> · não realizado</span>
                      )}
                    </span>
                    {!["confirmado", "wo", "cancelado"].includes(m.status) && m.playerB && (
                      <JogoControles matchId={m.id} nomeA={m.playerA.name} nomeB={m.playerB.name}
                        idA={m.playerAId} idB={m.playerBId!} />
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })))}

      {season.status === "liga" && (
        <ConfirmButton titulo="Iniciar playoffs?"
          descricao="Confrontos de liga não realizados viram 0×0 sem pontos. O top de cada divisão é semeado nas semis/final."
          acao={iniciarPlayoffsAction.bind(null, season.id)} variant="default">
          Iniciar playoffs
        </ConfirmButton>
      )}
      {season.status === "playoffs" && (
        <ConfirmButton titulo="Encerrar temporada?"
          descricao="Exige todas as finais resolvidas. Campeões ganham o troféu no perfil e a temporada vira histórico."
          acao={encerrarTemporadaAction.bind(null, season.id)} variant="default">
          Encerrar temporada
        </ConfirmButton>
      )}
    </div>
  );
}
```

- [ ] **Step 7: verificar e commitar**

```bash
npx tsc --noEmit && npm run build
```
Manual (ciclo completo com 4+ contas locais): criar temporada → abrir inscrições → inscrever contas → montar divisões → começar liga → resolver jogos pelo admin → playoffs → final → encerrar → troféu no perfil do campeão.

```bash
git add -A && git commit -m "feat: painel admin de temporadas com divisões, resultados e playoffs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 22: Admin — usuários e configurações

**Files:** Create: `src/app/(app)/admin/usuarios/page.tsx`, `src/app/(app)/admin/usuarios/controles.tsx`, `src/app/(app)/admin/config/page.tsx`, `src/app/(app)/admin/config/form.tsx` · Modify: `src/app/(app)/admin/actions.ts`

- [ ] **Step 1: actions novas** (em `admin/actions.ts`):

```ts
export async function ajustarNivelAction(userId: string, nivel: number): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(async () => {
    if (nivel < 1 || nivel > 7) throw new AppError("Nível de 1 a 7.");
    await db.user.update({ where: { id: userId }, data: { level: nivel } });
  });
  revalidarTudo();
  return r;
}

export async function alternarAdminAction(userId: string): Promise<ActionState> {
  const eu = await requireAdmin();
  const r = await runAction(async () => {
    if (eu.id === userId) throw new AppError("Você não pode remover seu próprio admin.");
    const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
    await db.user.update({ where: { id: userId }, data: { isAdmin: !u.isAdmin } });
  });
  revalidarTudo();
  return r;
}

export async function alternarAtivoAction(userId: string): Promise<ActionState> {
  const eu = await requireAdmin();
  const r = await runAction(async () => {
    if (eu.id === userId) throw new AppError("Você não pode desativar a si mesmo.");
    const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
    await db.user.update({ where: { id: userId }, data: { isActive: !u.isActive } });
  });
  revalidarTudo();
  return r;
}

export async function salvarConfigAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(async () => {
    const nome = String(formData.get("communityName") ?? "").trim();
    const codigo = String(formData.get("inviteCode") ?? "").trim();
    const timezone = String(formData.get("timezone") ?? "America/Sao_Paulo");
    if (!nome || !codigo) throw new AppError("Nome e código não podem ficar vazios.");
    await db.appSettings.update({
      where: { id: 1 },
      data: { communityName: nome, inviteCode: codigo, timezone },
    });
  });
  revalidarTudo();
  return r;
}
```

- [ ] **Step 2: página de usuários + controles**

```tsx
// src/app/(app)/admin/usuarios/page.tsx
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/current-user";
import { AvatarIniciais } from "@/components/avatar-iniciais";
import { UsuarioControles } from "./controles";

export default async function AdminUsuariosPage() {
  const eu = await requireAdmin();
  const usuarios = await db.user.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Usuários ({usuarios.length})</h1>
      <div className="divide-y rounded-2xl border bg-card">
        {usuarios.map((u) => (
          <div key={u.id} className="flex items-center gap-3 p-3">
            <AvatarIniciais nome={u.name} className={u.isActive ? "" : "opacity-40"} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {u.name} {u.isAdmin && "👑"} {!u.isActive && <span className="text-xs text-destructive">(desativado)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{u.phone} · {u.email}</p>
            </div>
            <UsuarioControles userId={u.id} nivel={u.level} isAdmin={u.isAdmin}
              isActive={u.isActive} souEu={u.id === eu.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/(app)/admin/usuarios/controles.tsx
"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ajustarNivelAction, alternarAdminAction, alternarAtivoAction } from "../actions";

export function UsuarioControles({ userId, nivel, isAdmin, isActive, souEu }: {
  userId: string; nivel: number; isAdmin: boolean; isActive: boolean; souEu: boolean;
}) {
  const [pending, start] = useTransition();
  const rodar = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success("Feito.");
      else if (r.error) toast.error(r.error);
    });

  return (
    <div className="flex items-center gap-2">
      <select value={nivel} disabled={pending}
        className="rounded-lg border bg-background p-1 text-sm"
        onChange={(e) => rodar(() => ajustarNivelAction(userId, Number(e.target.value)))}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>N{n}</option>)}
      </select>
      {!souEu && (
        <Dialog>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost"><MoreVertical className="size-4" /></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Gerenciar usuário</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Button variant="outline" className="w-full" disabled={pending}
                onClick={() => rodar(() => alternarAdminAction(userId))}>
                {isAdmin ? "Remover admin" : "Tornar admin"}
              </Button>
              <Button variant={isActive ? "destructive" : "default"} className="w-full" disabled={pending}
                onClick={() => rodar(() => alternarAtivoAction(userId))}>
                {isActive ? "Desativar (some das listas)" : "Reativar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
```

- [ ] **Step 3: configurações**

```tsx
// src/app/(app)/admin/config/page.tsx
import { getSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/current-user";
import { ConfigForm } from "./form";

export default async function AdminConfigPage() {
  await requireAdmin();
  const settings = await getSettings();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Configurações</h1>
      <ConfigForm communityName={settings.communityName}
        inviteCode={settings.inviteCode} timezone={settings.timezone} />
      <p className="text-xs text-muted-foreground">
        Trocar o código de convite invalida o anterior na hora — poste o novo no grupo.
      </p>
    </div>
  );
}
```

```tsx
// src/app/(app)/admin/config/form.tsx
"use client";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { idle } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarConfigAction } from "../actions";

const FUSOS = ["America/Sao_Paulo", "America/Manaus", "America/Fortaleza", "Europe/Lisbon"];

export function ConfigForm({ communityName, inviteCode, timezone }: {
  communityName: string; inviteCode: string; timezone: string;
}) {
  const [state, action, pending] = useActionState(salvarConfigAction, idle);
  useEffect(() => { if (state.ok) toast.success("Configurações salvas."); }, [state]);
  return (
    <form action={action} className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="space-y-1">
        <Label htmlFor="communityName">Nome da comunidade</Label>
        <Input id="communityName" name="communityName" defaultValue={communityName} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="inviteCode">Código de convite</Label>
        <Input id="inviteCode" name="inviteCode" defaultValue={inviteCode} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="timezone">Fuso horário</Label>
        <select id="timezone" name="timezone" defaultValue={timezone}
          className="w-full rounded-lg border bg-background p-2 text-sm">
          {FUSOS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" disabled={pending}>Salvar</Button>
    </form>
  );
}
```

- [ ] **Step 4: verificar e commitar**

```bash
npx tsc --noEmit && npm run build && npm run test && npm run test:int
```

```bash
git add -A && git commit -m "feat: admin de usuários (nível, papéis, desativar) e configurações

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 23: Deploy no Railway + checklist final

**Files:** Create: `railway.json` · Modify: `package.json`, `.gitignore`, `README.md`

- [ ] **Step 1: preparar o repo**

`railway.json`:
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "npx prisma migrate deploy && npm run start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

Em `package.json` scripts, garantir: `"postinstall": "prisma generate"`.

Em `.gitignore`, garantir que `.env` está listado (o template do Next ignora `.env*.local`, mas NÃO necessariamente `.env` — adicionar linha `.env` se faltar). Conferir com `git status` que `.env` não aparece.

`README.md` curto: o que é, como rodar local (`docker compose up -d`, `cp .env.example .env`, `npm i`, `npm run db:migrate && npm run db:seed`, `npm run dev`), como rodar testes, como fazer deploy (resumo do passo 2).

- [ ] **Step 2: subir para GitHub e Railway**

```bash
gh repo create ptenis --private --source=. --push
```

No Railway (dashboard, são ~5 minutos): New Project → Deploy from GitHub repo (`ptenis`) → **+ Create → Database → PostgreSQL** no mesmo projeto. No serviço web → Variables:
- `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (referência)
- `SESSION_SECRET` = string aleatória longa (`openssl rand -base64 32`)
- `APP_URL` = a URL gerada (Settings → Networking → Generate Domain, ex.: `https://ptenis-production.up.railway.app`)
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` = os do Marco
- `RESEND_API_KEY` / `EMAIL_FROM` = quando tiver (sem eles, e-mails só logam no console — reset de senha NÃO funciona em produção sem isso; com Resend free, verifique um domínio próprio ou os e-mails só chegam ao seu próprio endereço de cadastro do Resend)

Rodar o seed uma vez (cria admin + settings):
```bash
npm i -g @railway/cli && railway login && railway link && railway run npm run db:seed
```

- [ ] **Step 3: smoke test em produção (checklist manual)**

1. Abrir a URL no CELULAR → "Adicionar à tela de início" → abre standalone com ícone.
2. Cadastro com código `PTENIS2026` (telefone real) → entra direto.
3. Login do admin (seed) → /admin acessível; trocar o código de convite.
4. Criar convite aberto → aceitar com a 2ª conta → lançar placar → confirmar.
5. Criar temporada de teste → inscrições → divisões → liga → resolver 1 jogo → playoffs → encerrar (pode usar W.O. para acelerar) → troféu no perfil.
6. /esqueci-senha (se Resend configurado) → e-mail chega → redefinir funciona.

- [ ] **Step 4: Commit final**

```bash
git add -A && git commit -m "chore: configuração de deploy Railway e README

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

## Fora do plano (fase 2, NÃO implementar agora)

Bot do WhatsApp (Baileys embutido, comandos `!jogos`/`!convite`/`!placar`/`!tabela`, resumo diário, vinculação por telefone) — ver seção 9 do spec. O MVP já deixa prontos: telefone único E.164, camada de serviços com DI, páginas deep-linkáveis `/jogo/[id]`.
