import { beforeEach, describe, expect, it } from "vitest";
import { aceitarConvite, criarAmistosoCombinado, criarConviteAberto } from "@/lib/services/convites";
import { criarUsuario, resetDb, testDb } from "../helpers/db";

beforeEach(resetDb);
const amanha = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

describe("convite aberto", () => {
  it("cria no mural e outro jogador aceita", async () => {
    const ana = await criarUsuario();
    const beto = await criarUsuario();
    const m = await criarConviteAberto(testDb, {
      criadorId: ana.id, scheduledAt: amanha(), location: "Academia", note: null,
    });
    expect(m.status).toBe("aberto");
    expect(m.type).toBe("amistoso");
    const aceito = await aceitarConvite(testDb, m.id, beto.id);
    expect(aceito.status).toBe("marcado");
    expect(aceito.playerBId).toBe(beto.id);
  });
  it("segundo aceite falha (corrida)", async () => {
    const [a, b, c] = await Promise.all([criarUsuario(), criarUsuario(), criarUsuario()]);
    const m = await criarConviteAberto(testDb, { criadorId: a.id, scheduledAt: amanha(), location: null, note: null });
    await aceitarConvite(testDb, m.id, b.id);
    await expect(aceitarConvite(testDb, m.id, c.id)).rejects.toThrow(/aceito|disponível/i);
  });
  it("criador não aceita o próprio convite; data passada não cria", async () => {
    const a = await criarUsuario();
    const m = await criarConviteAberto(testDb, { criadorId: a.id, scheduledAt: amanha(), location: null, note: null });
    await expect(aceitarConvite(testDb, m.id, a.id)).rejects.toThrow(/próprio/i);
    await expect(
      criarConviteAberto(testDb, { criadorId: a.id, scheduledAt: new Date(Date.now() - 1000), location: null, note: null })
    ).rejects.toThrow(/futuro/i);
  });
});

describe("amistoso combinado", () => {
  it("nasce marcado com os dois jogadores", async () => {
    const a = await criarUsuario();
    const b = await criarUsuario();
    const m = await criarAmistosoCombinado(testDb, {
      criadorId: a.id, parceiroId: b.id, scheduledAt: amanha(), location: "Quadra 2", note: null,
    });
    expect(m.status).toBe("marcado");
    expect([m.playerAId, m.playerBId]).toEqual([a.id, b.id]);
  });
  it("não combina consigo mesmo", async () => {
    const a = await criarUsuario();
    await expect(
      criarAmistosoCombinado(testDb, { criadorId: a.id, parceiroId: a.id, scheduledAt: amanha(), location: null, note: null })
    ).rejects.toThrow();
  });
});
