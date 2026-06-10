"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { runAction, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/current-user";
import { perfilSchema, senhaSchema } from "@/lib/validation/schemas";
import { alterarSenha, atualizarPerfil } from "@/lib/services/usuarios";

export async function atualizarPerfilAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    const parsed = perfilSchema.safeParse({
      nome: formData.get("nome"),
      telefone: formData.get("telefone"),
      availability: formData.getAll("disponibilidade").map(String),
    });
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
    await atualizarPerfil(db, user.id, parsed.data);
  });
  revalidatePath("/", "layout");
  return r;
}

export async function alterarSenhaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    const nova = senhaSchema.safeParse(formData.get("nova"));
    if (!nova.success) throw new AppError(nova.error.issues[0].message);
    await alterarSenha(db, user.id, String(formData.get("atual") ?? ""), nova.data);
  });
}
