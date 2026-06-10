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
