"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { runAction, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/current-user";
import { cancelarInscricao, inscrever } from "@/lib/services/temporada";

export async function inscreverAction(seasonId: string, preferredDivisionId?: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await inscrever(db, seasonId, user.id, preferredDivisionId || null);
  });
  revalidatePath("/temporada");
  return r;
}

export async function cancelarInscricaoAction(seasonId: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await cancelarInscricao(db, seasonId, user.id);
  });
  revalidatePath("/temporada");
  return r;
}
