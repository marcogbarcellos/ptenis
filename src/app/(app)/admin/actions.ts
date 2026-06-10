"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { runAction, type ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/auth/current-user";
import {
  abrirInscricoes, criarTemporada, encerrarTemporada, iniciarLiga, iniciarPlayoffs,
} from "@/lib/services/temporada";
import { adminDefinirPlacar, adminMarcarWO } from "@/lib/services/placar";

function revalidarTudo() {
  revalidatePath("/", "layout");
}

export async function criarTemporadaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  let id = "";
  const r = await runAction(async () => {
    const s = await criarTemporada(db, {
      nome: String(formData.get("nome") ?? ""),
      numGrupos: Number(formData.get("numGrupos") ?? 0),
      inscricoesAte: formData.get("inscricoesAte") ? new Date(String(formData.get("inscricoesAte"))) : null,
      gruposAte: formData.get("gruposAte") ? new Date(String(formData.get("gruposAte"))) : null,
      ligaAte: formData.get("ligaAte") ? new Date(String(formData.get("ligaAte"))) : null,
    });
    id = s.id;
  });
  if (!r.ok) return r;
  revalidarTudo();
  redirect(`/admin/temporadas/${id}`);
}

export async function abrirInscricoesAction(seasonId: string): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(() => abrirInscricoes(db, seasonId));
  revalidarTudo();
  return r;
}

export async function iniciarLigaAction(
  seasonId: string,
  divisoes: { name: string; userIds: string[] }[]
): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(() => iniciarLiga(db, seasonId, divisoes));
  revalidarTudo();
  return r;
}

export async function iniciarPlayoffsAction(seasonId: string): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(() => iniciarPlayoffs(db, seasonId));
  revalidarTudo();
  return r;
}

export async function encerrarTemporadaAction(seasonId: string): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(() => encerrarTemporada(db, seasonId));
  revalidarTudo();
  return r;
}

export async function adminDefinirPlacarAction(matchId: string, sets: number[][]): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(async () => {
    await adminDefinirPlacar(db, matchId, sets);
  });
  revalidarTudo();
  return r;
}

export async function adminWOAction(matchId: string, vencedorId: string): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(async () => {
    await adminMarcarWO(db, matchId, vencedorId);
  });
  revalidarTudo();
  return r;
}

export async function ajustarNivelAction(userId: string, nivel: number): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(async () => {
    if (nivel < 1 || nivel > 7) throw new AppError("Nível de 1 a 7.");
    await db.user.update({ where: { id: userId }, data: { level: nivel } });
  });
  revalidarTudo();
  return r;
}

export async function alternarAdminAction(userId: string): Promise<ActionState> {
  const eu = await requireAdmin();
  const r = await runAction(async () => {
    if (eu.id === userId) throw new AppError("Você não pode remover seu próprio admin.");
    const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
    await db.user.update({ where: { id: userId }, data: { isAdmin: !u.isAdmin } });
  });
  revalidarTudo();
  return r;
}

export async function alternarAtivoAction(userId: string): Promise<ActionState> {
  const eu = await requireAdmin();
  const r = await runAction(async () => {
    if (eu.id === userId) throw new AppError("Você não pode desativar a si mesmo.");
    const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
    await db.user.update({ where: { id: userId }, data: { isActive: !u.isActive } });
  });
  revalidarTudo();
  return r;
}

export async function salvarConfigAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const r = await runAction(async () => {
    const nome = String(formData.get("communityName") ?? "").trim();
    const codigo = String(formData.get("inviteCode") ?? "").trim();
    const timezone = String(formData.get("timezone") ?? "America/Sao_Paulo");
    if (!nome || !codigo) throw new AppError("Nome e código não podem ficar vazios.");
    await db.appSettings.update({
      where: { id: 1 },
      data: { communityName: nome, inviteCode: codigo, timezone },
    });
  });
  revalidarTudo();
  return r;
}
