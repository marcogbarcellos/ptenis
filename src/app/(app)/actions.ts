"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { runAction, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/current-user";
import { aceitarConvite } from "@/lib/services/convites";
import { cancelarJogo } from "@/lib/services/jogos";
import { confirmarPlacar, contestarPlacar, lancarPlacar } from "@/lib/services/placar";
import { aceitarProposta, proporData } from "@/lib/services/liga";
import { getSettings } from "@/lib/settings";
import { fromZonedTime } from "date-fns-tz";
import { AppError } from "@/lib/errors";

export async function aceitarConviteAction(matchId: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await aceitarConvite(db, matchId, user.id);
  });
  revalidatePath("/", "layout");
  return r;
}

export async function cancelarJogoAction(matchId: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await cancelarJogo(db, matchId, user.id);
  });
  revalidatePath("/", "layout");
  return r;
}

export async function lancarPlacarAction(matchId: string, sets: number[][]): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await lancarPlacar(db, matchId, user.id, sets);
  });
  revalidatePath("/", "layout");
  return r;
}

export async function confirmarPlacarAction(matchId: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await confirmarPlacar(db, matchId, user.id);
  });
  revalidatePath("/", "layout");
  return r;
}

export async function contestarPlacarAction(matchId: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await contestarPlacar(db, matchId, user.id);
  });
  revalidatePath("/", "layout");
  return r;
}

export async function proporDataAction(matchId: string, quando: string, local: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    const { timezone } = await getSettings();
    const data = fromZonedTime(quando, timezone);
    if (!quando || isNaN(data.getTime())) throw new AppError("Escolha data e hora.");
    await proporData(db, matchId, user.id, { scheduledAt: data, location: local.trim() || null });
  });
  revalidatePath("/", "layout");
  return r;
}

export async function aceitarPropostaAction(matchId: string): Promise<ActionState> {
  const user = await requireUser();
  const r = await runAction(async () => {
    await aceitarProposta(db, matchId, user.id);
  });
  revalidatePath("/", "layout");
  return r;
}
