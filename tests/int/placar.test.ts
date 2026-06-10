import { beforeEach, describe, expect, it } from "vitest";
import { criarAmistosoCombinado } from "@/lib/services/convites";
import { cancelarJogo, resolverPendencias } from "@/lib/services/jogos";
import { adminMarcarWO, confirmarPlacar, contestarPlacar, lancarPlacar } from "@/lib/services/placar";
import { criarUsuario, resetDb, testDb } from "../helpers/db";

beforeEach(resetDb);
const amanha = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

async function jogoMarcado() {
  const a = await criarUsuario();
  const b = await criarUsuario();
  const m = await criarAmistosoCombinado(testDb, {
    criadorId: a.id, parceiroId: b.id, scheduledAt: amanha(), location: null, note: null,
  });
  return { a, b, m };
}

describe("placar", () => {
  it("lançar → confirmar atualiza vencedor", async () => {
    const { a, b, m } = await jogoMarcado();
    const lancado = await lancarPlacar(testDb, m.id, a.id, [[6, 4], [6, 2]]);
    expect(lancado.status).toBe("aguardando_confirmacao");
    expect(lancado.winnerId).toBe(a.id);
    const conf = await confirmarPlacar(testDb, m.id, b.id);
    expect(conf.status).toBe("confirmado");
  });
  it("vencedor B quando playerB ganha; quem lançou não confirma", async () => {
    const { a, b, m } = await jogoMarcado();
    const lancado = await lancarPlacar(testDb, m.id, b.id, [[4, 6], [2, 6]]);
    expect(lancado.winnerId).toBe(b.id);
    await expect(confirmarPlacar(testDb, m.id, b.id)).rejects.toThrow(/adversário/i);
  });
  it("contestar limpa o placar e volta a marcado", async () => {
    const { a, b, m } = await jogoMarcado();
    await lancarPlacar(testDb, m.id, a.id, [[6, 0], [6, 0]]);
    const c = await contestarPlacar(testDb, m.id, b.id);
    expect(c.status).toBe("marcado");
    expect(c.score).toBeNull();
    expect(c.winnerId).toBeNull();
  });
  it("não-participante não lança", async () => {
    const { m } = await jogoMarcado();
    const x = await criarUsuario();
    await expect(lancarPlacar(testDb, m.id, x.id, [[6, 0], [6, 0]])).rejects.toThrow();
  });
  it("auto-confirma após 48h via resolverPendencias", async () => {
    const { a, m } = await jogoMarcado();
    await lancarPlacar(testDb, m.id, a.id, [[6, 4], [6, 4]]);
    await testDb.match.update({
      where: { id: m.id },
      data: { reportedAt: new Date(Date.now() - 49 * 60 * 60 * 1000) },
    });
    await resolverPendencias(testDb);
    const depois = await testDb.match.findUniqueOrThrow({ where: { id: m.id } });
    expect(depois.status).toBe("confirmado");
  });
});

describe("cancelar e W.O.", () => {
  it("participante cancela amistoso marcado (terminal)", async () => {
    const { b, m } = await jogoMarcado();
    const c = await cancelarJogo(testDb, m.id, b.id);
    expect(c.status).toBe("cancelado");
  });
  it("cancelar jogo de liga volta a pendente e limpa a proposta", async () => {
    const { a, b } = await jogoMarcado();
    const liga = await testDb.match.create({
      data: {
        type: "liga", status: "marcado", playerAId: a.id, playerBId: b.id,
        createdById: a.id, scheduledAt: amanha(), proposedById: a.id, location: "X",
      },
    });
    const c = await cancelarJogo(testDb, liga.id, a.id);
    expect(c.status).toBe("pendente");
    expect(c.scheduledAt).toBeNull();
    expect(c.proposedById).toBeNull();
  });
  it("W.O. dá vitória sem sets", async () => {
    const { a, b } = await jogoMarcado();
    const liga = await testDb.match.create({
      data: { type: "liga", status: "pendente", playerAId: a.id, playerBId: b.id, createdById: a.id },
    });
    const wo = await adminMarcarWO(testDb, liga.id, a.id);
    expect(wo.status).toBe("wo");
    expect(wo.winnerId).toBe(a.id);
    expect(wo.score).toBeNull();
  });
});
