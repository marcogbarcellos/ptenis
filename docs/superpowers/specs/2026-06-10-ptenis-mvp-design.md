# PTenis — Design do MVP

**Data:** 2026-06-10
**Status:** aprovado em brainstorming, aguardando revisão final do documento

## 1. Visão geral

Web app mobile-first para a comunidade de alunos do professor Pablo organizarem jogos amadores de tênis entre si — hoje isso acontece (mal) num grupo de WhatsApp. O app organiza **amistosos** e **temporadas competitivas por divisão de nível**, com visual bonito, moderno e simples.

- **Fase 1 (este MVP):** tudo pelo web app.
- **Fase 2 (logo em seguida):** bot de WhatsApp (no grupo e por DM) que cria/consulta jogos no mesmo sistema. O MVP já nasce preparado para isso.
- **Custo:** o mínimo possível — projeto gratuito para todos. Alvo: ~US$ 5/mês (Railway Hobby) + e-mail no tier grátis.

### Princípios de produto

1. Criar um jogo cabe em ≤3 campos; entrar num jogo é 1 toque.
2. Quem só quer "bater bola" nunca é pressionado por competição (temporada é opt-in, amistoso não conta nada).
3. O professor manda: admin pode corrigir nível, resultado, divisão e prazos.
4. O bot (fase 2) é só outra interface: nenhuma regra de negócio vive na UI.

## 2. Decisões fechadas

| Tema | Decisão |
|---|---|
| Mecânica central | Mural de convites abertos + confrontos de liga gerados por temporada |
| Modalidades | **Amistoso** e **Liga/Temporada** (ranking geral Elo ficou de fora por enquanto) |
| Formato competitivo | Temporada → divisões por nível → liga todos-contra-todos → top 4 → semis → final |
| Nível | Escala 1–7, sugerido por questionário no cadastro, ajustável pelo professor |
| Acesso | Código de convite único da comunidade, editável no admin |
| Auth | E-mail + senha próprios (sem provider externo), "esqueci minha senha" por e-mail |
| Cadastro | **Telefone WhatsApp obrigatório e único** — é a chave de vinculação do bot na fase 2 |
| Stack | Next.js (App Router) + Tailwind + shadcn/ui + Prisma + Postgres, deploy no Railway |
| Idioma/fuso | pt-BR; datas no fuso da comunidade (config no admin, padrão America/Sao_Paulo; armazenamento em UTC) |
| WhatsApp fase 2 | Baileys embutido no próprio serviço (custo zero extra), número dedicado, bot reativo no grupo + DM |

## 3. Formato competitivo (Temporadas)

### Ciclo de vida de uma temporada

`rascunho → inscrições → liga → playoffs → encerrada`

1. **Criação/inscrições.** Admin cria a temporada (nome, prazo de inscrição, prazo da fase de liga) e abre inscrições. Jogadores se inscrevem com 1 toque (opt-in).
2. **Montagem das divisões.** Ao fechar inscrições, o app sugere divisões por nível (ex.: Divisão A níveis 5–7, B 3–4, C 1–2), tamanho ideal 6–10 jogadores, aviso visual acima de 12. O admin move jogadores livremente entre divisões antes de confirmar.
3. **Fase de liga.** Ao confirmar as divisões, o app gera todos os confrontos (todos-contra-todos, 1 turno, método do círculo), sem data. Cada jogador vê seus confrontos pendentes e propõe data/hora/local ao adversário, que aceita ou contrapropõe (a contraproposta substitui a proposta atual e notifica o outro).
4. **Playoffs.** Quando o admin inicia os playoffs (a qualquer momento após o prazo da liga; confrontos não realizados viram 0×0 sem pontos): top 4 da divisão → semifinais (1º×4º e 2º×3º) → final. Sem disputa de 3º lugar. Divisão com menos de 6 jogadores: top 2 vão direto à final. Jogos de playoff não somam pontos de liga.
5. **Encerramento.** Admin encerra a temporada; campeões ganham troféu permanente no perfil ("🏆 Campeão Divisão B — Inverno 2026"); tudo vira histórico. A próxima temporada recomeça do passo 1 — promoção/rebaixamento entre divisões é decisão manual do professor ao montar as novas divisões.

### Pontuação e desempate (fase de liga)

- Vitória **2 pts** · derrota jogada **1 pt** · W.O. (admin marca; quem estava disposto a jogar) **2 pts × 0** · confronto não realizado **0 × 0**.
- Desempate, nesta ordem: (1) pontos; (2) confronto direto (só para empate entre 2); (3) saldo de sets; (4) saldo de games; (5) ordem de inscrição na temporada (determinístico). O admin pode ajustar manualmente a classificação final em último caso.

