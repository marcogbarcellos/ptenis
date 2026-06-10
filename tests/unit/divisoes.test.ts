import { describe, expect, it } from "vitest";
import { sugerirDivisoes } from "@/lib/divisoes";

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
