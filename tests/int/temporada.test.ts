import { beforeEach, describe, expect, it } from "vitest";
import {
  abrirInscricoes, criarFinaisProntas, criarTemporada, encerrarTemporada,
  getClassificacao, inscrever, iniciarLiga, iniciarPlayoffs,
} from "@/lib/services/temporada";
import { adminDefinirPlacar } from "@/lib/services/placar";
import { trofeus } from "@/lib/stats";
import { criarUsuario, resetDb, testDb } from "../helpers/db";

beforeEach(resetDb);

// placar onde o jogador "mais forte" (índice menor) vence
const placarDoMaisForte = [[6, 3], [6, 3]];

async function setupLigaDe6() {
  const jogadores = [];
  for (let i = 0; i < 6; i++) jogadores.push(await criarUsuario({ level: 7 - i }));
  const season = await criarTemporada(testDb, { nome: "Temporada Teste" });
  await abrirInscricoes(testDb, season.id);
  for (const j of jogadores) await inscrever(testDb, season.id, j.id);
  await iniciarLiga(testDb, season.id, [
    { name: "Divisão A", userIds: jogadores.map((j) => j.id) },
  ]);
  return { season, jogadores };
}

// resolve todos os jogos de liga: vence quem tem índice menor na lista
async function resolverLiga(jogadores: { id: string }[]) {
  const forca = new Map(jogadores.map((j, i) => [j.id, i]));
  const pendentes = await testDb.match.findMany({ where: { type: "liga" } });
  for (const m of pendentes) {
    const aMaisForte = forca.get(m.playerAId)! < forca.get(m.playerBId!)!;
    await adminDefinirPlacar(testDb, m.id, aMaisForte ? placarDoMaisForte : [[3, 6], [3, 6]]);
  }
}

describe("ciclo completo da temporada", () => {
  it("inscrições → liga (15 jogos) → playoffs → final → campeão", async () => {
    const { season, jogadores } = await setupLigaDe6();
    expect(await testDb.match.count({ where: { type: "liga", status: "pendente" } })).toBe(15);

    await resolverLiga(jogadores);
    const div = await testDb.division.findFirstOrThrow();
    const { standings } = await getClassificacao(testDb, div.id);
    expect(standings[0].userId).toBe(jogadores[0].id);
    expect(standings[0].pontos).toBe(10); // 5 vitórias × 2

    await iniciarPlayoffs(testDb, season.id);
    const semis = await testDb.match.findMany({ where: { type: "playoff" }, orderBy: { round: "asc" } });
    expect(semis.map((s) => s.round).sort()).toEqual(["semi1", "semi2"]);
    const semi1 = semis.find((s) => s.round === "semi1")!;
    expect([semi1.playerAId, semi1.playerBId]).toEqual([jogadores[0].id, jogadores[3].id]);

    // zebra: 4º vence o 1º; 2º vence o 3º
    await adminDefinirPlacar(testDb, semi1.id, [[3, 6], [3, 6]]);
    const semi2 = semis.find((s) => s.round === "semi2")!;
    await adminDefinirPlacar(testDb, semi2.id, placarDoMaisForte);

    await criarFinaisProntas(testDb);
    const final = await testDb.match.findFirstOrThrow({ where: { round: "final" } });
    expect([final.playerAId, final.playerBId].sort()).toEqual(
      [jogadores[3].id, jogadores[1].id].sort()
    );

    // 2º da liga vence a final
    const vencedorEhA = final.playerAId === jogadores[1].id;
    await adminDefinirPlacar(testDb, final.id, vencedorEhA ? placarDoMaisForte : [[3, 6], [3, 6]]);
    await encerrarTemporada(testDb, season.id);

    const encerrada = await testDb.season.findUniqueOrThrow({ where: { id: season.id } });
    expect(encerrada.status).toBe("encerrada");
    const titulos = await trofeus(testDb, jogadores[1].id);
    expect(titulos).toHaveLength(1);
    const posicoes = await testDb.divisionPlayer.findMany({ orderBy: { finalPosition: "asc" } });
    expect(posicoes[0].userId).toBe(jogadores[1].id); // campeão
    expect(posicoes[1].userId).toBe(jogadores[3].id); // vice
    expect(posicoes[2].userId).toBe(jogadores[0].id); // 1º da liga fica em 3º
  });

  it("divisão com menos de 6 vai direto pra final (top 2)", async () => {
    const jogadores = [];
    for (let i = 0; i < 4; i++) jogadores.push(await criarUsuario());
    const season = await criarTemporada(testDb, { nome: "Mini" });
    await abrirInscricoes(testDb, season.id);
    for (const j of jogadores) await inscrever(testDb, season.id, j.id);
    await iniciarLiga(testDb, season.id, [{ name: "Divisão A", userIds: jogadores.map((j) => j.id) }]);
    await resolverLiga(jogadores);
    await iniciarPlayoffs(testDb, season.id);
    const playoff = await testDb.match.findMany({ where: { type: "playoff" } });
    expect(playoff).toHaveLength(1);
    expect(playoff[0].round).toBe("final");
  });

  it("guardas: inscrever fora do período e liga com não-inscrito falham", async () => {
    const u = await criarUsuario();
    const season = await criarTemporada(testDb, { nome: "X" });
    await expect(inscrever(testDb, season.id, u.id)).rejects.toThrow(/inscriç/i);
    await abrirInscricoes(testDb, season.id);
    await inscrever(testDb, season.id, u.id);
    const intruso = await criarUsuario();
    await expect(
      iniciarLiga(testDb, season.id, [{ name: "Divisão A", userIds: [u.id, intruso.id] }])
    ).rejects.toThrow(/inscrit/i);
  });
});
