// Mapa nível (1-7) → índice de divisão entre `n` grupos. A (índice 0) = mais forte.
// Régua linear: N7 → A, N1 → último grupo; níveis intermediários distribuídos por igual.
export function indiceDivisaoPorNivel(nivel: number, n: number): number {
  if (n <= 1) return 0;
  const nv = Math.min(7, Math.max(1, nivel));
  const idx = Math.round(((7 - nv) / 6) * (n - 1));
  return Math.min(n - 1, Math.max(0, idx));
}

// Divisão provisória de um jogador pelo nível (placement no cadastro via link).
// Retorna null se a temporada ainda não tem divisões.
export function divisaoPorNivel(
  nivel: number,
  divisoes: { id: string; order: number }[]
): string | null {
  if (divisoes.length === 0) return null;
  const ordenadas = [...divisoes].sort((a, b) => a.order - b.order);
  return ordenadas[indiceDivisaoPorNivel(nivel, ordenadas.length)].id;
}

// Ordena por nível (desc) e corta em divisões contíguas de tamanhos quase iguais (~8 por divisão).
export function sugerirDivisoes(
  inscritos: { userId: string; level: number }[]
): { name: string; order: number; userIds: string[] }[] {
  const ordenados = [...inscritos].sort((a, b) => b.level - a.level);
  const n = ordenados.length;
  if (n === 0) return [];
  const qtd = Math.max(1, Math.round(n / 8));
  const base = Math.floor(n / qtd);
  const sobra = n % qtd;
  const divisoes: { name: string; order: number; userIds: string[] }[] = [];
  let cursor = 0;
  for (let i = 0; i < qtd; i++) {
    const tamanho = base + (i < sobra ? 1 : 0);
    divisoes.push({
      name: `Divisão ${String.fromCharCode(65 + i)}`,
      order: i,
      userIds: ordenados.slice(cursor, cursor + tamanho).map((x) => x.userId),
    });
    cursor += tamanho;
  }
  return divisoes;
}
