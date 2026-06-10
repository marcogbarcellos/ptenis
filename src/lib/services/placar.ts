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
      score: sets as Prisma.InputJsonValue,
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
      score: sets as Prisma.InputJsonValue,
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
