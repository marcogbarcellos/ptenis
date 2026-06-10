export type JogoClassificavel = {
  playerAId: string;
  playerBId: string | null;
  winnerId: string | null;
  score: unknown; // number[][] | null
  status: "confirmado" | "wo" | string;
};

export type Standing = {
  userId: string;
  posicao: number;
  pontos: number;
  jogos: number;
  vitorias: number;
  derrotas: number;
  saldoSets: number;
  saldoGames: number;
};

export function computeStandings(
  jogadores: { userId: string; ordemInscricao: number }[],
  jogos: JogoClassificavel[]
): Standing[] {
  const mapa = new Map<string, Standing & { ordem: number }>();
  for (const j of jogadores) {
    mapa.set(j.userId, {
      userId: j.userId, posicao: 0, pontos: 0, jogos: 0, vitorias: 0, derrotas: 0,
      saldoSets: 0, saldoGames: 0, ordem: j.ordemInscricao,
    });
  }

  const validos = jogos.filter(
    (m) => (m.status === "confirmado" || m.status === "wo") && m.playerBId && m.winnerId &&
      mapa.has(m.playerAId) && mapa.has(m.playerBId)
  );

  for (const m of validos) {
    const vencedor = mapa.get(m.winnerId!)!;
    const perdedor = mapa.get(m.winnerId === m.playerAId ? m.playerBId! : m.playerAId)!;
    vencedor.jogos++; perdedor.jogos++;
    vencedor.vitorias++; perdedor.derrotas++;
    vencedor.pontos += 2;
    if (m.status === "confirmado") {
      perdedor.pontos += 1; // derrota jogada vale 1
      const sets = (m.score as number[][]) ?? [];
      for (const [a, b] of sets) {
        const dirA = m.playerAId === vencedor.userId ? vencedor : perdedor;
        const dirB = dirA === vencedor ? perdedor : vencedor;
        dirA.saldoGames += a - b;
        dirB.saldoGames += b - a;
        if (a > b) { dirA.saldoSets += 1; dirB.saldoSets -= 1; }
        else { dirB.saldoSets += 1; dirA.saldoSets -= 1; }
      }
    }
  }

  const lista = [...mapa.values()];
  // 1) ordena por pontos, saldo sets, saldo games, ordem de inscrição
  lista.sort((x, y) =>
    y.pontos - x.pontos || y.saldoSets - x.saldoSets || y.saldoGames - x.saldoGames || x.ordem - y.ordem
  );
  // 2) confronto direto SÓ para grupos de exatamente 2 empatados em pontos
  for (let i = 0; i < lista.length - 1; i++) {
    const a = lista[i], b = lista[i + 1];
    if (a.pontos !== b.pontos) continue;
    const grupo = lista.filter((s) => s.pontos === a.pontos);
    if (grupo.length !== 2) continue;
    const direto = validos.find(
      (m) =>
        (m.playerAId === a.userId && m.playerBId === b.userId) ||
        (m.playerAId === b.userId && m.playerBId === a.userId)
    );
    if (direto?.winnerId === b.userId) {
      lista[i] = b; lista[i + 1] = a;
    }
    i++; // par já resolvido
  }
  return lista.map((s, i) => ({
    userId: s.userId,
    posicao: i + 1,
    pontos: s.pontos,
    jogos: s.jogos,
    vitorias: s.vitorias,
    derrotas: s.derrotas,
    saldoSets: s.saldoSets,
    saldoGames: s.saldoGames,
  }));
}
