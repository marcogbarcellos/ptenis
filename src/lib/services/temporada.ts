import type { Db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { gerarConfrontos } from "@/lib/round-robin";
import { computeStandings } from "@/lib/classificacao";
import { seedPlayoffs, vencedoresDasSemis } from "@/lib/playoffs";

export async function criarTemporada(
  db: Db,
  input: { nome: string; inscricoesAte?: Date | null; gruposAte?: Date | null; ligaAte?: Date | null; numGrupos?: number }
) {
  if (!input.nome.trim()) throw new AppError("Dê um nome à temporada.");
  const numGrupos = Math.min(7, Math.max(0, input.numGrupos ?? 0));
  const client = db as { $transaction?: <T>(fn: (tx: Db) => Promise<T>) => Promise<T> };
  const executar = async (tx: Db) => {
    const season = await tx.season.create({
      data: {
        name: input.nome.trim(),
        inscricoesAte: input.inscricoesAte ?? null,
        gruposAte: input.gruposAte ?? null,
        ligaAte: input.ligaAte ?? null,
      },
    });
    if (numGrupos > 0) {
      await tx.division.createMany({
        data: Array.from({ length: numGrupos }, (_, i) => ({
          seasonId: season.id,
          name: `Divisão ${String.fromCharCode(65 + i)}`,
          order: i,
        })),
      });
    }
    return season;
  };
  if (client.$transaction) return client.$transaction(executar);
  return executar(db);
}

export async function abrirInscricoes(db: Db, seasonId: string) {
  const { count } = await db.season.updateMany({
    where: { id: seasonId, status: "rascunho" },
    data: { status: "inscricoes" },
  });
  if (count === 0) throw new AppError("Essa temporada não está em rascunho.");
}

export async function inscrever(db: Db, seasonId: string, userId: string, preferredDivisionId?: string | null) {
  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season || season.status !== "inscricoes")
    throw new AppError("As inscrições não estão abertas.");
  if (preferredDivisionId) {
    const div = await db.division.findUnique({ where: { id: preferredDivisionId } });
    if (!div || div.seasonId !== seasonId) throw new AppError("Grupo inválido.");
  }
  return db.seasonEntry.upsert({
    where: { seasonId_userId: { seasonId, userId } },
    update: { preferredDivisionId: preferredDivisionId ?? null },
    create: { seasonId, userId, preferredDivisionId: preferredDivisionId ?? null },
  });
}

export async function cancelarInscricao(db: Db, seasonId: string, userId: string) {
  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season || season.status !== "inscricoes")
    throw new AppError("As inscrições já fecharam — fale com o admin.");
  await db.seasonEntry.deleteMany({ where: { seasonId, userId } });
}

export async function iniciarLiga(
  db: Db,
  seasonId: string,
  divisoes: { name: string; userIds: string[] }[]
) {
  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season || season.status !== "inscricoes")
    throw new AppError("A liga só começa a partir das inscrições.");
  const entries = await db.seasonEntry.findMany({
    where: { seasonId },
    orderBy: { createdAt: "asc" },
  });
  const ordem = new Map(entries.map((e, i) => [e.userId, i]));

  const vistos = new Set<string>();
  for (const d of divisoes) {
    if (!d.name.trim()) throw new AppError("Toda divisão precisa de nome.");
    if (d.userIds.length < 2) throw new AppError(`${d.name} precisa de pelo menos 2 jogadores.`);
    for (const id of d.userIds) {
      if (!ordem.has(id)) throw new AppError("Há jogador não inscrito numa divisão.");
      if (vistos.has(id)) throw new AppError("Jogador repetido em mais de uma divisão.");
      vistos.add(id);
    }
  }

  const client = db as { $transaction?: <T>(fn: (tx: Db) => Promise<T>) => Promise<T> };
  const executar = async (tx: Db) => {
    const existentes = await tx.division.findMany({ where: { seasonId } });
    const nomeParaId = new Map(existentes.map((d) => [d.name.trim(), d.id]));
    const idsUsados = new Set<string>();

    for (const [i, d] of divisoes.entries()) {
      let divisionId = nomeParaId.get(d.name.trim());
      if (divisionId) {
        await tx.division.update({ where: { id: divisionId }, data: { order: i } });
        idsUsados.add(divisionId);
      } else {
        const criada = await tx.division.create({
          data: { seasonId, name: d.name.trim(), order: i },
        });
        divisionId = criada.id;
        idsUsados.add(divisionId);
      }
      await tx.divisionPlayer.deleteMany({ where: { divisionId } });
      await tx.divisionPlayer.createMany({
        data: d.userIds.map((userId) => ({
          divisionId, userId, ordemInscricao: ordem.get(userId)!,
        })),
      });
      await tx.match.createMany({
        data: gerarConfrontos(d.userIds).map(([a, b]) => ({
          type: "liga" as const, status: "pendente" as const,
          seasonId, divisionId,
          playerAId: a, playerBId: b, createdById: a,
        })),
      });
    }
    // Remove divisões pré-criadas que não foram usadas
    for (const d of existentes) {
      if (!idsUsados.has(d.id)) await tx.division.delete({ where: { id: d.id } });
    }
    await tx.season.update({ where: { id: seasonId }, data: { status: "liga" } });
  };
  if (client.$transaction) await client.$transaction(executar);
  else await executar(db);
}