### Resultado de jogo (liga, playoff e amistoso com placar)

- Qualquer um dos dois jogadores lança o placar set a set; o adversário **confirma ou contesta**; sem ação em **48h, auto-confirma**.
- Contestação devolve o jogo para "marcado" (placar descartado) e notifica ambos **no app** (pendência, sem e-mail); persistindo briga, o admin define o placar.
- Formatos de jogo: **melhor de 3 com match tiebreak de 10 no lugar do 3º set** (padrão), **set único**, **pro-set de 8 games**. Escolhido na criação/proposta do jogo.
- Classificação é **calculada na leitura** a partir dos jogos confirmados (divisões ≤12 jogadores ⇒ ~66 jogos; sem tabela materializada, sem cache).

## 4. Amistosos

Dois modos de criação, ambos pela aba **Jogar**:

1. **Convite aberto (mural):** data/hora + local + observação opcional → publicado no mural. Qualquer membro aceita com 1 toque (primeiro que aceitar leva; corrida resolvida por transação). Convite não aceito some do mural quando a data/hora passa. O criador pode cancelar antes.
2. **Já combinado:** o criador escolhe o parceiro na lista (ex.: combinaram no grupo do WhatsApp) → jogo já nasce **marcado** para os dois; o parceiro é notificado e pode cancelar. *(Este modo existe no MVP justamente porque é o gesto que o bot da fase 2 mais vai usar: "achei parceiro, salva no app".)*

- Placar em amistoso é **opcional** (mesmo fluxo de lançar/confirmar) e alimenta só o histórico/head-to-head — **zero efeito competitivo**.
- Amistoso sem placar vira "jogado" no histórico automaticamente após a data; placar pode ser lançado em até 7 dias.
- Jogo marcado (amistoso ou liga) pode ser cancelado por qualquer um dos dois até a hora do jogo, notificando o outro; na liga, o confronto volta a "pendente" (remarca-se).
- Duplas **não** entram no MVP — o campo observação serve para combinar informalmente ("levem +2").

## 5. Nível dos jogadores

- Escala **1–7**: 1–2 Iniciante · 3–4 Intermediário · 5–7 Avançado (badge com número + rótulo).
- No cadastro, questionário de **4 perguntas** de auto-avaliação com descrições concretas em português (estilo NTRP/Playtomic, ex.: "consigo sustentar uma troca de bolas em ritmo médio") → sugere o nível inicial.
- O professor (admin) pode ajustar o nível de qualquer jogador a qualquer momento. Auto-ajuste por resultados fica fora do MVP.
- Perfil tem **disponibilidade opcional** (chips dia da semana × período manhã/tarde/noite) — só informativo, para facilitar achar parceiro.

## 6. Contas e acesso

- **Cadastro:** código de convite (validado) → nome, telefone WhatsApp (obrigatório, único, normalizado E.164), e-mail (único), senha → questionário de nível → dentro. Meta: < 2 minutos.
- **Login:** e-mail + senha. Sessão em cookie httpOnly, tabela de sessões no Postgres, validade 30 dias renovável.
- **Senha:** hash com argon2id. "Esqueci minha senha": e-mail (Resend) com token de uso único válido por 1h.
- **Papéis:** `membro` e `admin` (professor + Marco). Admin é concedido via painel admin (seed inicial cria o primeiro admin).
- **Código de convite:** um código ativo por vez (ex.: `PTENIS2026`), editável no admin; trocar o código invalida o anterior.
- Admin pode **desativar** usuário (some das listas, jogos históricos preservados).

## 7. Telas e navegação (mobile-first)

Barra inferior fixa: **Início · Temporada · ➕ Jogar · Jogadores · Perfil**.

