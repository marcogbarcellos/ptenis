"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ActionState, runAction } from "@/lib/action-state";
import { cadastroSchema, entrarSchema, senhaSchema } from "@/lib/validation/schemas";
import { autenticar, redefinirSenha, registrar, solicitarResetSenha } from "@/lib/services/usuarios";
import { criarSessao, clearSessionCookie, destruirSessao, getSessionToken, setSessionCookie } from "@/lib/auth/session";
import { appUrl, emailResetSenha, sendEmail } from "@/lib/services/notificacoes";
import { AppError } from "@/lib/errors";

function primeiraMensagem(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

export async function cadastroAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let userId: string | null = null;
  const result = await runAction(async () => {
    const parsed = cadastroSchema.safeParse({
      codigo: formData.get("codigo"),
      nome: formData.get("nome"),
      email: formData.get("email"),
      telefone: formData.get("telefone"),
      senha: formData.get("senha"),
      respostas: [1, 2, 3, 4].map((i) => formData.get(`q${i}`)),
    });
    if (!parsed.success) throw new AppError(primeiraMensagem(parsed.error));
    const user = await registrar(db, parsed.data);
    userId = user.id;
  });
  if (!result.ok) return result;
  await setSessionCookie(await criarSessao(db, userId!));
  redirect("/");
}

export async function entrarAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let userId: string | null = null;
  const result = await runAction(async () => {
    const parsed = entrarSchema.safeParse({ email: formData.get("email"), senha: formData.get("senha") });
    if (!parsed.success) throw new AppError(primeiraMensagem(parsed.error));
    const user = await autenticar(db, parsed.data.email, parsed.data.senha);
    userId = user.id;
  });
  if (!result.ok) return result;
  await setSessionCookie(await criarSessao(db, userId!));
  redirect("/");
}

export async function sairAction() {
  const token = await getSessionToken();
  if (token) await destruirSessao(db, token);
  await clearSessionCookie();
  redirect("/entrar");
}

export async function esqueciSenhaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const r = await solicitarResetSenha(db, email);
    if (r) {
      const link = `${appUrl()}/redefinir-senha?token=${r.token}`;
      await sendEmail(r.user.email, emailResetSenha(link));
    }
    // sempre ok — não vaza se o e-mail existe
  });
}

export async function redefinirSenhaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const senha = senhaSchema.safeParse(formData.get("senha"));
    if (!senha.success) throw new AppError(primeiraMensagem(senha.error));
    await redefinirSenha(db, String(formData.get("token") ?? ""), senha.data);
  });
  if (!result.ok) return result;
  redirect("/entrar?redefinida=1");
}