export async function getClassificacao(db: Db, divisionId: string) {
  const players = await db.divisionPlayer.findMany({
    where: { divisionId },
    include: { user: true },
  });
  const matches = await db.match.findMany({
    where: { divisionId, type: "liga" },
    include: { playerA: true, playerB: true },
  });
  const standings = computeStandings(
    players.map((p) => ({ userId: p.userId, ordemInscricao: p.ordemInscricao })),
    matches
  );
  const usuarios = new Map(players.map((p) => [p.userId, p.user]));
  return { standings, usuarios, matches };
}

export async function iniciarPlayoffs(db: Db, seasonId: string) {
  const season = await db.season.findUnique({
    where: { id: seasonId },
    include: { divisions: { include: { players: true } } },
  });
  if (!season || season.status !== "liga")
    throw new AppError("Os playoffs só começam com a liga em andamento.");

  for (const div of season.divisions) {
    const { standings } = await getClassificacao(db, div.id);
    const semeadura = seedPlayoffs(standings, div.players.length);
    if (semeadura.tipo === "semis") {
      await db.match.createMany({
        data: [
          { round: "semi1" as const, playerAId: semeadura.semi1[0], playerBId: semeadura.semi1[1] },
          { round: "semi2" as const, playerAId: semeadura.semi2[0], playerBId: semeadura.semi2[1] },
        ].map((m) => ({
          ...m, type: "playoff" as const, status: "pendente" as const,
          seasonId, divisionId: div.id, createdById: m.playerAId,
        })),
      });
    } else {
      await db.match.create({
        data: {
          type: "playoff", status: "pendente", round: "final",
          seasonId, divisionId: div.id,
          playerAId: semeadura.final[0], playerBId: semeadura.final[1],
          createdById: semeadura.final[0],
        },
      });
    }
  }
  await db.season.update({ where: { id: seasonId }, data: { status: "playoffs" } });
  // jogos de liga não realizados permanecem `pendente` (exibidos como "não realizado")
}

export async function criarFinaisProntas(db: Db) {
  const emPlayoffs = await db.season.findMany({
    where: { status: "playoffs" },
    include: { divisions: true },
  });
  for (const season of emPlayoffs) {
    for (const div of season.divisions) {
      const jogos = await db.match.findMany({ where: { divisionId: div.id, type: "playoff" } });
      if (jogos.some((m) => m.round === "final")) continue;
      const dupla = vencedoresDasSemis(jogos);
      if (!dupla) continue;
      await db.match
        .create({
          data: {
            type: "playoff", status: "pendente", round: "final",
            seasonId: season.id, divisionId: div.id,
            playerAId: dupla[0], playerBId: dupla[1], createdById: dupla[0],
          },
        })
        .catch(() => undefined); // corrida no unique(divisionId, round): outro request já criou
    }
  }
}

export async function encerrarTemporada(db: Db, seasonId: string) {
  const season = await db.season.findUnique({
    where: { id: seasonId },
    include: { divisions: true },
  });
  if (!season || season.status !== "playoffs")
    throw new AppError("Só dá para encerrar uma temporada em playoffs.");

  for (const div of season.divisions) {
    const final = await db.match.findFirst({
      where: { divisionId: div.id, type: "playoff", round: "final" },
    });
    if (!final || !["confirmado", "wo"].includes(final.status) || !final.winnerId)
      throw new AppError(`A final da ${div.name} ainda não terminou.`);

    const campeao = final.winnerId;
    const vice = final.playerAId === campeao ? final.playerBId! : final.playerAId;
    const { standings } = await getClassificacao(db, div.id);
    let proxima = 3;
    for (const s of standings) {
      const posicao = s.userId === campeao ? 1 : s.userId === vice ? 2 : proxima++;
      await db.divisionPlayer.update({
        where: { divisionId_userId: { divisionId: div.id, userId: s.userId } },
        data: { finalPosition: posicao },
      });
    }
  }
  await db.season.update({ where: { id: seasonId }, data: { status: "encerrada" } });
}

export async function getTemporadaAtual(db: Db) {
  return db.season.findFirst({
    where: { status: { not: "encerrada" } },
    orderBy: { createdAt: "desc" },
    include: { divisions: { orderBy: { order: "asc" }, include: { players: true } } },
  });
}
