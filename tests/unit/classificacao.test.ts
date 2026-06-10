import { describe, expect, it } from "vitest";
import { computeStandings, type JogoClassificavel } from "@/lib/classificacao";

const jogadores = [
  { userId: "ana", ordemInscricao: 0 },
  { userId: "bia", ordemInscricao: 1 },
  { userId: "cris", ordemInscricao: 2 },
  { userId: "duda", ordemInscricao: 3 },
];

const jogo = (a: string, b: string, winner: string, score: number[][] | null, status: "confirmado" | "wo" = "confirmado"): JogoClassificavel =>
  ({ playerAId: a, playerBId: b, winnerId: winner, score, status });

describe("computeStandings", () => {
  it("pontua 2/1 e W.O. 2/0", () => {
    const s = computeStandings(jogadores, [
      jogo("ana", "bia", "ana", [[6, 0], [6, 0]]),
      jogo("cris", "duda", "cris", null, "wo"),
    ]);
    const por = Object.fromEntries(s.map((x) => [x.userId, x]));
    expect(por.ana.pontos).toBe(2);
    expect(por.bia.pontos).toBe(1);  // derrota jogada vale 1
    expect(por.cris.pontos).toBe(2);
    expect(por.duda.pontos).toBe(0); // W.O. não pontua
    expect(por.cris.saldoSets).toBe(0); // W.O. sem sets
  });
  it("empate entre 2 resolve por confronto direto", () => {
    // 6 jogos com resultado 6/0 6/0: bia=5pts/+2sets/+12games, ana=5pts/+2sets/+12games
    // apenas confronto direto diferencia: bia venceu ana
    const s = computeStandings(jogadores, [
      jogo("bia", "ana", "bia", [[6, 0], [6, 0]]),
      jogo("ana", "cris", "ana", [[6, 0], [6, 0]]),
      jogo("ana", "duda", "ana", [[6, 0], [6, 0]]),
      jogo("bia", "cris", "bia", [[6, 0], [6, 0]]),
      jogo("duda", "bia", "duda", [[6, 0], [6, 0]]),
      jogo("cris", "duda", "cris", [[6, 0], [6, 0]]),
    ]);
    // bia e ana empatam em tudo (5 pts, +2 sets, +12 games); bia venceu o confronto direto
    const posBia = s.findIndex((x) => x.userId === "bia");
    const posAna = s.findIndex((x) => x.userId === "ana");
    expect(posBia).toBeLessThan(posAna);
  });
  it("empate múltiplo (3+) pula confronto direto e cai para saldo de sets/games", () => {
    const s = computeStandings(jogadores.slice(0, 3), [
      jogo("ana", "bia", "ana", [[6, 4], [6, 4]]),
      jogo("bia", "cris", "bia", [[6, 0], [6, 0]]),
      jogo("cris", "ana", "cris", [[6, 1], [6, 1]]),
    ]);
    // todos 1V/1D = 3 pts e saldo de sets 0; decide saldo de games:
    // ana +4−10=−6 · bia +12−4=+8 · cris +10−12=−2  →  bia, cris, ana
    expect(s.map((x) => x.userId)).toEqual(["bia", "cris", "ana"]);
    expect(s.map((x) => x.posicao)).toEqual([1, 2, 3]);
  });
  it("último desempate é a ordem de inscrição (determinístico)", () => {
    const s = computeStandings(jogadores.slice(0, 2), []);
    expect(s[0].userId).toBe("ana");
    expect(s.map((x) => x.posicao)).toEqual([1, 2]);
  });
});
