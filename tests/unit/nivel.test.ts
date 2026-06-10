import { describe, expect, it } from "vitest";
import { calcularNivel, nivelLabel, QUESTIONARIO_NIVEL } from "@/lib/nivel";

describe("questionário de nível", () => {
  it("tem 4 perguntas com 4 opções cada", () => {
    expect(QUESTIONARIO_NIVEL).toHaveLength(4);
    for (const p of QUESTIONARIO_NIVEL) expect(p.opcoes).toHaveLength(4);
  });
  it("mapeia extremos e meio", () => {
    expect(calcularNivel([1, 1, 1, 1])).toBe(1);
    expect(calcularNivel([4, 4, 4, 4])).toBe(7);
    expect(calcularNivel([2, 2, 3, 3])).toBe(4);
  });
  it("clampa entradas inválidas", () => {
    expect(calcularNivel([0, 0, 0, 0])).toBe(1);
    expect(calcularNivel([9, 9, 9, 9])).toBe(7);
  });
  it("rótulos", () => {
    expect(nivelLabel(1)).toBe("Iniciante");
    expect(nivelLabel(4)).toBe("Intermediário");
    expect(nivelLabel(7)).toBe("Avançado");
  });
});
