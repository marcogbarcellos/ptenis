export const QUESTIONARIO_NIVEL = [
  {
    id: "frequencia",
    pergunta: "Há quanto tempo você joga tênis?",
    opcoes: [
      "Estou começando agora",
      "Menos de 1 ano",
      "De 1 a 3 anos",
      "Mais de 3 anos",
    ],
  },
  {
    id: "troca",
    pergunta: "Como é sua troca de bolas?",
    opcoes: [
      "Ainda erro bastante",
      "Sustento trocas curtas em ritmo leve",
      "Sustento trocas em ritmo médio com direção",
      "Troco em ritmo forte, com efeito e profundidade",
    ],
  },
  {
    id: "saque",
    pergunta: "E o seu saque?",
    opcoes: [
      "Só coloco a bola em jogo",
      "Primeiro saque entra com alguma força",
      "Tenho 1º e 2º saque confiáveis",
      "Saque é uma arma (variação e potência)",
    ],
  },
  {
    id: "jogos",
    pergunta: "Experiência em jogos valendo?",
    opcoes: [
      "Nunca joguei valendo",
      "Já joguei alguns sets",
      "Jogo partidas com frequência",
      "Já disputei torneios/campeonatos",
    ],
  },
] as const;

// respostas: 4 valores de 1 a 4 → nível 1-7 (linear: soma 4→1, 16→7)
export function calcularNivel(respostas: number[]): number {
  const soma = respostas
    .map((r) => Math.min(4, Math.max(1, r)))
    .reduce((a, b) => a + b, 0);
  return Math.min(7, Math.max(1, Math.round(1 + (soma - 4) * 0.5)));
}

export function nivelLabel(nivel: number): string {
  if (nivel <= 2) return "Iniciante";
  if (nivel <= 4) return "Intermediário";
  return "Avançado";
}
