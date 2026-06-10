import { beforeEach, describe, expect, it } from "vitest";
import { criarSessao, destruirSessao, validarSessao } from "@/lib/auth/session";
import { criarUsuario, resetDb, testDb } from "../helpers/db";

beforeEach(resetDb);

describe("sessão", () => {
  it("cria, valida e destrói", async () => {
    const u = await criarUsuario();
    const token = await criarSessao(testDb, u.id);
    const user = await validarSessao(testDb, token);
    expect(user?.id).toBe(u.id);
    await destruirSessao(testDb, token);
    expect(await validarSessao(testDb, token)).toBeNull();
  });
  it("rejeita sessão expirada e usuário desativado", async () => {
    const u = await criarUsuario();
    const token = await criarSessao(testDb, u.id);
    await testDb.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validarSessao(testDb, token)).toBeNull();

    const token2 = await criarSessao(testDb, u.id);
    await testDb.user.update({ where: { id: u.id }, data: { isActive: false } });
    expect(await validarSessao(testDb, token2)).toBeNull();
  });
});
