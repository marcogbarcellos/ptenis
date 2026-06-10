import { AppError } from "@/lib/errors";

export type ActionState = { ok: boolean; error?: string };
export const idle: ActionState = { ok: false };

// Envolve a lógica de uma Server Action: AppError vira mensagem amigável.
export async function runAction(fn: () => Promise<void>): Promise<ActionState> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Algo deu errado. Tente de novo." };
  }
}
