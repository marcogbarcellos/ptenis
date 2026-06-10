import { describe, expect, it } from "vitest";
import { validarPlacar } from "@/lib/placar-rules";

describe("validarPlacar", () => {
  it("melhor de 3 com match tiebreak", () => {
    expect(validarPlacar("bo3_mtb", [[6, 4], [3, 6], [10, 7]]).vencedor).toBe("A");
    expect(validarPlacar("bo3_mtb", [[4, 6], [6, 7]]).vencedor).toBe("B");
  });
  it("set único e pro-set", () => {
    expect(validarPlacar("set_unico", [[7, 5]]).vencedor).toBe("A");
    expect(validarPlacar("proset8", [[6, 8]]).vencedor).toBe("B");
  });
  it("rejeita placares impossíveis", () => {
    expect(() => validarPlacar("bo3_mtb", [])).toThrow();
    expect(() => validarPlacar("bo3_mtb", [[6, 6]])).toThrow(); // set empatado
    expect(() => validarPlacar("bo3_mtb", [[6, 4], [4, 6]])).toThrow(); // 1-1 sem 3º
    expect(() => validarPlacar("bo3_mtb", [[6, 4], [6, 4], [6, 4], [6, 4]])).toThrow();
    expect(() => validarPlacar("set_unico", [[6, 4], [6, 4]])).toThrow();
    expect(() => validarPlacar("set_unico", [[40, 2]])).toThrow(); // fora da faixa
    expect(() => validarPlacar("bo3_mtb", [[6, 4], [-1, 6], [10, 8]])).toThrow();
  });
});
