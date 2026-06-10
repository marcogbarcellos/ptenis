import { createHash, randomBytes } from "crypto";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hashSenha, verificarSenha } from "@/lib/auth/password";
import { calcularNivel } from "@/lib/nivel";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function registrar(
  db: Db,
  input: { codigo: string; nome: string; email: string; telefone: string; senha: string; respostas: number[] }
) {
  const settings = await db.appSettings.findUniqueOrThrow({ where: { id: 1 } });
  if (input.codigo.trim().toUpperCase() !== settings.inviteCode.toUpperCase())
    throw new AppError("Código de convite inválido. Peça o código no grupo.");
  if (await db.user.findUnique({ where: { email: input.email } }))
    throw new AppError("Já existe uma conta com esse e-mail.");
  if (await db.user.findUnique({ where: { phone: input.telefone } }))
    throw new AppError("Já existe uma conta com esse telefone.");
  return db.user.create({
    data: {
      name: input.nome,
      email: input.email,
      phone: input.telefone,
      passwordHash: await hashSenha(input.senha),
      level: calcularNivel(input.respostas),
    },
  });
}

export async function autenticar(db: Db, email: string, senha: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive || !(await verificarSenha(user.passwordHash, senha)))
    throw new AppError("E-mail ou senha incorretos.");
  return user;
}

export async function solicitarResetSenha(db: Db, email: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;
  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  return { user, token };
}

export async function redefinirSenha(db: Db, token: string, novaSenha: string) {
  const t = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!t || t.usedAt || t.expiresAt < new Date())
    throw new AppError("Link inválido ou expirado. Peça um novo.");
  await db.passwordResetToken.update({ where: { id: t.id }, data: { usedAt: new Date() } });
  return db.user.update({
    where: { id: t.userId },
    data: { passwordHash: await hashSenha(novaSenha) },
  });
}

export async function atualizarPerfil(
  db: Db,
  userId: string,
  input: { nome: string; telefone: string; availability?: string[] }
) {
  const existente = await db.user.findUnique({ where: { phone: input.telefone } });
  if (existente && existente.id !== userId)
    throw new AppError("Já existe uma conta com esse telefone.");
  return db.user.update({
    where: { id: userId },
    data: { name: input.nome, phone: input.telefone, availability: input.availability ?? [] },
  });
}

export async function alterarSenha(db: Db, userId: string, atual: string, nova: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verificarSenha(user.passwordHash, atual)))
    throw new AppError("Senha atual incorreta.");
  return db.user.update({ where: { id: userId }, data: { passwordHash: await hashSenha(nova) } });
}
