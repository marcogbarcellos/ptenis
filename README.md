# PTenis

Plataforma mobile-first para comunidades de tênis: marque amistosos, dispute temporadas (liga round-robin + playoffs) e acompanhe sua evolução no ranking.

**Stack:** Next.js 16 (App Router) · Tailwind v4 + shadcn/ui · Prisma 7 + PostgreSQL · Resend · Railway

---

## Funcionalidades

- **Amistosos** — convite aberto no mural ou jogo já combinado direto com um parceiro
- **Liga por temporadas** — inscrições → divisões por nível → round-robin → playoffs → campeão
- **Placar com confirmação** — lançador propõe, adversário confirma ou contesta (auto-confirmação em 48 h)
- **Agendamento** — proposta de data/hora/local entre os dois participantes
- **Perfis e ranking** — nível 1-7, head-to-head, troféus das temporadas
- **Admin** — gerencia temporadas, divide jogadores em divisões, resolve jogos, ajusta níveis e configurações da comunidade
- **PWA** — funciona como app instalado no celular (Android e iOS)

---

## Rodando localmente

### Pré-requisitos

- Node 20+
- Docker (para o PostgreSQL)
- Conta no [Resend](https://resend.com) *(opcional — sem ela, e-mails só aparecem no console)*

### 1. Instalar dependências

```bash
cp .env.example .env   # preencha antes do npm install (postinstall roda prisma generate)
npm install
```

Edite `.env` com os seus valores (ver seção [Variáveis de ambiente](#variáveis-de-ambiente)).

### 2. Subir o banco de dados

```bash
docker compose up -d
```

Cria dois containers: `ptenis-db-1` (porta 5433) e `ptenis-test-db-1` (banco `ptenis_test`).

### 3. Aplicar migrations e popular

```bash
npm run db:migrate   # cria as tabelas
npm run db:seed      # cria o usuário admin e as AppSettings
```

O seed usa `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` do `.env`.

### 4. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Login com as credenciais do seed.

---

## Rodando os testes

```bash
npm test            # testes unitários (lógica pura)
npm run test:int    # testes de integração (requer Docker rodando)
```

Os testes de integração usam o banco `ptenis_test` e recriam o schema a cada execução.

---

## Variáveis de ambiente

Copie `.env.example` e preencha:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | URL do PostgreSQL |
| `TEST_DATABASE_URL` | testes | URL do banco de testes |
| `APP_URL` | prod | URL pública (ex.: `https://ptenis.up.railway.app`) |
| `RESEND_API_KEY` | e-mail | Chave do Resend — sem ela reset de senha não funciona |
| `EMAIL_FROM` | e-mail | Remetente (ex.: `PTenis <noreply@seudominio.com>`) |
| `SEED_ADMIN_EMAIL` | seed | E-mail do primeiro admin |
| `SEED_ADMIN_PASSWORD` | seed | Senha do primeiro admin — troque em produção |

> **Resend free tier:** sem domínio verificado, e-mails só chegam ao endereço cadastrado na sua conta Resend. Verifique um domínio em [resend.com/domains](https://resend.com/domains) para envio irrestrito.

---

## Deploy no Railway

O `railway.json` na raiz já configura o start command:
```
npx prisma migrate deploy && npm run start
```

### 1. Criar o projeto

```bash
# crie o repo no GitHub primeiro, depois:
railway login
railway init    # link ao projeto Railway
```

No [Railway dashboard](https://railway.app):
1. **New Project → Deploy from GitHub repo**
2. **+ Create → Database → PostgreSQL** no mesmo projeto

### 2. Variáveis de ambiente no serviço web

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `APP_URL` | URL em Settings → Networking → Generate Domain |
| `SEED_ADMIN_EMAIL` | seu e-mail de admin |
| `SEED_ADMIN_PASSWORD` | senha forte |
| `RESEND_API_KEY` | chave do Resend |
| `EMAIL_FROM` | `PTenis <noreply@seudominio.com>` |

### 3. Rodar o seed em produção (uma vez)

```bash
npm i -g @railway/cli
railway login && railway link
railway run npm run db:seed
```

---

## Estrutura do projeto

```
prisma/             schema, migrations, seed
src/
  app/
    (auth)/         login, cadastro, recuperação de senha
    (app)/
      admin/        painel do administrador
      jogar/        criar amistosos e ver jogos da liga
      jogo/[id]/    detalhe do jogo (placar, agendamento)
      jogadores/    lista e perfis públicos
      perfil/       perfil e edição do usuário
      temporada/    inscrição, classificação e chaveamento
  components/       componentes compartilhados
  lib/
    auth/           sessão, hash, usuário atual
    services/       lógica de negócio (convites, jogos, placar, liga, temporada)
tests/
  unit/             lógica pura
  int/              serviços contra PostgreSQL real
```

---

## Licença

MIT
