# PTenis

App mobile-first (pt-BR) da comunidade de tênis: temporadas, rankings, amistosos e resultados.

## Setup local

```bash
cp .env.example .env
docker compose up -d   # Postgres roda na porta 5433
npm i
npm run db:migrate && npm run db:seed   # disponíveis a partir da Task 2 (schema Prisma)
```

## Desenvolvimento

```bash
npm run dev   # http://localhost:3000
```

## Testes

```bash
npm run test       # unitários (tests/unit)
npm run test:int   # integração com banco (tests/int)
```
