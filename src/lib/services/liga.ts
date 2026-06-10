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
