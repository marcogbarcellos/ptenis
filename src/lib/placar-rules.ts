import { AppError } from "@/lib/errors";
import type { MatchFormat } from "@prisma/client";

export type Vencedor = "A" | "B";

export function validarPlacar(format: MatchFormat, sets: number[][]): { vencedor: Vencedor } {
  if (!Array.isArray(sets) || sets.length === 0)
    throw new AppError("Informe pelo menos um set.");
  for (const s of sets) {
    if (!Array.isArray(s) || s.length !== 2) throw new AppError("Placar inválido.");
    const [a, b] = s;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 30 || b > 30)
      throw new AppError("Games de 0 a 30 em cada set.");
    if (a === b) throw new AppError("Set não pode terminar empatado.");
  }
  const setsA = sets.filter(([a, b]) => a > b).length;
  const setsB = sets.length - setsA;

  if (format === "set_unico" || format === "proset8") {
    if (sets.length !== 1)
      throw new AppError("Esse formato tem um set só.");
  } else {
    // bo3_mtb
    if (sets.length < 2 || sets.length > 3)
      throw new AppError("Melhor de 3 tem 2 ou 3 sets.");
    if (Math.max(setsA, setsB) < 2)
      throw new AppError("Em melhor de 3, alguém precisa vencer 2 sets.");
  }
  return { vencedor: setsA > setsB ? "A" : "B" };
}
