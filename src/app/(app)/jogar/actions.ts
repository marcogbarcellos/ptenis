"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { runAction, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/current-user";
import { criarAmistosoCombinado, criarConviteAberto } from "@/lib/services/convites";
import { getSettings } from "@/lib/settings";
import { fromZonedTime } from "date-fns-tz";

const baseSchema = z.object({
  quando: z.string().min(1, "Escolha data e hora."), // datetime-local: "2026-06-13T10:00"
  local: z.string().trim().max(80).optional(),
  observacao: z.string().trim().max(200).optional(),
  // Note: zod v4 .default() inside object makes the field optional-typed (string | undefined → string after default).
  // Object.fromEntries returns Record<string, FormDataEntryValue> which includes FormDataEntryValue (string | File).
  // Using z.string() here so zod coerces FormDataEntryValue correctly; .default() is safe.
  formato: z.enum(["bo3_mtb", "set_unico", "proset8"]).default("bo3_mtb"),
});

async function parseQuando(quando: string) {
  const { timezone } = await getSettings();
  const data = fromZonedTime(quando, timezone); // input local da comunidade → UTC
  if (isNaN(data.getTime())) throw new AppError("Data inválida.");
  return data;
}

export async function criarConviteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  let id: string | null = null;
  const r = await runAction(async () => {
    const parsed = baseSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
    const m = await criarConviteAberto(db, {
      criadorId: user.id,
      scheduledAt: await parseQuando(parsed.data.quando),
      location: parsed.data.local || null,
      note: parsed.data.observacao || null,
      format: parsed.data.formato,
    });
    id = m.id;
  });
  if (!r.ok) return r;
  revalidatePath("/", "layout");
  redirect(`/jogo/${id}`);
}

export async function criarCombinadoAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  let id: string | null = null;
  const r = await runAction(async () => {
    const parsed = baseSchema
      .extend({ parceiroId: z.string().min(1, "Escolha o parceiro.") })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
    const m = await criarAmistosoCombinado(db, {
      criadorId: user.id,
      parceiroId: parsed.data.parceiroId,
      scheduledAt: await parseQuando(parsed.data.quando),
      location: parsed.data.local || null,
      note: parsed.data.observacao || null,
      format: parsed.data.formato,
    });
    id = m.id;
  });
  if (!r.ok) return r;
  revalidatePath("/", "layout");
  redirect(`/jogo/${id}`);
}