| Rota | Conteúdo |
|---|---|
| `/entrar`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha` | Fluxos de conta (cadastro pede o código de convite) |
| `/` Início | Mural de convites abertos (card: criador, nível, data/hora, local, botão "Topo jogar!") + "Seus próximos jogos" + pendências (placar a confirmar, proposta recebida) |
| `/temporada` | Estado conforme fase: inscrição aberta (botão inscrever-se) · tabela de classificação da sua divisão + seus confrontos pendentes · chaveamento visual nos playoffs · seletor para ver outras divisões · vazio bonito se não há temporada |
| `/jogar` | Três caminhos: Amistoso aberto · Amistoso já combinado · Marcar jogo da liga (lista de confrontos pendentes) |
| `/jogo/[id]` | Detalhe do jogo: participantes, status, aceitar convite, aceitar/contrapropor data, lançar placar, confirmar/contestar, cancelar. **Deep-linkável** (o bot da fase 2 manda esses links) |
| `/jogadores`, `/jogadores/[id]` | Lista com badge de nível e disponibilidade; perfil público com histórico, troféus e head-to-head |
| `/perfil` | Seus dados, troféus, histórico, editar (nome, telefone, senha, disponibilidade), sair |
| `/admin` | Temporadas (criar, abrir/fechar inscrições, montar divisões com sugestão automática, gerar confrontos, iniciar playoffs, encerrar) · usuários (nível, admin, desativar) · resultados (corrigir/W.O.) · configurações (código de convite, fuso, nome da comunidade) |

**Visual:** tema claro único; base neutra (zinc), **verde-quadra** como cor primária de ação, **amarelo-bola** em destaques (troféus, posições); tipografia Geist; cards arredondados (rounded-2xl), alvos de toque ≥44px, empty states desenhados. **PWA**: manifest + ícones para "adicionar à tela inicial" (sem service worker/offline no MVP).

**Notificações no MVP:** badge de pendências no app + e-mail (Resend) em exatamente 3 eventos: proposta de jogo recebida, amistoso combinado criado com você, placar aguardando sua confirmação. (Reset de senha à parte.)

## 8. Arquitetura técnica

- **Um único serviço** Next.js (App Router) no Railway + Postgres do Railway. Prisma como ORM (migrations no deploy).
- Leituras em Server Components; escritas em **Server Actions** finas que validam (zod) e delegam para **módulos de serviço** (`lib/services/`): `auth`, `convites` (criar/aceitar/cancelar), `liga` (gerar confrontos, propor/aceitar data), `placar` (lançar/confirmar/contestar/W.O.), `temporada` (ciclo de vida, divisões, classificação, playoffs), `notificacoes` (e-mails). **Os serviços são a API que o bot da fase 2 consome** — nada de regra de negócio em componente.
- Transações Postgres nos pontos de corrida: aceite de convite aberto (dois "topo jogar" simultâneos), confirmação de placar, inscrição na temporada após fechamento.
- Datas em UTC (`timestamptz`); exibição no fuso de `AppSettings.timezone` via `date-fns-tz`.
- Variáveis de ambiente: `DATABASE_URL`, `RESEND_API_KEY`, `SESSION_SECRET`, `APP_URL`.

### Modelo de dados (Prisma, campos essenciais)

- **User** — `id`, `name`, `email` (único), `phone` (único, E.164), `passwordHash`, `level` (1–7), `availability` (jsonb, opcional), `isAdmin`, `isActive`, `createdAt`
- **Session** — `id`, `userId`, `expiresAt`
- **PasswordResetToken** — `id`, `userId`, `tokenHash`, `expiresAt`, `usedAt?`
- **AppSettings** (linha única) — `communityName`, `inviteCode`, `timezone`
- **Season** — `id`, `name`, `status` (`rascunho|inscricoes|liga|playoffs|encerrada`), `inscricoesAte`, `ligaAte`
- **SeasonEntry** — `seasonId` + `userId` (único)
- **Division** — `id`, `seasonId`, `name`, `order`
- **DivisionPlayer** — `divisionId` + `userId`, `finalPosition?`
- **Match** — `id`, `type` (`amistoso|liga|playoff`), `status` (`pendente|aberto|proposto|marcado|aguardando_confirmacao|confirmado|cancelado|wo`), `seasonId?`, `divisionId?`, `round?` (`semi1|semi2|final`), `playerAId`, `playerBId?` (null apenas em amistoso aberto), `createdById`, `scheduledAt?`, `location?`, `note?`, `format` (`bo3_mtb|set_unico|proset8`, default `bo3_mtb`), `proposedById?`, `score?` (jsonb, ex.: `[[6,4],[3,6],[10,7]]`), `winnerId?`, `reportedById?`, `reportedAt?`, `confirmedAt?`

Fluxos de status por tipo:
- Amistoso aberto: `aberto → marcado → (aguardando_confirmacao → confirmado)? | cancelado` (terminal). Amistoso `marcado` com data passada é exibido como "jogado"; lançamento de placar permitido por 7 dias.
- Amistoso combinado: nasce `marcado`
- Liga: `pendente → proposto → marcado → aguardando_confirmacao → confirmado`. Cancelar um jogo de liga `proposto/marcado` devolve o confronto a `pendente` (não existe liga `cancelado`). `wo` é terminal e só o admin aplica; em `wo`, `winnerId` indica quem recebe os 2 pts.
- Playoff: nasce `pendente` com `round`; final criada quando as duas semis confirmam

Auto-confirmação de 48h e a virada de amistoso para "jogado" são avaliadas **preguiçosamente** (na leitura e efetivadas na próxima escrita) — sem cron/worker no MVP, alinhado ao custo mínimo.

Avatar: iniciais coloridas (hash do nome → cor da paleta). Sem upload de arquivos no MVP.

## 9. Fase 2 — Bot do WhatsApp (planejada, não construída agora)

**Contexto da pesquisa:** a API oficial da Meta não serve — o Groups API (out/2025) só gerencia grupos criados via API com máx. 8 participantes; não há caminho oficial para ler/escrever no grupo real. Caminho não-oficial viola os ToS do WhatsApp (risco real de banimento do número), por isso:

- **Número dedicado** (chip pré-pago barato), nunca o pessoal do professor. Bot estritamente **reativo** + 1 resumo diário ⇒ risco histórico de ban <2%.
- **Implementação de custo zero extra:** **Baileys** (WebSocket puro, sem navegador) rodando **no mesmo processo/serviço** do Next.js no Railway; credenciais da sessão persistidas no Postgres (reconecta após deploy sem re-escanear QR). Plano B, se a operação der trabalho: Evolution API como serviço separado (template Railway de 1 clique; custo extra de serviço/Redis).
- **Vinculação automática de conta pelo telefone**: mensagem no grupo/DM → número do remetente casa com `User.phone` → age em nome dele. Número desconhecido recebe link de cadastro com o código de convite.
- **Funciona no grupo e por DM** com os mesmos comandos:
  - `!jogos` — lista convites abertos · `!topo 2` — aceita o convite nº 2
  - `!convite sáb 10h [local]` — publica amistoso aberto
  - `!amistoso @João sáb 10h` — salva amistoso já combinado (o gesto principal: achou parceiro no grupo, salva no app)
  - `!placar 6-4 3-6 10-7` — lança placar do seu jogo marcado mais recente · confirmação respondida com `!ok`
  - `!tabela` — classificação da sua divisão · `!pendentes` — seus confrontos sem data
  - **Resumo diário 19h** no grupo: convites abertos, jogos de amanhã, placares aguardando confirmação — com deep links.
- O bot **nunca substitui o web**: chaveamento, admin, histórico e perfis vivem no app; o bot cria/consulta e manda links.
- O MVP entrega as pré-condições: telefone único E.164, camada de serviços, páginas deep-linkáveis.

## 10. Erros, casos-limite e testes

**Tratamento de erros**
- Validação zod em toda Server Action; mensagens em português junto ao campo.
- Erros de negócio explícitos e amigáveis ("esse convite acabou de ser aceito por outra pessoa").
- Corridas resolvidas por transação + verificação de estado (aceite duplo, confirmação dupla, inscrição após fechamento).
- Empty states desenhados: mural vazio, sem temporada ativa, divisão sem jogos, histórico vazio.

**Testes**
- **Unitários (Vitest)** na lógica pura — é onde mora o risco real: geração round-robin (círculo; nº ímpar de jogadores ⇒ bye), classificação com todos os desempates, transições de status de Match (matriz tipo × ação × estado), semeadura de playoffs (top 4; divisão <6 ⇒ top 2), validação de placar por formato.
- **Integração** (Postgres real) nas actions críticas: aceitar convite concorrente, lançar/confirmar/contestar placar, ciclo completo de temporada pequena (6 jogadores).
- E2E fica fora do MVP (smoke manual guiado por checklist antes de cada release).

## 11. Deploy e custos

- Railway: serviço Next.js + Postgres, deploy por push (GitHub), `prisma migrate deploy` no release, domínio `*.up.railway.app` (domínio próprio opcional depois).
- Custo alvo: plano Hobby (~US$ 5/mês, inclui crédito de uso) cobre app + banco neste porte. Resend no tier grátis (100 e-mails/dia). Fase 2 soma só o chip pré-pago do número do bot.

## 12. Fora de escopo do MVP (explícito)

Ranking geral/Elo · desafio direto posicional de ladder · duplas · reserva de quadra · upload de foto · push notifications · dark mode · multi-comunidade (o app é single-tenant por design) · auto-ajuste de nível por resultados · i18n (pt-BR fixo) · qualquer parte do bot do WhatsApp (seção 9 é planejamento).
