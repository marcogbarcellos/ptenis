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

  const agora = new Date().getTime();
  const souParticipante = match.playerAId === user.id || match.playerBId === user.id;
  const cancelarPossivel =
    souParticipante &&
    ["aberto", "proposto", "marcado"].includes(match.status) &&
    !(match.scheduledAt && match.scheduledAt.getTime() < agora && match.status === "marcado");

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
