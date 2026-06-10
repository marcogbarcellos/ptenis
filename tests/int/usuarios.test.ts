import { beforeEach, describe, expect, it } from "vitest";
import { autenticar, redefinirSenha, registrar, solicitarResetSenha } from "@/lib/services/usuarios";
import { verificarSenha } from "@/lib/auth/password";
import { criarUsuario, resetDb, testDb } from "../helpers/db";

beforeEach(resetDb);

const dados = {
  codigo: "PTENIS2026",
  nome: "Ana",
  email: "ana@teste.com",
  telefone: "+5511912345678",
  senha: "segredo1",
  respostas: [2, 2, 3, 3],
};

describe("registrar", () => {
  it("cria usuário com nível calculado e senha verificável", async () => {
    const u = await registrar(testDb, dados);
    expect(u.level).toBe(4);
    expect(await verificarSenha(u.passwordHash, "segredo1")).toBe(true);
  });
  it("rejeita código de convite errado", async () => {
    await expect(registrar(testDb, { ...dados, codigo: "ERRADO" })).rejects.toThrow(/convite/i);
  });
  it("rejeita e-mail e telefone duplicados", async () => {
    await registrar(testDb, dados);
    await expect(
      registrar(testDb, { ...dados, telefone: "+5511999999999" })
    ).rejects.toThrow(/e-mail/i);
    await expect(
      registrar(testDb, { ...dados, email: "outra@teste.com" })
    ).rejects.toThrow(/telefone/i);
  });
});

describe("autenticar", () => {
  it("rejeita senha errada e usuário desativado com a mesma mensagem", async () => {
    await registrar(testDb, dados);
    await expect(autenticar(testDb, dados.email, "senhaErrada")).rejects.toThrow(/incorretos/i);
    const desativado = await registrar(testDb, {
      ...dados,
      email: "bia@teste.com",
      telefone: "+5511988887777",
    });
    await testDb.user.update({ where: { id: desativado.id }, data: { isActive: false } });
    await expect(autenticar(testDb, "bia@teste.com", dados.senha)).rejects.toThrow(/incorretos/i);
  });
});

describe("reset de senha", () => {
  it("fluxo completo: solicitar → redefinir → sessões derrubadas → token não reutilizável", async () => {
    const u = await criarUsuario();
    await testDb.session.create({
      data: { id: "fake-hash", userId: u.id, expiresAt: new Date(Date.now() + 86400000) },
    });
    const r = await solicitarResetSenha(testDb, u.email);
    expect(r).not.toBeNull();
    await redefinirSenha(testDb, r!.token, "novaSenha1");
    const atualizado = await testDb.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await verificarSenha(atualizado.passwordHash, "novaSenha1")).toBe(true);
    expect(await testDb.session.count({ where: { userId: u.id } })).toBe(0);
    await expect(redefinirSenha(testDb, r!.token, "outra123")).rejects.toThrow();
  });
  it("token expirado é rejeitado", async () => {
    const u = await criarUsuario();
    const r = await solicitarResetSenha(testDb, u.email);
    await testDb.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(redefinirSenha(testDb, r!.token, "novaSenha1")).rejects.toThrow(/expirado/i);
  });
  it("e-mail desconhecido retorna null (não vaza existência)", async () => {
    expect(await solicitarResetSenha(testDb, "nao@existe.com")).toBeNull();
  });
});
