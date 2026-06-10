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
    const minhaEntry = inscritos.find((e) => e.userId === user.id);
    const inscrito = !!minhaEntry;
    const datas = [
      season.inscricoesAte && `Inscrições até ${formatarData(season.inscricoesAte, timezone)}`,
      season.gruposAte && `Grupos até ${formatarData(season.gruposAte, timezone)}`,
      season.ligaAte && `Playoffs até ${formatarData(season.ligaAte, timezone)}`,
    ].filter(Boolean);
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-bold">{season.name}</h1>
          {datas.length > 0 && (
            <p className="text-sm text-muted-foreground">{datas.join(" · ")}</p>
          )}
        </header>
        <InscricaoButtons
          seasonId={season.id}
          inscrito={inscrito}
          divisoes={season.divisions.map((d) => ({ id: d.id, name: d.name }))}
          preferredDivisionId={minhaEntry?.preferredDivisionId}
        />
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
            ? <>Fase de grupos{season.gruposAte && ` — até ${formatarData(season.gruposAte, timezone)}`}</>
            : <>Playoffs 🔥{season.ligaAte && ` — até ${formatarData(season.ligaAte, timezone)}`}</>}
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
