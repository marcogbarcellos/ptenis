import { describe, expect, it } from "vitest";
import { divisaoPorNivel, indiceDivisaoPorNivel, sugerirDivisoes } from "@/lib/divisoes";

const inscritos = (niveis: number[]) =>
  niveis.map((level, i) => ({ userId: `p${i}`, level }));

describe("sugerirDivisoes", () => {
  it("agrupa por nível em divisões equilibradas (24 → 3×8)", () => {
    const r = sugerirDivisoes(inscritos(Array.from({ length: 24 }, (_, i) => (i % 7) + 1)));
    expect(r).toHaveLength(3);
    expect(r.map((d) => d.userIds.length)).toEqual([8, 8, 8]);
    expect(r.map((d) => d.name)).toEqual(["Divisão A", "Divisão B", "Divisão C"]);
    // Divisão A tem os níveis mais altos
    const todos = inscritos(Array.from({ length: 24 }, (_, i) => (i % 7) + 1));
    const nivelDe = (id: string) => todos.find((x) => x.userId === id)!.level;
    const minA = Math.min(...r[0].userIds.map(nivelDe));
    const maxB = Math.max(...r[1].userIds.map(nivelDe));
    expect(minA).toBeGreaterThanOrEqual(maxB);
  });
  it("poucos inscritos → divisão única; tamanhos diferem no máx. 1", () => {
    expect(sugerirDivisoes(inscritos([3, 4, 5, 2, 1, 6, 7]))).toHaveLength(1);
    const r = sugerirDivisoes(inscritos(Array.from({ length: 30 }, () => 4)));
    const tamanhos = r.map((d) => d.userIds.length);
    expect(Math.max(...tamanhos) - Math.min(...tamanhos)).toBeLessThanOrEqual(1);
    expect(tamanhos.reduce((a, b) => a + b, 0)).toBe(30);
  });
});

describe("indiceDivisaoPorNivel", () => {
  it("com 7 grupos é 1:1 — N7→A(0) … N1→G(6)", () => {
    expect([7, 6, 5, 4, 3, 2, 1].map((n) => indiceDivisaoPorNivel(n, 7))).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it("1 grupo → sempre índice 0", () => {
    for (let n = 1; n <= 7; n++) expect(indiceDivisaoPorNivel(n, 1)).toBe(0);
  });
  it("distribui em 3 grupos: fortes em A, fracos em C", () => {
    expect(indiceDivisaoPorNivel(7, 3)).toBe(0);
    expect(indiceDivisaoPorNivel(4, 3)).toBe(1);
    expect(indiceDivisaoPorNivel(1, 3)).toBe(2);
  });
  it("trava níveis fora de 1-7 nos extremos", () => {
    expect(indiceDivisaoPorNivel(99, 4)).toBe(0); // tratado como N7
    expect(indiceDivisaoPorNivel(0, 4)).toBe(3); // tratado como N1
  });
});

describe("divisaoPorNivel", () => {
  const divs = [
    { id: "a", order: 0 },
    { id: "b", order: 1 },
    { id: "c", order: 2 },
  ];
  it("sem divisões → null", () => {
    expect(divisaoPorNivel(5, [])).toBeNull();
  });
  it("nível alto cai no grupo mais forte (order 0)", () => {
    expect(divisaoPorNivel(7, divs)).toBe("a");
    expect(divisaoPorNivel(4, divs)).toBe("b");
    expect(divisaoPorNivel(1, divs)).toBe("c");
  });
  it("respeita o campo order, não a ordem do array", () => {
    const embaralhado = [
      { id: "c", order: 2 },
      { id: "a", order: 0 },
      { id: "b", order: 1 },
    ];
    expect(divisaoPorNivel(7, embaralhado)).toBe("a");
    expect(divisaoPorNivel(1, embaralhado)).toBe("c");
  });
});
