import { beforeEach, describe, expect, it } from "vitest";
import { aceitarProposta, proporData } from "@/lib/services/liga";
import { criarUsuario, resetDb, testDb } from "../helpers/db";

beforeEach(resetDb);
const amanha = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

async function confrontoPendente() {
  const a = await criarUsuario();
  const b = await criarUsuario();
  const m = await testDb.match.create({
    data: { type: "liga", status: "pendente", playerAId: a.id, playerBId: b.id, createdById: a.id },
  });
  return { a, b, m };
}

describe("proposta de data na liga", () => {
  it("propor → aceitar marca o jogo", async () => {
    const { a, b, m } = await confrontoPendente();
    const p = await proporData(testDb, m.id, a.id, { scheduledAt: amanha(), location: "Quadra 1" });
    expect(p.status).toBe("proposto");
    expect(p.proposedById).toBe(a.id);
    const marcado = await aceitarProposta(testDb, m.id, b.id);
    expect(marcado.status).toBe("marcado");
  });
  it("contraproposta substitui e inverte quem propôs", async () => {
    const { a, b, m } = await confrontoPendente();
    await proporData(testDb, m.id, a.id, { scheduledAt: amanha(), location: null });
    const outra = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const contra = await proporData(testDb, m.id, b.id, { scheduledAt: outra, location: "Quadra 2" });
    expect(contra.proposedById).toBe(b.id);
    expect(contra.scheduledAt!.getTime()).toBe(outra.getTime());
    const marcado = await aceitarProposta(testDb, m.id, a.id);
    expect(marcado.status).toBe("marcado");
  });
  it("quem propôs não aceita a própria proposta; estranho não propõe", async () => {
    const { a, m } = await confrontoPendente();
    await proporData(testDb, m.id, a.id, { scheduledAt: amanha(), location: null });
    await expect(aceitarProposta(testDb, m.id, a.id)).rejects.toThrow(/adversário/i);
    const x = await criarUsuario();
    await expect(proporData(testDb, m.id, x.id, { scheduledAt: amanha(), location: null })).rejects.toThrow();
  });
  it("não propõe em jogo já marcado", async () => {
    const { a, b, m } = await confrontoPendente();
    await proporData(testDb, m.id, a.id, { scheduledAt: amanha(), location: null });
    await aceitarProposta(testDb, m.id, b.id);
    await expect(proporData(testDb, m.id, a.id, { scheduledAt: amanha(), location: null })).rejects.toThrow();
  });
});
