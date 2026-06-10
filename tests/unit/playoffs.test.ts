import { describe, expect, it } from "vitest";
import { seedPlayoffs, vencedoresDasSemis } from "@/lib/playoffs";

const top = (...ids: string[]) => ids.map((userId) => ({ userId }));

describe("seedPlayoffs", () => {
  it("divisão com 6+ → semis 1×4 e 2×3", () => {
    const r = seedPlayoffs(top("p1", "p2", "p3", "p4", "p5", "p6"), 6);
    expect(r).toEqual({ tipo: "semis", semi1: ["p1", "p4"], semi2: ["p2", "p3"] });
  });
  it("divisão com menos de 6 → final direta top 2", () => {
    const r = seedPlayoffs(top("p1", "p2", "p3", "p4", "p5"), 5);
    expect(r).toEqual({ tipo: "final", final: ["p1", "p2"] });
  });
});

describe("vencedoresDasSemis", () => {
  it("retorna a dupla da final quando as duas semis resolveram", () => {
    expect(
      vencedoresDasSemis([
        { round: "semi1", status: "confirmado", winnerId: "p4" },
        { round: "semi2", status: "wo", winnerId: "p2" },
      ])
    ).toEqual(["p4", "p2"]);
  });
  it("null enquanto faltar semi", () => {
    expect(
      vencedoresDasSemis([{ round: "semi1", status: "confirmado", winnerId: "p1" }])
    ).toBeNull();
    expect(
      vencedoresDasSemis([
        { round: "semi1", status: "marcado", winnerId: null },
        { round: "semi2", status: "confirmado", winnerId: "p2" },
      ])
    ).toBeNull();
  });
});
