import type { Db } from "@/lib/db";

export async function statsDoJogador(db: Db, userId: string) {
  const meus = { OR: [{ playerAId: userId }, { playerBId: userId }] };
  const jogos = await db.match.findMany({
    where: { ...meus, status: { in: ["confirmado", "wo"] } },
    include: { playerA: true, playerB: true },
    orderBy: { confirmedAt: "desc" },
  });
  // amistosos jogados sem placar entram no histórico (spec §4), mas não nas estatísticas
  const jogadosSemPlacar = await db.match.findMany({
    where: { ...meus, type: "amistoso", status: "marcado", scheduledAt: { lt: new Date() } },
    include: { playerA: true, playerB: true },
    orderBy: { scheduledAt: "desc" },
  });
  const vitorias = jogos.filter((m) => m.winnerId === userId).length;
  return {
    jogos,
    historico: [...jogadosSemPlacar, ...jogos],
    total: jogos.length,
    vitorias,
    derrotas: jogos.length - vitorias,
  };
}

export function headToHead(jogos: { winnerId: string | null; playerAId: string; playerBId: string | null }[], euId: string, outroId: string) {
  const entreNos = jogos.filter(
    (m) =>
      (m.playerAId === euId && m.playerBId === outroId) ||
      (m.playerAId === outroId && m.playerBId === euId)
  );
  return {
    total: entreNos.length,
    minhas: entreNos.filter((m) => m.winnerId === euId).length,
    dele: entreNos.filter((m) => m.winnerId === outroId).length,
  };
}

export async function trofeus(db: Db, userId: string) {
  return db.divisionPlayer.findMany({
    where: { userId, finalPosition: 1, division: { season: { status: "encerrada" } } },
    include: { division: { include: { season: true } } },
  });
}
