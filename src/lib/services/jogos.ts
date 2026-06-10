import type { Db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { criarFinaisProntas } from "@/lib/services/temporada";

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
  await criarFinaisProntas(db);
}
