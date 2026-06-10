export function gerarConfrontos(ids: string[]): [string, string][] {
  const jogadores = [...ids];
  if (jogadores.length < 2) return [];
  const BYE = "__bye__";
  if (jogadores.length % 2 === 1) jogadores.push(BYE);
  const n = jogadores.length;
  const confrontos: [string, string][] = [];
  for (let rodada = 0; rodada < n - 1; rodada++) {
    for (let i = 0; i < n / 2; i++) {
      const a = jogadores[i];
      const b = jogadores[n - 1 - i];
      if (a !== BYE && b !== BYE) confrontos.push([a, b]);
    }
    jogadores.splice(1, 0, jogadores.pop()!); // gira mantendo o primeiro fixo
  }
  return confrontos;
}
