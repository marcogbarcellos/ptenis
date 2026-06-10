import { describe, expect, it } from "vitest";
import { gerarConfrontos } from "@/lib/round-robin";

const chave = (a: string, b: string) => [a, b].sort().join("-");

describe("gerarConfrontos", () => {
  it("todos contra todos exatamente 1x (par e ímpar)", () => {
    for (const n of [2, 4, 5, 8, 9]) {
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      const confrontos = gerarConfrontos(ids);
      expect(confrontos).toHaveLength((n * (n - 1)) / 2);
      const unicos = new Set(confrontos.map(([a, b]) => chave(a, b)));
      expect(unicos.size).toBe(confrontos.length);
      for (const id of ids) {
        const jogos = confrontos.filter(([a, b]) => a === id || b === id);
        expect(jogos).toHaveLength(n - 1);
      }
    }
  });
  it("menos de 2 jogadores → vazio", () => {
    expect(gerarConfrontos([])).toEqual([]);
    expect(gerarConfrontos(["a"])).toEqual([]);
  });
});
