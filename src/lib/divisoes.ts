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
