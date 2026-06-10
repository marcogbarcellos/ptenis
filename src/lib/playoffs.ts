export type Semeadura =
  | { tipo: "semis"; semi1: [string, string]; semi2: [string, string] }
  | { tipo: "final"; final: [string, string] };

// standings já ordenado (1º primeiro). Divisão <6 inscritos: top 2 direto à final.
export function seedPlayoffs(standings: { userId: string }[], tamanhoDivisao: number): Semeadura {
  const ids = standings.map((s) => s.userId);
  if (tamanhoDivisao < 6) return { tipo: "final", final: [ids[0], ids[1]] };
  return { tipo: "semis", semi1: [ids[0], ids[3]], semi2: [ids[1], ids[2]] };
}

export function vencedoresDasSemis(
  semis: { round: string | null; status: string; winnerId: string | null }[]
): [string, string] | null {
  const s1 = semis.find((s) => s.round === "semi1");
  const s2 = semis.find((s) => s.round === "semi2");
  const ok = (s?: { status: string; winnerId: string | null }) =>
    s && (s.status === "confirmado" || s.status === "wo") && s.winnerId;
  if (!ok(s1) || !ok(s2)) return null;
  return [s1!.winnerId!, s2!.winnerId!];
}
