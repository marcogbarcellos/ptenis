import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getClassificacao } from "@/lib/services/temporada";
import { sugerirDivisoes } from "@/lib/divisoes";
import { placarTexto } from "@/lib/format";
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
          inscritos={season.entries.map((e) => ({
            id: e.user.id,
            name: e.user.name,
            level: e.user.level,
            preferredDivisionId: e.preferredDivisionId,
          }))}
          sugestao={sugerirDivisoes(season.entries.map((e) => ({ userId: e.userId, level: e.user.level })))}
          divisoesPre={season.divisions.map((d) => ({ id: d.id, name: d.name, order: d.order }))}
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
